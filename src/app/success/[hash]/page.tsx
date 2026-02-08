'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import type { WritingSession, WritingMetrics } from '@/lib/types';
import { formatDuration } from '@/lib/metrics';

const DownloadCertificate = dynamic(
  () => import('@/components/DownloadCertificate').then(mod => mod.DownloadCertificate),
  { ssr: false, loading: () => <div className="h-12 w-48 bg-deep-blue/10 rounded-lg animate-pulse" /> }
);

interface SessionData extends WritingSession {
  verificationHash: string;
  documentId: string;
  title: string;
}

export default function SuccessPage({ params }: { params: Promise<{ hash: string }> }) {
  const { hash } = use(params);
  const [session, setSession] = useState<SessionData | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem('lastSession');
    if (stored) {
      setSession(JSON.parse(stored));
    }
  }, []);

  const verifyUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/verify/${hash}`
    : `/verify/${hash}`;

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(verifyUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getScoreLabel = (score: number) => {
    if (score >= 90) return { label: 'Excellent', color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' };
    if (score >= 70) return { label: 'Good', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' };
    if (score >= 50) return { label: 'Moderate', color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-200' };
    return { label: 'Low', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' };
  };

  const writingTime = session ? (session.endedAt || Date.now()) - session.startedAt : 0;
  const scoreInfo = session ? getScoreLabel(session.integrityScore || 0) : { label: '', color: '', bg: '', border: '' };

  return (
    <div className="fixed inset-0 overflow-y-auto overflow-x-hidden bg-gradient-to-b from-cream to-white">
      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-1/4 w-64 h-64 bg-success/5 rounded-full blur-3xl" />
        <div className="absolute bottom-40 right-1/4 w-48 h-48 bg-accent/5 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative flex items-center justify-between px-6 md:px-8 py-6 border-b border-deep-blue/10 bg-white/50 backdrop-blur-sm">
        <Link href="/" className="flex items-center gap-3 hover:opacity-70 transition-opacity">
          <svg width="24" height="24" viewBox="0 0 32 32" fill="none" className="text-deep-blue">
            <path d="M8 28L16 4L24 28" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M10 20H22" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <span className="font-semibold text-deep-blue">By My Own Hand</span>
        </Link>
      </header>

      <main className="relative max-w-2xl mx-auto px-6 md:px-8 py-12 md:py-16">
        {/* Success header */}
        <div className="text-center mb-12">
          <div className="relative inline-block mb-6">
            <div className="w-24 h-24 bg-gradient-to-br from-success to-success/80 rounded-3xl flex items-center justify-center shadow-xl shadow-success/20">
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none" className="text-white">
                <path d="M14 24L21 31L34 17" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            {/* Celebration sparkles */}
            <div className="absolute -top-2 -right-2 text-2xl animate-bounce">✨</div>
            <div className="absolute -bottom-1 -left-2 text-xl animate-bounce delay-100">🎉</div>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-deep-blue mb-3">
            Document Certified!
          </h1>
          <p className="text-lg text-deep-blue/60">
            Your writing has been verified as authentically human.
          </p>
        </div>

        {/* Document info card */}
        <div className="bg-white rounded-3xl border border-deep-blue/10 shadow-xl shadow-deep-blue/5 overflow-hidden mb-8">
          <div className="px-6 md:px-8 py-6 border-b border-deep-blue/5 bg-gradient-to-r from-cream/50 to-transparent">
            <h2 className="text-xl md:text-2xl font-semibold text-deep-blue">
              {session?.title || 'Your Document'}
            </h2>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 md:p-8">
            <div className="text-center p-4 rounded-2xl bg-deep-blue/5">
              <div className="text-2xl md:text-3xl font-bold text-deep-blue mb-1">{session?.wordCount || 0}</div>
              <div className="text-sm text-deep-blue/50">Words</div>
            </div>
            <div className="text-center p-4 rounded-2xl bg-deep-blue/5">
              <div className="text-2xl md:text-3xl font-bold text-deep-blue mb-1">{formatDuration(writingTime)}</div>
              <div className="text-sm text-deep-blue/50">Time</div>
            </div>
            <div className={`text-center p-4 rounded-2xl ${scoreInfo.bg} border ${scoreInfo.border}`}>
              <div className={`text-2xl md:text-3xl font-bold ${scoreInfo.color} mb-1`}>{session?.integrityScore || 0}</div>
              <div className={`text-sm ${scoreInfo.color}/70`}>{scoreInfo.label}</div>
            </div>
            <div className="text-center p-4 rounded-2xl bg-deep-blue/5">
              <div className="text-2xl md:text-3xl font-bold text-deep-blue mb-1">{session?.metrics?.blockedPastes || 0}</div>
              <div className="text-sm text-deep-blue/50">Blocked</div>
            </div>
          </div>
        </div>

        {/* Verification link */}
        <div className="bg-gradient-to-br from-deep-blue to-deep-blue/90 rounded-3xl p-6 md:p-8 text-cream mb-8">
          <div className="flex items-center gap-3 mb-4">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M8 4H4V16H16V12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M10 10L17 3M17 3V8M17 3H12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <h3 className="font-semibold">Verification Link</h3>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch gap-3">
            <input
              type="text"
              readOnly
              value={verifyUrl}
              className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-sm font-mono text-cream/90 focus:outline-none focus:ring-2 focus:ring-white/30"
            />
            <button
              onClick={copyToClipboard}
              className="px-6 py-3 bg-cream text-deep-blue rounded-xl font-medium hover:bg-white transition-colors flex items-center justify-center gap-2"
            >
              {copied ? (
                <>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M4 8L7 11L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Copied!
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <rect x="5" y="5" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
                    <path d="M11 3H4C3.44772 3 3 3.44772 3 4V11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                  Copy
                </>
              )}
            </button>
          </div>
          <p className="text-sm text-cream/50 mt-4">
            Share this link to let anyone verify your document&apos;s authenticity.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-4">
          {session?.metrics && (
            <DownloadCertificate
              title={session.title}
              wordCount={session.wordCount}
              writingTimeMs={writingTime}
              verificationHash={hash}
              metrics={session.metrics}
              integrityScore={session.integrityScore || 0}
            />
          )}
          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              href={`/verify/${hash}`}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-deep-blue text-cream rounded-2xl font-medium hover:bg-deep-blue/90 transition-colors"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <circle cx="9" cy="9" r="7" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M6 9L8.5 11.5L12 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              View Verification Page
            </Link>
            <Link
              href="/write"
              className="flex-1 flex items-center justify-center gap-2 px-6 py-4 border-2 border-deep-blue/20 text-deep-blue rounded-2xl font-medium hover:bg-deep-blue/5 transition-colors"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M9 4V14M4 9H14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              Write Another
            </Link>
          </div>
        </div>

        {/* Metrics detail */}
        {session?.metrics && (
          <div className="mt-12">
            <h3 className="text-lg font-semibold text-deep-blue mb-4 flex items-center gap-2">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-deep-blue/50">
                <path d="M4 16V8M10 16V4M16 16V10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              Writing Analysis
            </h3>
            <div className="bg-white rounded-2xl border border-deep-blue/10 p-6">
              <MetricsDisplay metrics={session.metrics} />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function MetricsDisplay({ metrics }: { metrics: WritingMetrics }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-6 text-sm">
      <div>
        <span className="text-deep-blue/50 block mb-1">Avg Keystroke Interval</span>
        <p className="text-xl font-semibold text-deep-blue">{metrics.avgKeystrokeInterval}ms</p>
      </div>
      <div>
        <span className="text-deep-blue/50 block mb-1">Keystroke Variance</span>
        <p className="text-xl font-semibold text-deep-blue">{metrics.keystrokeVariance}</p>
      </div>
      <div>
        <span className="text-deep-blue/50 block mb-1">Thinking Pauses</span>
        <p className="text-xl font-semibold text-deep-blue">{metrics.pauseCount}</p>
      </div>
      <div>
        <span className="text-deep-blue/50 block mb-1">Deletion Rate</span>
        <p className="text-xl font-semibold text-deep-blue">{(metrics.deletionRate * 100).toFixed(1)}%</p>
      </div>
      <div>
        <span className="text-deep-blue/50 block mb-1">Longest Burst</span>
        <p className="text-xl font-semibold text-deep-blue">{metrics.longestBurst} chars</p>
      </div>
      <div>
        <span className="text-deep-blue/50 block mb-1">Blocked Pastes</span>
        <p className="text-xl font-semibold text-deep-blue">{metrics.blockedPastes}</p>
      </div>
    </div>
  );
}
