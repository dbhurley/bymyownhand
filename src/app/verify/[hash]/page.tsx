'use client';

import { useEffect, useState, use, useRef } from 'react';
import Link from 'next/link';
import type { WritingMetrics, KeystrokeEvent } from '@/lib/types';
import { calculateIntegrityScore, computeWpm, formatDuration, getScoreLabel, getSessionWritingTime } from '@/lib/metrics';
import { isValidVerificationHash } from '@/lib/hash';
import { buildVerifyUrl } from '@/lib/site';
import { buildEmbedSnippets } from '@/lib/embed';
import { buildLinkedInShareUrl, buildTweetUrl } from '@/lib/share';
import { writeClipboard } from '@/lib/clipboard';
import { WritingAnalysis } from '@/components/WritingAnalysis';

interface DocumentData {
  id: string;
  title: string;
  content: string;
  wordCount: number;
  writingTimeMs: number;
  verificationHash: string;
  status: string;
  createdAt: string;
  certifiedAt?: string;
  keystrokeData?: {
    events: KeystrokeEvent[];
    metrics: WritingMetrics;
  };
}

export default function VerifyPage({ params }: { params: Promise<{ hash: string }> }) {
  const { hash } = use(params);
  const [document, setDocument] = useState<DocumentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackText, setPlaybackText] = useState('');
  const [playbackProgress, setPlaybackProgress] = useState(0);
  const [copied, setCopied] = useState(false);
  const [embedCopied, setEmbedCopied] = useState(false);
  const [embedFormat, setEmbedFormat] = useState<'markdown' | 'html'>('markdown');
  const playbackRef = useRef<number | null>(null);

  useEffect(() => {
    // Mirror the server-side hash-format gate in GET /api/documents/[hash]:
    // reject obviously-invalid hashes (a crawler hitting /verify/<garbage>, a
    // truncated share link) before touching sessionStorage or spending an API
    // round-trip. A real `bmoh-xxxx-xxxx-xxxx` hash always passes, so the
    // writer's own just-certified fast-path is unaffected. Trust-boundary
    // parity with the server, applied at the client edge.
    if (!isValidVerificationHash(hash)) {
      setError('Document not found');
      setLoading(false);
      return;
    }

    const stored = sessionStorage.getItem('lastSession');
    if (stored) {
      try {
        const session = JSON.parse(stored);
        // Only take the sessionStorage fast-path when the payload is for this
        // hash *and* carries the fields the page reads. A corrupt or partial
        // `lastSession` (a quota-exceeded write, a tab killed mid-setItem, a
        // manually-edited value) used to slip through on a hash match alone,
        // then throw a RangeError at `new Date(session.startedAt).toISOString()`
        // for a non-finite `startedAt` — silently dropping the writer to the
        // API path, which on the no-DB MVP flow returns 404 for their own
        // freshly-certified document. Validate first; fall through to the API
        // on any mismatch. Same trust-boundary principle as the strict parse
        // on /success (§6.24) and the strict draft/history schema checks.
        if (
          session?.verificationHash === hash &&
          typeof session.content === 'string' &&
          typeof session.startedAt === 'number' &&
          Number.isFinite(session.startedAt)
        ) {
          setDocument({
            id: session.documentId,
            title: session.title,
            content: session.content,
            wordCount: session.wordCount,
            writingTimeMs: getSessionWritingTime(session),
            verificationHash: hash,
            status: 'certified',
            createdAt: new Date(session.startedAt).toISOString(),
            certifiedAt: new Date().toISOString(),
            keystrokeData: {
              events: session.events,
              metrics: session.metrics,
            },
          });
          setLoading(false);
          return;
        }
      } catch (e) {
        console.error('Error parsing session:', e);
      }
    }

    fetch(`/api/documents/${hash}`)
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          setError(data.error);
        } else {
          setDocument(data.document);
        }
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to load document');
        setLoading(false);
      });
  }, [hash]);

  const startPlayback = () => {
    if (!document?.keystrokeData?.events) return;

    setIsPlaying(true);
    setPlaybackText('');
    setPlaybackProgress(0);

    const content = document.content;
    const events = document.keystrokeData.events;
    // Include `paste_internal` events — intra-editor copy/paste is explicitly
    // allowed by the locked editor, and each one inserts `len` characters at
    // once. Counting only `key`/`delete` left the cursor short of the real
    // content length on any document that used internal paste, so playback
    // ended early and then snapped to the full text.
    const keyEvents = events.filter(
      e => e.type === 'key' || e.type === 'delete' || e.type === 'paste_internal'
    );
    let currentIndex = 0;
    // Drive playback positionally from the certified content so cased letters,
    // unicode, and punctuation render exactly as they were written. The
    // keystroke trace still controls timing and the typing-vs-deletion rhythm.
    let forwardCount = 0;

    const playNext = () => {
      if (currentIndex >= keyEvents.length) {
        setIsPlaying(false);
        setPlaybackText(content);
        setPlaybackProgress(100);
        return;
      }

      const event = keyEvents[currentIndex];

      if (event.type === 'delete') {
        forwardCount = Math.max(0, forwardCount - 1);
      } else if (event.type === 'paste_internal') {
        forwardCount = Math.min(content.length, forwardCount + (event.len ?? 1));
      } else {
        forwardCount = Math.min(content.length, forwardCount + 1);
      }

      setPlaybackText(content.slice(0, forwardCount));
      setPlaybackProgress(Math.round((currentIndex / keyEvents.length) * 100));

      currentIndex++;

      const nextEvent = keyEvents[currentIndex];
      const delay = nextEvent
        ? Math.min(nextEvent.t - event.t, 200)
        : 0;

      playbackRef.current = window.setTimeout(playNext, Math.max(delay / 3, 10));
    };

    playNext();
  };

  const stopPlayback = () => {
    if (playbackRef.current) {
      clearTimeout(playbackRef.current);
    }
    setIsPlaying(false);
    setPlaybackText(document?.content || '');
    setPlaybackProgress(100);
  };

  useEffect(() => {
    return () => {
      if (playbackRef.current) {
        clearTimeout(playbackRef.current);
      }
    };
  }, []);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-cream flex items-center justify-center">
        <div className="flex items-center gap-3 text-deep-blue/40">
          <div className="w-4 h-4 border-2 border-deep-blue/15 border-t-deep-blue/50 rounded-full animate-spin" />
          <span className="text-sm">Loading verification...</span>
        </div>
      </div>
    );
  }

  if (error || !document) {
    return (
      <div className="fixed inset-0 overflow-y-auto overflow-x-hidden bg-cream">
        <header className="flex items-center px-6 md:px-8 py-6 border-b border-deep-blue/[0.06]">
          <Link href="/" className="flex items-center gap-2.5">
            <img src="/logo.svg" alt="By My Own Hand" width="24" height="21" className="block" />
            <span className="font-semibold text-deep-blue">By My Own Hand</span>
          </Link>
        </header>
        <main className="max-w-2xl mx-auto px-6 md:px-8 py-16 text-center">
          <div className="w-14 h-14 rounded-full bg-deep-blue/5 flex items-center justify-center mx-auto mb-6">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-deep-blue/30">
              <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-deep-blue mb-2 tracking-tight">Document Not Found</h1>
          <p className="text-deep-blue/50 mb-8">
            This verification link is invalid or the document has been removed.
          </p>
          <Link
            href="/"
            className="inline-flex px-6 py-3 bg-deep-blue text-cream rounded-full font-medium text-sm hover:bg-deep-blue/90 transition-colors"
          >
            Go Home
          </Link>
        </main>
      </div>
    );
  }

  const metrics = document.keystrokeData?.metrics;
  // Whether this document carries a replayable keystroke trace. A trace-less
  // document (a legacy record, or one whose `keystroke_data` is null) has no
  // events to play and no evidence behind the "How we verified this" claims —
  // so the playback panel's Play button is a dead control and the explainer's
  // "Press Play to watch it written" / "reconstructed from the trace" lines
  // describe evidence that isn't here. The §6.10/§6.14 honesty series already
  // fixed the stat cells ("— / No trace") for this case; this gates the two
  // remaining trace-dependent surfaces on the same condition.
  const traceEvents = document.keystrokeData?.events;
  const hasTrace = Array.isArray(traceEvents) && traceEvents.length > 0;
  // Only compute a score when we actually have a keystroke trace to score
  // against. Falling back to a fabricated number (we used to default to 75)
  // makes legacy or trace-less documents look confidently certified when
  // they carry no evidence at all.
  const integrityScore = metrics
    ? calculateIntegrityScore(metrics, document.wordCount, document.writingTimeMs)
    : null;
  const scoreInfo = integrityScore !== null ? getScoreLabel(integrityScore) : null;
  const wpm = Math.round(computeWpm(document.wordCount, document.writingTimeMs));

  const verifyUrl = buildVerifyUrl(hash);
  const tweetText = `"${document.title}" was written by hand — every keystroke proven human. ${verifyUrl}`;
  const tweetUrl = buildTweetUrl(tweetText);
  const linkedInUrl = buildLinkedInShareUrl(verifyUrl);
  const embeds = buildEmbedSnippets(verifyUrl);
  const embedSnippet = embedFormat === 'markdown' ? embeds.markdown : embeds.html;

  const copyVerifyUrl = async () => {
    if (!(await writeClipboard(verifyUrl))) return;
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyEmbed = async () => {
    if (!(await writeClipboard(embedSnippet))) return;
    setEmbedCopied(true);
    setTimeout(() => setEmbedCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 overflow-y-auto overflow-x-hidden bg-cream">
      {/* Header */}
      <header className="flex items-center justify-between px-6 md:px-8 py-6 border-b border-deep-blue/[0.06]">
        <Link href="/" className="flex items-center gap-2.5">
          <img src="/logo.svg" alt="By My Own Hand" width="24" height="21" className="block" />
          <span className="font-semibold text-deep-blue">By My Own Hand</span>
        </Link>
        <div className="flex items-center gap-2 text-success">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M4 8L7 11L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="text-sm font-medium">Verified</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 md:px-8 py-12">
        {/* Document header */}
        <div className="flex items-start gap-4 mb-10">
          <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center flex-shrink-0 mt-0.5">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-success">
              <path d="M6 10L9 13L14 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-deep-blue tracking-tight">{document.title}</h1>
            <p className="text-deep-blue/45 mt-1">Certified as authentically human-written</p>
          </div>
        </div>

        {/* Stats */}
        <div className="bg-white rounded-2xl border border-deep-blue/[0.06] overflow-hidden mb-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-deep-blue/[0.04]">
            <div className="bg-white text-center p-5">
              <div className="text-2xl font-bold text-deep-blue mb-0.5">{document.wordCount}</div>
              <div className="text-xs text-deep-blue/35 uppercase tracking-wider">Words</div>
            </div>
            <div className="bg-white text-center p-5">
              <div className="text-2xl font-bold text-deep-blue mb-0.5">{formatDuration(document.writingTimeMs)}</div>
              <div className="text-xs text-deep-blue/35 uppercase tracking-wider">Duration</div>
            </div>
            <div className="bg-white text-center p-5">
              {integrityScore !== null && scoreInfo ? (
                <>
                  <div className={`text-2xl font-bold ${scoreInfo.color} mb-0.5`}>{integrityScore}</div>
                  <div className="text-xs text-deep-blue/35 uppercase tracking-wider">{scoreInfo.label}</div>
                </>
              ) : (
                <>
                  <div className="text-2xl font-bold text-deep-blue/30 mb-0.5">—</div>
                  <div className="text-xs text-deep-blue/35 uppercase tracking-wider">No trace</div>
                </>
              )}
            </div>
            <div className="bg-white text-center p-5">
              {metrics ? (
                <>
                  <div className="text-2xl font-bold text-deep-blue mb-0.5">{metrics.blockedPastes}</div>
                  <div className="text-xs text-deep-blue/35 uppercase tracking-wider">Pastes Blocked</div>
                </>
              ) : (
                <>
                  <div className="text-2xl font-bold text-deep-blue/30 mb-0.5">—</div>
                  <div className="text-xs text-deep-blue/35 uppercase tracking-wider">No trace</div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Writing playback — only when a replayable trace exists. For a
            trace-less document the Play button does nothing (startPlayback
            returns early on no events), so rendering the panel presents a dead
            control. */}
        {hasTrace && (
        <div className="bg-white rounded-2xl border border-deep-blue/[0.06] overflow-hidden mb-8">
          <div className="flex items-center justify-between px-5 py-3 border-b border-deep-blue/[0.04]">
            <span className="text-xs font-semibold text-deep-blue/35 uppercase tracking-wider">Writing Playback</span>
            <div className="flex items-center gap-3">
              {playbackProgress > 0 && playbackProgress < 100 && (
                <span className="text-xs text-deep-blue/35 tabular-nums font-mono">{playbackProgress}%</span>
              )}
              <button
                onClick={isPlaying ? stopPlayback : startPlayback}
                className="px-4 py-1.5 bg-deep-blue text-cream text-xs font-medium rounded-full hover:bg-deep-blue/90 transition-colors"
              >
                {isPlaying ? 'Stop' : 'Play'}
              </button>
            </div>
          </div>
          <div className="p-6 min-h-[200px] max-h-[400px] overflow-y-auto text-[0.95rem] leading-relaxed whitespace-pre-wrap text-deep-blue/80">
            {isPlaying ? (
              <>
                {playbackText}
                <span className="inline-block w-0.5 h-4 bg-deep-blue animate-blink ml-0.5" />
              </>
            ) : (
              document.content
            )}
          </div>
        </div>
        )}

        {/* How we verified this — a calm explainer for first-time visitors who
            arrived via a shared link or an embed badge and may not know what a
            keystroke trace actually proves. Phase 1.5 item: educating the cold
            visitor is the first step in converting an embed touch into a writer
            of their own (the embed flywheel the "Write your own proof" CTA
            below closes). A native <details> adds no JS and is keyboard- and
            screen-reader-accessible by default. Gated on `hasTrace`: the panel
            references "shown above" and "Press Play" and asserts the timing was
            "reconstructed from the trace," so it must not render for a
            trace-less document where neither the playback nor that evidence
            exists. */}
        {hasTrace && (
        <details className="group bg-white rounded-2xl border border-deep-blue/[0.06] mb-8 overflow-hidden">
          <summary className="flex items-center justify-between px-5 md:px-6 py-4 cursor-pointer list-none select-none">
            <span className="text-sm font-semibold text-deep-blue">How we verified this</span>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-deep-blue/40 transition-transform group-open:rotate-180" aria-hidden="true">
              <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </summary>
          <div className="px-5 md:px-6 pb-6 pt-1 space-y-4 text-sm text-deep-blue/55 leading-relaxed border-t border-deep-blue/[0.04]">
            <p>
              This piece was composed in a locked editor that recorded every keystroke with millisecond timing — we certify the act of writing, not the finished text alone.
            </p>
            <ul className="space-y-2.5">
              <li className="flex gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-deep-blue/20 flex-shrink-0 mt-[0.5rem]" />
                <span><span className="font-medium text-deep-blue/70">Every keystroke is timed.</span> The rhythm, thinking pauses, and corrections shown above are reconstructed from the trace, not estimated.</span>
              </li>
              <li className="flex gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-deep-blue/20 flex-shrink-0 mt-[0.5rem]" />
                <span><span className="font-medium text-deep-blue/70">External paste is blocked.</span> Text pasted from outside the editor is rejected and counted — the words had to originate here.</span>
              </li>
              <li className="flex gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-deep-blue/20 flex-shrink-0 mt-[0.5rem]" />
                <span><span className="font-medium text-deep-blue/70">Press Play to watch it written.</span> The playback replays the document character by character at the pace it was actually composed.</span>
              </li>
            </ul>
            <p className="text-deep-blue/45">
              We capture timing only — never your screen, webcam, or biometrics.
            </p>
          </div>
        </details>
        )}

        {/* Detailed metrics */}
        {metrics && (
          <div className="mb-8">
            <WritingAnalysis metrics={metrics} wpm={wpm} />
          </div>
        )}

        {/* Share + embed */}
        <div className="bg-white rounded-2xl border border-deep-blue/[0.06] p-6 md:p-8 mb-8">
          <p className="text-xs font-semibold text-deep-blue/30 uppercase tracking-[0.2em] mb-4">
            Share this proof
          </p>
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <button
              onClick={copyVerifyUrl}
              className="flex-1 flex items-center justify-center gap-2 px-5 py-3 border border-deep-blue/15 text-deep-blue rounded-full font-medium text-sm hover:bg-deep-blue/5 transition-colors"
            >
              {copied ? (
                <>
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                    <path d="M4 8L7 11L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Link copied
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                    <rect x="5" y="5" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M11 3H4C3.44772 3 3 3.44772 3 4V11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                  Copy link
                </>
              )}
            </button>
            <a
              href={tweetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 px-5 py-3 border border-deep-blue/15 text-deep-blue rounded-full font-medium text-sm hover:bg-deep-blue/5 transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                <path d="M12.6 1.5h2.3L9.7 7.4l5.9 7.1h-4.6L7.5 9.7l-4 4.8H1.2L7 7.7 1.2 1.5h4.7L9 5.7l3.6-4.2zM11.8 13.2h1.3L4.7 2.7H3.3l8.5 10.5z" />
              </svg>
              Post on X
            </a>
            <a
              href={linkedInUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 px-5 py-3 border border-deep-blue/15 text-deep-blue rounded-full font-medium text-sm hover:bg-deep-blue/5 transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                <path d="M3.5 1.6a1.4 1.4 0 100 2.8 1.4 1.4 0 000-2.8zM2.2 5.4h2.6V14H2.2V5.4zM6.4 5.4h2.5v1.2h.04c.35-.66 1.21-1.36 2.49-1.36 2.66 0 3.15 1.75 3.15 4.03V14h-2.6V9.78c0-1.01-.02-2.31-1.41-2.31-1.41 0-1.62 1.1-1.62 2.24V14H6.4V5.4z" />
              </svg>
              LinkedIn
            </a>
          </div>

          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-deep-blue/30 uppercase tracking-[0.2em]">
              Embed badge
            </p>
            <div className="flex items-center gap-1 p-0.5 bg-deep-blue/[0.04] rounded-full" role="tablist" aria-label="Embed format">
              <button
                role="tab"
                aria-selected={embedFormat === 'markdown'}
                onClick={() => setEmbedFormat('markdown')}
                className={`px-3 py-1 rounded-full text-[11px] font-medium transition-colors ${
                  embedFormat === 'markdown' ? 'bg-deep-blue text-cream' : 'text-deep-blue/50 hover:text-deep-blue'
                }`}
              >
                Markdown
              </button>
              <button
                role="tab"
                aria-selected={embedFormat === 'html'}
                onClick={() => setEmbedFormat('html')}
                className={`px-3 py-1 rounded-full text-[11px] font-medium transition-colors ${
                  embedFormat === 'html' ? 'bg-deep-blue text-cream' : 'text-deep-blue/50 hover:text-deep-blue'
                }`}
              >
                HTML
              </button>
            </div>
          </div>
          <div className="flex items-stretch gap-3">
            <code className="flex-1 px-3 py-2.5 bg-deep-blue/[0.04] rounded-lg text-xs font-mono text-deep-blue/70 overflow-x-auto whitespace-nowrap">
              {embedSnippet}
            </code>
            <button
              onClick={copyEmbed}
              className="px-4 py-2.5 bg-deep-blue text-cream rounded-lg font-medium text-xs hover:bg-deep-blue/90 transition-colors flex items-center gap-2"
            >
              {embedCopied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <p className="text-xs text-deep-blue/35 mt-3">
            {embedFormat === 'markdown'
              ? 'Markdown works in Substack, Ghost, Notion, and READMEs.'
              : 'HTML works on WordPress, raw-HTML blocks, and email signatures.'}
          </p>
        </div>

        {/* Verification hash */}
        <div className="pt-8 border-t border-deep-blue/[0.06] text-center">
          <span className="text-xs text-deep-blue/30 uppercase tracking-wider">Verification Hash</span>
          <p className="font-mono text-sm text-deep-blue/60 mt-1 break-all">{hash}</p>
        </div>

        {/* Visitor CTA — every /verify pageload is a cold embed touch (a reader
            arriving from a Substack post, a WordPress blog, an email signature
            badge). Closing the embed flywheel means converting some fraction of
            those visitors into writers themselves, but the page previously had
            no path forward for a verifier — only a verification hash, then the
            footer. A calm "Try it yourself" line completes the loop the
            Phase 1.3 embed badge initiates: badge in the wild → cold visit to
            /verify → writer's-own certified piece → another badge in the wild.
            Sticks alongside the future Phase 1.5 "How we verified this"
            explainer rather than replacing it. */}
        <div className="mt-12 text-center">
          <p className="text-deep-blue/50 text-sm mb-4">
            Want proof your own writing is human?
          </p>
          <Link
            href="/write"
            className="inline-flex items-center gap-2 px-6 py-3 bg-deep-blue text-cream rounded-full font-medium text-sm hover:bg-deep-blue/90 transition-colors"
          >
            Write your own proof
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M3 8H13M13 8L9 4M13 8L9 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        </div>
      </main>
    </div>
  );
}

