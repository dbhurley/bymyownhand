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
    if (score >= 90) return { label: 'Excellent', color: 'text-green-600' };
    if (score >= 70) return { label: 'Good', color: 'text-blue-600' };
    if (score >= 50) return { label: 'Moderate', color: 'text-yellow-600' };
    return { label: 'Low', color: 'text-red-600' };
  };

  const writingTime = session ? (session.endedAt || Date.now()) - session.startedAt : 0;
  const scoreInfo = session ? getScoreLabel(session.integrityScore || 0) : { label: '', color: '' };

  return (
    <div className="min-h-screen bg-cream">
      {/* Header */}
      <header className="flex items-center justify-between px-8 py-6 border-b border-deep-blue/10">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-xl">✍️</span>
          <span className="font-semibold text-deep-blue">By My Own Hand</span>
        </Link>
      </header>

      <main className="max-w-2xl mx-auto px-8 py-16">
        {/* Success header */}
        <div className="text-center mb-12">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center text-4xl mx-auto mb-6">
            ✓
          </div>
          <h1 className="text-3xl font-bold text-deep-blue mb-2">
            Document Certified!
          </h1>
          <p className="text-deep-blue/60">
            Your writing has been verified and certified as authentically human.
          </p>
        </div>

        {/* Document info */}
        <div className="bg-white rounded-xl border border-deep-blue/10 p-6 mb-8">
          <h2 className="text-xl font-semibold text-deep-blue mb-4">
            {session?.title || 'Your Document'}
          </h2>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-deep-blue/50">Words</span>
              <p className="text-lg font-medium text-deep-blue">{session?.wordCount || 0}</p>
            </div>
            <div>
              <span className="text-deep-blue/50">Writing Time</span>
              <p className="text-lg font-medium text-deep-blue">{formatDuration(writingTime)}</p>
            </div>
            <div>
              <span className="text-deep-blue/50">Authenticity Score</span>
              <p className={`text-lg font-medium ${scoreInfo.color}`}>
                {session?.integrityScore || 0}/100 ({scoreInfo.label})
              </p>
            </div>
            <div>
              <span className="text-deep-blue/50">Pastes Blocked</span>
              <p className="text-lg font-medium text-deep-blue">
                {session?.metrics?.blockedPastes || 0}
              </p>
            </div>
          </div>
        </div>

        {/* Verification link */}
        <div className="bg-deep-blue/5 rounded-xl p-6 mb-8">
          <h3 className="text-sm font-medium text-deep-blue mb-3">Verification Link</h3>
          <div className="flex items-center gap-3">
            <input
              type="text"
              readOnly
              value={verifyUrl}
              className="flex-1 px-4 py-3 bg-white border border-deep-blue/10 rounded-lg text-sm text-deep-blue font-mono"
            />
            <button
              onClick={copyToClipboard}
              className="px-4 py-3 bg-deep-blue text-cream rounded-lg font-medium hover:bg-deep-blue/90 transition-colors"
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <p className="text-sm text-deep-blue/50 mt-3">
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
              className="flex-1 px-6 py-3 bg-deep-blue text-cream text-center rounded-lg font-medium hover:bg-deep-blue/90 transition-colors"
            >
              View Verification Page
            </Link>
            <Link
              href="/write"
              className="flex-1 px-6 py-3 border border-deep-blue/20 text-deep-blue text-center rounded-lg font-medium hover:bg-deep-blue/5 transition-colors"
            >
              Write Another
            </Link>
          </div>
        </div>

        {/* Metrics detail */}
        {session?.metrics && (
          <div className="mt-12">
            <h3 className="text-lg font-semibold text-deep-blue mb-4">Writing Analysis</h3>
            <div className="bg-white rounded-xl border border-deep-blue/10 p-6">
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
        <span className="text-deep-blue/50">Avg Keystroke Interval</span>
        <p className="text-lg font-medium text-deep-blue">{metrics.avgKeystrokeInterval}ms</p>
      </div>
      <div>
        <span className="text-deep-blue/50">Keystroke Variance</span>
        <p className="text-lg font-medium text-deep-blue">{metrics.keystrokeVariance}</p>
      </div>
      <div>
        <span className="text-deep-blue/50">Thinking Pauses</span>
        <p className="text-lg font-medium text-deep-blue">{metrics.pauseCount}</p>
      </div>
      <div>
        <span className="text-deep-blue/50">Deletion Rate</span>
        <p className="text-lg font-medium text-deep-blue">{(metrics.deletionRate * 100).toFixed(1)}%</p>
      </div>
      <div>
        <span className="text-deep-blue/50">Longest Burst</span>
        <p className="text-lg font-medium text-deep-blue">{metrics.longestBurst} chars</p>
      </div>
      <div>
        <span className="text-deep-blue/50">Blocked Pastes</span>
        <p className="text-lg font-medium text-deep-blue">{metrics.blockedPastes}</p>
      </div>
    </div>
  );
}
