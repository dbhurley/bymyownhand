'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import type { WritingSession } from '@/lib/types';
import { formatDuration, getScoreLabel } from '@/lib/metrics';
import { getSiteUrl } from '@/lib/site';

const DownloadCertificate = dynamic(
  () => import('@/components/DownloadCertificate').then(mod => mod.DownloadCertificate),
  { ssr: false, loading: () => <div className="h-12 w-48 bg-deep-blue/5 rounded-full animate-pulse" /> }
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
  const [embedCopied, setEmbedCopied] = useState(false);
  const [embedFormat, setEmbedFormat] = useState<'markdown' | 'html'>('markdown');

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

  const shareTitle = session?.title || 'My document';
  const tweetText = `I wrote "${shareTitle}" by my own hand — every keystroke proven human. ${verifyUrl}`;
  const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;
  const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(verifyUrl)}`;
  const embedMarkdown = `[![Verified human-written](${getSiteUrl()}/logo.svg)](${verifyUrl})`;
  const embedHtml = `<a href="${verifyUrl}" target="_blank" rel="noopener"><img src="${getSiteUrl()}/logo.svg" alt="Verified human-written" width="120" height="auto" /></a>`;
  const embedSnippet = embedFormat === 'markdown' ? embedMarkdown : embedHtml;

  const writingTime = session ? (session.endedAt || Date.now()) - session.startedAt : 0;
  const scoreInfo = session ? getScoreLabel(session.integrityScore || 0) : { label: '', color: '' };

  return (
    <div className="fixed inset-0 overflow-y-auto overflow-x-hidden bg-cream">
      {/* Header */}
      <header className="flex items-center justify-between px-6 md:px-8 py-6 border-b border-deep-blue/[0.06]">
        <Link href="/" className="flex items-center gap-3 hover:opacity-70 transition-opacity">
          <img src="/logo.svg" alt="By My Own Hand" width="24" height="21" className="block" />
          <span className="font-semibold text-deep-blue">By My Own Hand</span>
        </Link>
      </header>

      <main className="max-w-2xl mx-auto px-6 md:px-8 py-12 md:py-16">
        {/* Success header */}
        <div className="text-center mb-12">
          <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-6">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" className="text-success">
              <path d="M10 16L14 20L22 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-deep-blue mb-3 tracking-tight">
            Document Certified
          </h1>
          <p className="text-deep-blue/50">
            Your writing has been verified as authentically human.
          </p>
        </div>

        {/* Document info */}
        <div className="bg-white rounded-2xl border border-deep-blue/[0.06] overflow-hidden mb-8">
          <div className="px-6 md:px-8 py-5 border-b border-deep-blue/[0.04]">
            <h2 className="text-xl font-semibold text-deep-blue">
              {session?.title || 'Your Document'}
            </h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-deep-blue/[0.04]">
            <div className="bg-white text-center p-5">
              <div className="text-2xl font-bold text-deep-blue mb-0.5">{session?.wordCount || 0}</div>
              <div className="text-xs text-deep-blue/35 uppercase tracking-wider">Words</div>
            </div>
            <div className="bg-white text-center p-5">
              <div className="text-2xl font-bold text-deep-blue mb-0.5">{formatDuration(writingTime)}</div>
              <div className="text-xs text-deep-blue/35 uppercase tracking-wider">Duration</div>
            </div>
            <div className="bg-white text-center p-5">
              <div className={`text-2xl font-bold ${scoreInfo.color} mb-0.5`}>{session?.integrityScore || 0}</div>
              <div className="text-xs text-deep-blue/35 uppercase tracking-wider">{scoreInfo.label}</div>
            </div>
            <div className="bg-white text-center p-5">
              <div className="text-2xl font-bold text-deep-blue mb-0.5">{session?.metrics?.blockedPastes || 0}</div>
              <div className="text-xs text-deep-blue/35 uppercase tracking-wider">Blocked</div>
            </div>
          </div>
        </div>

        {/* Verification link */}
        <div className="bg-deep-blue rounded-2xl p-6 md:p-8 text-cream mb-8">
          <h3 className="font-semibold mb-4">Verification Link</h3>
          <div className="flex flex-col sm:flex-row items-stretch gap-3">
            <input
              type="text"
              readOnly
              value={verifyUrl}
              className="flex-1 px-4 py-3 bg-white/10 border border-white/10 rounded-xl text-sm font-mono text-cream/80 focus:outline-none"
            />
            <button
              onClick={copyToClipboard}
              className="px-6 py-3 bg-cream text-deep-blue rounded-xl font-medium text-sm hover:bg-white transition-colors flex items-center justify-center gap-2"
            >
              {copied ? (
                <>
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                    <path d="M4 8L7 11L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Copied
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                    <rect x="5" y="5" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M11 3H4C3.44772 3 3 3.44772 3 4V11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                  Copy
                </>
              )}
            </button>
          </div>
          <p className="text-sm text-cream/40 mt-3">
            Share this link to let anyone verify your document&apos;s authenticity.
          </p>
        </div>

        {/* Share + embed */}
        <div className="bg-white rounded-2xl border border-deep-blue/[0.06] p-6 md:p-8 mb-8">
          <p className="text-xs font-semibold text-deep-blue/30 uppercase tracking-[0.2em] mb-4">
            Share your proof
          </p>
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
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
              Share on LinkedIn
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
              onClick={async () => {
                await navigator.clipboard.writeText(embedSnippet);
                setEmbedCopied(true);
                setTimeout(() => setEmbedCopied(false), 2000);
              }}
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
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href={`/verify/${hash}`}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 bg-deep-blue text-cream rounded-full font-medium text-sm hover:bg-deep-blue/90 transition-colors"
            >
              View Verification
            </Link>
            <Link
              href="/write"
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 border border-deep-blue/15 text-deep-blue rounded-full font-medium text-sm hover:bg-deep-blue/5 transition-colors"
            >
              Write Another
            </Link>
          </div>
        </div>

        {/* Writing analysis */}
        {session?.metrics && (
          <div className="mt-14">
            <p className="text-xs font-semibold text-deep-blue/30 uppercase tracking-[0.2em] mb-6">Writing Analysis</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              <Metric label="Avg Keystroke" value={`${session.metrics.avgKeystrokeInterval}ms`} />
              <Metric label="Variance" value={String(session.metrics.keystrokeVariance)} />
              <Metric label="Thinking Pauses" value={String(session.metrics.pauseCount)} />
              <Metric label="Deletion Rate" value={`${(session.metrics.deletionRate * 100).toFixed(1)}%`} />
              <Metric label="Longest Burst" value={`${session.metrics.longestBurst} chars`} />
              <Metric label="Avg Word Length" value={`${session.metrics.averageWordLength} chars`} />
              <Metric label="Blocked Pastes" value={String(session.metrics.blockedPastes)} />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-xs text-deep-blue/35 uppercase tracking-wider block mb-1">{label}</span>
      <p className="text-xl font-semibold text-deep-blue">{value}</p>
    </div>
  );
}
