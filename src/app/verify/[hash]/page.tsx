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
    // First check sessionStorage for recently submitted document
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

    // Fetch from API
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
      .catch(err => {
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
        // Simulate the key press
        if (event.key === 'Enter') {
          currentText += '\n';
        } else if (event.key === 'Space') {
          currentText += ' ';
        } else if (event.key.startsWith('Key')) {
          currentText += event.key.charAt(3).toLowerCase();
        } else if (event.key.startsWith('Digit')) {
          currentText += event.key.charAt(5);
        } else {
          // Handle punctuation and other keys
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
      
      // Calculate delay to next keystroke (capped for playback speed)
      const nextEvent = keyEvents[currentIndex];
      const delay = nextEvent 
        ? Math.min(nextEvent.t - event.t, 200) // Cap at 200ms for watchable playback
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
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="text-deep-blue/50">Loading verification...</div>
      </div>
    );
  }

  if (error || !document) {
    return (
      <div className="min-h-screen bg-cream">
        <header className="flex items-center justify-between px-8 py-6 border-b border-deep-blue/10">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl">✍️</span>
            <span className="font-semibold text-deep-blue">By My Own Hand</span>
          </Link>
        </header>
        <main className="max-w-2xl mx-auto px-8 py-16 text-center">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center text-4xl mx-auto mb-6">
            ✕
          </div>
          <h1 className="text-2xl font-bold text-deep-blue mb-2">Document Not Found</h1>
          <p className="text-deep-blue/60 mb-8">
            This verification link is invalid or the document has been removed.
          </p>
          <Link
            href="/"
            className="inline-flex px-6 py-3 bg-deep-blue text-cream rounded-lg font-medium hover:bg-deep-blue/90 transition-colors"
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
    <div className="min-h-screen bg-cream">
      {/* Header */}
      <header className="flex items-center justify-between px-8 py-6 border-b border-deep-blue/10">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-xl">✍️</span>
          <span className="font-semibold text-deep-blue">By My Own Hand</span>
        </Link>
        <span className="px-3 py-1 bg-green-100 text-green-700 text-sm font-medium rounded-full">
          ✓ Verified
        </span>
      </header>

      <main className="max-w-3xl mx-auto px-8 py-12">
        {/* Verified badge */}
        <div className="flex items-center gap-4 mb-8">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
            <span className="text-3xl">✓</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-deep-blue">{document.title}</h1>
            <p className="text-deep-blue/60">
              Certified as authentically human-written
            </p>
          </div>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-4 gap-4 mb-8 p-4 bg-white rounded-xl border border-deep-blue/10">
          <div className="text-center">
            <div className="text-2xl font-bold text-deep-blue">{document.wordCount}</div>
            <div className="text-sm text-deep-blue/50">Words</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-deep-blue">{formatDuration(document.writingTimeMs)}</div>
            <div className="text-sm text-deep-blue/50">Duration</div>
          </div>
          <div className="text-center">
            <div className={`text-2xl font-bold ${scoreInfo.color}`}>{integrityScore}</div>
            <div className="text-sm text-deep-blue/50">Authenticity</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-deep-blue">{metrics?.blockedPastes || 0}</div>
            <div className="text-sm text-deep-blue/50">Pastes Blocked</div>
          </div>
        </div>

        {/* Writing playback */}
        <div className="bg-white rounded-xl border border-deep-blue/10 overflow-hidden mb-8">
          <div className="flex items-center justify-between px-4 py-3 border-b border-deep-blue/10 bg-deep-blue/5">
            <span className="text-sm font-medium text-deep-blue">Writing Playback</span>
            <div className="flex items-center gap-3">
              {playbackProgress > 0 && playbackProgress < 100 && (
                <span className="text-sm text-deep-blue/50">{playbackProgress}%</span>
              )}
              <button
                onClick={isPlaying ? stopPlayback : startPlayback}
                className="px-4 py-1.5 bg-deep-blue text-cream text-sm font-medium rounded-lg hover:bg-deep-blue/90 transition-colors"
              >
                {isPlaying ? 'Stop' : 'Play'}
              </button>
            </div>
          </div>
          <div className="p-6 min-h-[200px] max-h-[400px] overflow-y-auto font-mono text-sm whitespace-pre-wrap">
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
          <div className="bg-white rounded-xl border border-deep-blue/10 p-6">
            <h3 className="text-lg font-semibold text-deep-blue mb-4">Writing Analysis</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              <MetricItem label="Avg Keystroke" value={`${metrics.avgKeystrokeInterval}ms`} />
              <MetricItem label="Variance" value={metrics.keystrokeVariance.toFixed(2)} />
              <MetricItem label="Thinking Pauses" value={metrics.pauseCount} />
              <MetricItem label="Deletion Rate" value={`${(metrics.deletionRate * 100).toFixed(1)}%`} />
              <MetricItem label="Longest Burst" value={`${metrics.longestBurst} chars`} />
              <MetricItem 
                label="WPM" 
                value={Math.round((document.wordCount / document.writingTimeMs) * 60000)} 
              />
            </div>
          </div>
        )}

        {/* Verification hash */}
        <div className="mt-8 p-4 bg-deep-blue/5 rounded-lg text-center">
          <span className="text-xs text-deep-blue/50 uppercase tracking-wider">Verification Hash</span>
          <p className="font-mono text-deep-blue">{hash}</p>
        </div>
      </main>
    </div>
  );
}

function MetricItem({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <span className="text-sm text-deep-blue/50">{label}</span>
      <p className="text-lg font-medium text-deep-blue">{value}</p>
    </div>
  );
}

function getScoreLabel(score: number) {
  if (score >= 90) return { label: 'Excellent', color: 'text-green-600' };
  if (score >= 70) return { label: 'Good', color: 'text-blue-600' };
  if (score >= 50) return { label: 'Moderate', color: 'text-yellow-600' };
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
