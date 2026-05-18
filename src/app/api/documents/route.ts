import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { generateVerificationHash } from '@/lib/hash';
import { createDocument } from '@/lib/db';
import { getSiteUrl } from '@/lib/site';
import { countWords } from '@/lib/metrics';
import type { WritingSession } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, session } = body as { title: string; session: WritingSession };

    if (!title || !session || !session.content) {
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
    const normalizedTitle = title.trim().slice(0, 200) || 'Untitled Document';

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

    const docId = nanoid();
    const verificationHash = generateVerificationHash();
    // Sanitize the writing window server-side. A direct API caller could send
    // a future startedAt, a NaN endedAt, or an inverted pair — which would
    // persist a negative or non-finite writing_time_ms and tarnish every
    // downstream surface that reads it (WPM, /verify Duration cell, the
    // certificate PDF). Trust-boundary fix paralleling the prior server-side
    // wordCount (§6.15) and title (§6.19) sanitization.
    const startedAt = Number(session.startedAt);
    const endedAt = Number(session.endedAt) || Date.now();
    const rawWindow = endedAt - startedAt;
    const writingTimeMs = Number.isFinite(rawWindow) && rawWindow > 0 ? rawWindow : 0;

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
        metrics: session.metrics,
      },
    };

    // Try to save to database if configured
    if (process.env.DATABASE_URL) {
      try {
        await createDocument(document);
      } catch (dbError) {
        console.error('Database error:', dbError);
        // Continue without database for MVP
      }
    }

    // Return an absolute verifyUrl so external API consumers (Phase 2.1) can
    // share the proof link as-is without needing to know the host. The web
    // client (which already lives on the same origin) handles either form.
    return NextResponse.json({
      success: true,
      documentId: docId,
      verificationHash,
      verifyUrl: `${getSiteUrl()}/verify/${verificationHash}`,
    });
  } catch (error) {
    console.error('Error creating document:', error);
    return NextResponse.json(
      { error: 'Failed to create document' },
      { status: 500 }
    );
  }
}
