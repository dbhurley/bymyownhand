import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { generateVerificationHash } from '@/lib/hash';
import { createDocument } from '@/lib/db';
import { getCanonicalVerifyUrl } from '@/lib/site';
import { countWords, calculateMetrics, getSessionWritingTime, isValidKeystrokeEvent } from '@/lib/metrics';
import { MAX_DOCUMENT_TITLE_LENGTH, type WritingSession } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    // JSON parsing is part of the request trust boundary too. An empty body or
    // malformed JSON used to throw into the outer catch and return 500, making
    // a caller mistake its own invalid payload for a service outage. Keep the
    // route's unexpected-error catch for actual server failures and classify a
    // syntactically invalid request as the 400 it is.
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Request body must be valid JSON' },
        { status: 400 }
      );
    }

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json(
        { error: 'Request body must be a JSON object' },
        { status: 400 }
      );
    }

    const { title, session: rawSession } = body as Record<string, unknown>;

    // Check the *types* of the two string fields, not just their truthiness.
    // The previous `!title || !session || !session.content` gate admitted any
    // truthy value, so a malformed payload (`title: 123`, `content: { … }`, an
    // array) sailed past it and then threw a TypeError deeper in the handler —
    // `title.trim()` on a number, `content.trim()` inside `countWords()` — which
    // the outer catch turned into a `500 Failed to create document`. A caller
    // sending the wrong type got a server-error status for what is squarely a
    // client error, and every such request logged as if the service had broken.
    // Actionable 4xx responses matter more once the documented Phase 2.1 public
    // API exposes this contract to partners who aren't our own web client.
    // Same trust-boundary shape as the server-side wordCount / title /
    // writingTimeMs / trace-size gates below — the server is canonical for what
    // it admits.
    if (typeof title !== 'string' || !title) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (!rawSession || typeof rawSession !== 'object' || Array.isArray(rawSession)) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const session = rawSession as WritingSession;
    if (typeof session.content !== 'string' || !session.content) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Sanitize the title server-side. The web client falls back to
    // 'Untitled Document' on empty input, but the truthy check above accepts
    // a whitespace-only string (`"   "`), which would then persist as an
    // empty title across the verify page, the certificate PDF, the OG/Twitter
    // share preview, and any downstream profile/leaderboard surface. Trim
    // here, fall back to the same placeholder the client uses, and cap to a
    // reasonable length so a maliciously long title can't blow up the
    // record. Trust-boundary fix paralleling the server-computed `wordCount`
    // in §6.15 — the server is the canonical source for what it admits.
    const normalizedTitle = title.trim().slice(0, MAX_DOCUMENT_TITLE_LENGTH) || 'Untitled Document';

    // Cap the raw content length, completing the trust-boundary series that
    // already bounds the title (200 chars) and the keystroke trace (250k
    // events) below. `session.content` was the one unbounded field: a direct
    // API caller could POST a multi-megabyte string into the `content TEXT`
    // column and onto every surface that renders it (the verify page, the
    // certificate PDF). 1,000,000 chars is ~25× the longest plausible essay
    // (a 5,000-word piece at ~6 chars/word + spaces is ~35k chars), so it
    // never trips a real writer. Same trust-boundary shape as the prior
    // server-side wordCount (§6.15), title (§6.19), and trace-size (§6.21) gates.
    //
    // This O(1) length check runs *before* the word-count gate below on
    // purpose: `countWords()` trims and regex-splits the whole string and
    // allocates an array of every token, so running it first on a rejected
    // multi-megabyte payload spends real CPU and memory on a request we're
    // about to 413. Reject on size first, then do the split-based work on
    // input we've already bounded.
    const MAX_CONTENT_LENGTH = 1_000_000;
    if (session.content.length > MAX_CONTENT_LENGTH) {
      return NextResponse.json(
        { error: `Document content exceeds maximum allowed size (${MAX_CONTENT_LENGTH} characters)` },
        { status: 413 }
      );
    }

    // Validate the keystroke trace *before* the word-count gate. Both trace
    // checks below are O(1) (an array-type test and a `.length` comparison),
    // whereas `countWords()` trims and regex-splits the whole content string and
    // allocates an array of every token — the same O(1)-before-O(n) ordering
    // rationale that already moved the content-length cap above `countWords`.
    // A direct API caller sending valid-length prose but a missing or oversized
    // trace is now rejected without paying the split-based word count first.
    if (!Array.isArray(session.events) || session.events.length === 0) {
      return NextResponse.json(
        { error: 'Keystroke trace is required for certification' },
        { status: 400 }
      );
    }

    // Cap the keystroke trace at a generous-but-bounded size. A real human
    // session — even a 5,000-word essay typed character-by-character — runs
    // ~30k events; 250k is ~8× the longest plausible writing window. Without a
    // cap, a direct API caller could POST a multi-million-event trace, balloon
    // the `keystroke_data` JSONB column (Neon's row-size limits are generous
    // but not infinite), and tank /verify/<hash> playback for that hash on every
    // pageload. Trust-boundary fix paralleling the prior server-side wordCount
    // (§6.15), title (§6.19), and writingTimeMs (§6.20) sanitization — the
    // server is the canonical source for what it admits.
    const MAX_TRACE_EVENTS = 250_000;
    if (session.events.length > MAX_TRACE_EVENTS) {
      return NextResponse.json(
        { error: `Keystroke trace exceeds maximum allowed size (${MAX_TRACE_EVENTS} events)` },
        { status: 413 }
      );
    }

    // Validate the *shape* of each event, not just the array's type and size.
    // The two checks above admitted any array under the cap, so a trace of
    // `[null]` threw a TypeError inside `calculateMetrics()` and surfaced as a
    // `500 Failed to create document` (a server-error status for a client
    // error, indistinguishable in the logs from the service actually breaking),
    // and a trace of `[{ t: 'abc', type: 'key' }, …]` was accepted outright —
    // persisting NaN-derived metrics into `keystroke_data` and rendering "NaN"
    // in the writing-analysis panel on the public `/verify/<hash>` proof page.
    // Both verified against the running build before this gate.
    //
    // Runs after the O(1) size cap so a rejected multi-million-event payload is
    // never walked, and before `countWords()` for the same O(1)-before-O(n)
    // ordering rationale as the gates above. The scan is O(events) on input
    // already bounded to 250k, which is the same order `calculateMetrics()`
    // spends on it a few lines later. Trust-boundary sibling of the server-side
    // wordCount / title / writingTimeMs / trace-size gates — the server is
    // canonical for what it admits, and this contract is what Phase 2.1 exposes
    // to partners who aren't our own web client.
    if (!session.events.every(isValidKeystrokeEvent)) {
      return NextResponse.json(
        { error: 'Keystroke trace contains a malformed event' },
        { status: 400 }
      );
    }

    // Mirror the editor's 10-word submission gate so the API can't be used
    // to mint certificates around documents that never met the threshold.
    // Recompute the count server-side rather than trusting the client-supplied
    // `session.wordCount` — a direct API caller could otherwise certify a
    // 12-word doc while claiming 10,000 words in the persisted record.
    const serverWordCount = countWords(session.content);
    if (serverWordCount < 10) {
      return NextResponse.json(
        { error: 'Document must contain at least 10 words to be certified' },
        { status: 400 }
      );
    }

    const docId = nanoid();
    const verificationHash = generateVerificationHash();
    // Sanitize the writing window server-side. A direct API caller could send
    // a future startedAt, a NaN endedAt, or an inverted pair — which would
    // persist a negative or non-finite writing_time_ms and tarnish every
    // downstream surface that reads it (WPM, /verify Duration cell, the
    // certificate PDF). Trust-boundary fix paralleling the prior server-side
    // wordCount (§6.15) and title (§6.19) sanitization.
    //
    // Derive it through the shared `getSessionWritingTime()` helper rather than
    // re-implementing the `(endedAt || now) - startedAt` clamp inline — the same
    // helper `/success` and `/verify` already use, so the certified window here
    // and the rendered window there can't drift. The helper is also strictly
    // more defensive than the previous inline math: it rejects a non-positive
    // `startedAt` (a caller sending `startedAt: 0` or a negative epoch, which the
    // inline `endedAt - 0` would have persisted as a ~54,000-year window) by
    // returning 0. Drift-prevention sibling of the prior `computeWpm` /
    // `getScoreLabel` / `countWords` consolidations, on the write boundary.
    const writingTimeMs = getSessionWritingTime(session);

    // For MVP without database, store in memory or return hash directly.
    // In production, this saves to Neon. Note: integrity score isn't a
    // separate column — it's derived from the keystroke trace at read time
    // by /verify/<hash>, so the trace is the canonical record.
    const document = {
      id: docId,
      title: normalizedTitle,
      content: session.content,
      wordCount: serverWordCount,
      writingTimeMs,
      verificationHash,
      keystrokeData: {
        events: session.events,
        // Recompute the metrics summary server-side from the trace rather than
        // persisting the client-supplied `session.metrics` blob. The trace is
        // the canonical record — the verify page derives the score from it at
        // read time, and a Phase 2.1 API consumer reading `keystroke_data`
        // should get a summary that agrees with the events by construction. A
        // direct API caller could otherwise POST an honest-looking trace next
        // to a hand-crafted `metrics` object. Same trust-boundary shape as the
        // server-recomputed `wordCount` (§6.15): the server is canonical for
        // what it stores. Identical to the client value for any document minted
        // through the editor, which computes it with this same function.
        metrics: calculateMetrics(session.events, session.content),
      },
    };

    // A configured database is the durable certification boundary. Swallowing
    // an INSERT failure and returning success minted a hash that worked only in
    // the writer's sessionStorage; every person they shared it with then got a
    // 404. Preserve the no-database MVP path, but when production persistence
    // is configured, report an unavailable service and let the editor retain
    // its autosaved draft for a safe retry. Match the read route's retryable
    // 503/no-store contract so a transient outage is never confused with a
    // missing proof or cached past recovery.
    if (process.env.DATABASE_URL) {
      try {
        await createDocument(document);
      } catch (dbError) {
        console.error('Database error:', dbError);
        return NextResponse.json(
          { error: 'Certification is temporarily unavailable', retryable: true },
          { status: 503, headers: { 'Cache-Control': 'no-store' } }
        );
      }
    }

    // Return an absolute verifyUrl so external API consumers (Phase 2.1) can
    // share the proof link as-is without needing to know the host. The web
    // client (which already lives on the same origin) handles either form.
    return NextResponse.json({
      success: true,
      documentId: docId,
      verificationHash,
      verifyUrl: getCanonicalVerifyUrl(verificationHash),
    });
  } catch (error) {
    console.error('Error creating document:', error);
    return NextResponse.json(
      { error: 'Failed to create document' },
      { status: 500 }
    );
  }
}
