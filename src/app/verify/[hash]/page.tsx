'use client';

import { useEffect, useState, use, useRef } from 'react';
import Link from 'next/link';
import type { Document, WritingMetrics, KeystrokeEvent } from '@/lib/types';
import { formatDuration } from '@/lib/metrics';

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

    const events = document.keystrokeData.events;
    const keyEvents = events.filter(e => e.type === 'key' || e.type === 'delete');
    let currentIndex = 0;
    let currentText = '';

    const playNext = () => {
      if (currentIndex >= keyEvents.length) {
        setIsPlaying(false);
        setPlaybackText(document.content);
        setPlaybackProgress(100);
        return;
      }

      const event = keyEvents[currentIndex];

      if (event.type === 'delete') {
        currentText = currentText.slice(0, -1);
      } else if (event.key) {
        if (event.key === 'Enter') {
          currentText += '\n';
        } else if (event.key === 'Space') {
          currentText += ' ';
        } else if (event.key.startsWith('Key')) {
          currentText += event.key.charAt(3).toLowerCase();
        } else if (event.key.startsWith('Digit')) {
          currentText += event.key.charAt(5);
        } else {
          const keyMap: Record<string, string> = {
            'Period': '.', 'Comma': ',', 'Semicolon': ';',
            'Quote': "'", 'BracketLeft': '[', 'BracketRight': ']',
          };
          currentText += keyMap[event.key] || '';
        }
      }

      setPlaybackText(currentText);
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
  const integrityScore = metrics ? calculateIntegrityFromMetrics(metrics, document.wordCount, document.writingTimeMs) : 75;
  const scoreInfo = getScoreLabel(integrityScore);

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
              <div className={`text-2xl font-bold ${scoreInfo.color} mb-0.5`}>{integrityScore}</div>
              <div className="text-xs text-deep-blue/35 uppercase tracking-wider">{scoreInfo.label}</div>
            </div>
            <div className="bg-white text-center p-5">
              <div className="text-2xl font-bold text-deep-blue mb-0.5">{metrics?.blockedPastes || 0}</div>
              <div className="text-xs text-deep-blue/35 uppercase tracking-wider">Pastes Blocked</div>
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
              <MetricItem
                label="WPM"
                value={String(Math.round((document.wordCount / document.writingTimeMs) * 60000))}
              />
            </div>
          </div>
        )}

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

function getScoreLabel(score: number) {
  if (score >= 90) return { label: 'Excellent', color: 'text-success' };
  if (score >= 70) return { label: 'Good', color: 'text-accent' };
  if (score >= 50) return { label: 'Moderate', color: 'text-warning' };
  return { label: 'Low', color: 'text-red-600' };
}

function calculateIntegrityFromMetrics(metrics: WritingMetrics, wordCount: number, writingTimeMs: number): number {
  let score = 100;

  if (metrics.blockedPastes > 0) {
    score -= Math.min(30, metrics.blockedPastes * 10);
  }

  const wpm = (wordCount / writingTimeMs) * 60000;
  if (wpm > 150) score -= 20;
  else if (wpm > 200) score -= 40;

  if (metrics.keystrokeVariance < 0.1) score -= 15;
  if (metrics.pauseCount === 0 && wordCount > 100) score -= 10;
  if (metrics.deletionRate === 0 && wordCount > 50) score -= 5;
  else if (metrics.deletionRate > 0.3) score -= 10;

  return Math.max(0, Math.min(100, score));
}
