'use client';

import { useEffect, useState, use, useRef } from 'react';
import Link from 'next/link';
import type { WritingMetrics, KeystrokeEvent } from '@/lib/types';
import { calculateIntegrityScore, formatDuration, getScoreLabel } from '@/lib/metrics';
import { getSiteUrl } from '@/lib/site';
import { buildEmbedSnippets } from '@/lib/embed';

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
    const stored = sessionStorage.getItem('lastSession');
    if (stored) {
      try {
        const session = JSON.parse(stored);
        if (session.verificationHash === hash) {
          setDocument({
            id: session.documentId,
            title: session.title,
            content: session.content,
            wordCount: session.wordCount,
            writingTimeMs: (session.endedAt || Date.now()) - session.startedAt,
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
    const keyEvents = events.filter(e => e.type === 'key' || e.type === 'delete');
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
  // Only compute a score when we actually have a keystroke trace to score
  // against. Falling back to a fabricated number (we used to default to 75)
  // makes legacy or trace-less documents look confidently certified when
  // they carry no evidence at all.
  const integrityScore = metrics
    ? calculateIntegrityScore(metrics, document.wordCount, document.writingTimeMs)
    : null;
  const scoreInfo = integrityScore !== null ? getScoreLabel(integrityScore) : null;
  const wpm = document.writingTimeMs > 0
    ? Math.round((document.wordCount / document.writingTimeMs) * 60000)
    : 0;

  const verifyUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/verify/${hash}`
    : `${getSiteUrl()}/verify/${hash}`;
  const tweetText = `"${document.title}" was written by hand — every keystroke proven human. ${verifyUrl}`;
  const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;
  const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(verifyUrl)}`;
  const embeds = buildEmbedSnippets(verifyUrl);
  const embedSnippet = embedFormat === 'markdown' ? embeds.markdown : embeds.html;

  const copyVerifyUrl = async () => {
    await navigator.clipboard.writeText(verifyUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyEmbed = async () => {
    await navigator.clipboard.writeText(embedSnippet);
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

        {/* Writing playback */}
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

        {/* Detailed metrics */}
        {metrics && (
          <div className="mb-8">
            <p className="text-xs font-semibold text-deep-blue/30 uppercase tracking-[0.2em] mb-6">Writing Analysis</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              <MetricItem label="Avg Keystroke" value={`${metrics.avgKeystrokeInterval}ms`} />
              <MetricItem label="Variance" value={metrics.keystrokeVariance.toFixed(2)} />
              <MetricItem label="Thinking Pauses" value={String(metrics.pauseCount)} />
              <MetricItem label="Deletion Rate" value={`${(metrics.deletionRate * 100).toFixed(1)}%`} />
              <MetricItem label="Longest Burst" value={`${metrics.longestBurst} chars`} />
              <MetricItem label="Avg Word Length" value={`${metrics.averageWordLength} chars`} />
              <MetricItem label="WPM" value={String(wpm)} />
            </div>
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
      </main>
    </div>
  );
}

function MetricItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-xs text-deep-blue/35 uppercase tracking-wider block mb-1">{label}</span>
      <p className="text-xl font-semibold text-deep-blue">{value}</p>
    </div>
  );
}


