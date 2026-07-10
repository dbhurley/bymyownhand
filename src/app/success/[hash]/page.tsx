'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import type { WritingSession } from '@/lib/types';
import { computeWpm, formatDuration, getScoreLabel, getSessionWritingTime } from '@/lib/metrics';
import { buildEmbedSnippets } from '@/lib/embed';
import { recordCertification, type StreakSummary } from '@/lib/history';
import { buildVerifyUrl } from '@/lib/site';
import { buildLinkedInShareUrl, buildTweetUrl } from '@/lib/share';
import { writeClipboard } from '@/lib/clipboard';
import { WritingAnalysis } from '@/components/WritingAnalysis';
import { XIcon, LinkedInIcon } from '@/components/ShareIcons';

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
  const router = useRouter();
  const [session, setSession] = useState<SessionData | null>(null);
  const [copied, setCopied] = useState(false);
  const [embedCopied, setEmbedCopied] = useState(false);
  const [embedFormat, setEmbedFormat] = useState<'markdown' | 'html'>('markdown');
  const [streakSummary, setStreakSummary] = useState<StreakSummary | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem('lastSession');
    // Cold visits to /success/<hash> (a bookmark, a refresh after sessionStorage
    // expired) used to render a placeholder card showing "0 words / 0s / 0 Low"
    // for the user's own document — confusing, and incorrectly suggests a fresh
    // certification was just made. Hand off to /verify/<hash> instead, which
    // can fetch from the DB or fail clearly when neither source has the doc.
    if (!stored) {
      router.replace(`/verify/${hash}`);
      return;
    }
    // Treat the sessionStorage payload as untrusted: a corrupted or partially-
    // written value would otherwise throw an uncaught JSON.parse error inside
    // this effect, leaving the writer staring at a blank screen with no path
    // forward. Same trust-boundary principle as the strict draft-schema check
    // in `lib/draft.ts` and the strict numeric filter in `lib/history.ts` —
    // fall back to `/verify/<hash>` rather than half-restore a broken record.
    let parsed: SessionData | null = null;
    try {
      parsed = JSON.parse(stored) as SessionData;
    } catch {
      router.replace(`/verify/${hash}`);
      return;
    }
    if (!parsed || parsed.verificationHash !== hash) {
      router.replace(`/verify/${hash}`);
      return;
    }
    setSession(parsed);
    // Record this certification once (idempotent on hash) and surface the
    // resulting streak/total so the writer sees their habit forming.
    //
    // Key the streak on the actual moment of certification (`Date.now()`), not
    // on `session.endedAt`. The streak counts the calendar days a writer
    // certified something; `endedAt` is the end of the *active writing window*,
    // which for a resumed draft is `originalStartedAt + activeDuration` — and
    // since the resume flow deliberately preserves the original wall-clock
    // start across a gap of up to 24h, a draft begun yesterday but certified
    // today would otherwise record yesterday's `dayKey()` and attribute today's
    // certification to the wrong day (breaking the streak or under-counting it).
    const summary = recordCertification({
      hash: parsed.verificationHash,
      certifiedAt: Date.now(),
      wordCount: parsed.wordCount || 0,
      integrityScore: parsed.integrityScore || 0,
    });
    setStreakSummary(summary);
  }, [hash, router]);

  const verifyUrl = buildVerifyUrl(hash);

  const copyToClipboard = async () => {
    if (!(await writeClipboard(verifyUrl))) return;
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareTitle = session?.title || 'My document';
  const tweetText = `I wrote "${shareTitle}" by my own hand — every keystroke proven human.`;
  const tweetUrl = buildTweetUrl(tweetText, verifyUrl);
  const linkedInUrl = buildLinkedInShareUrl(verifyUrl);
  const embeds = buildEmbedSnippets(verifyUrl);
  const embedSnippet = embedFormat === 'markdown' ? embeds.markdown : embeds.html;

  const writingTime = session ? getSessionWritingTime(session) : 0;
  // Fall back to a real text-color class, not an empty string, for the brief
  // render before a cold/no-session load is redirected to /verify (§6.14).
  // An empty `color` produced `className="text-2xl font-bold  mb-0.5"` — a
  // dangling double-space with no color, so the placeholder score flashed in
  // default black instead of the muted tone every other empty-state uses.
  const scoreInfo = session ? getScoreLabel(session.integrityScore || 0) : { label: '', color: 'text-deep-blue/30' };
  const wpm = session ? Math.round(computeWpm(session.wordCount, writingTime)) : 0;

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
          {streakSummary && streakSummary.total > 0 && (
            <div className="mt-6 inline-flex items-center gap-3 px-4 py-2 bg-white border border-deep-blue/[0.08] rounded-full text-sm">
              <span className="text-deep-blue/70">
                <span className="font-semibold text-deep-blue">{streakSummary.total}</span> certified piece{streakSummary.total === 1 ? '' : 's'}
              </span>
              {streakSummary.streak > 1 && (
                <>
                  <span className="w-1 h-1 rounded-full bg-deep-blue/20" />
                  <span className="text-deep-blue/70">
                    <span className="font-semibold text-deep-blue">{streakSummary.streak}</span>-day streak
                  </span>
                  {/* Recognize a personal best — when the active streak equals
                      the longest run ever, the writer is at (or extending) their
                      record. A calm "best yet" note reinforces the Phase 1.4
                      habit loop by celebrating the milestone, not just the count. */}
                  {streakSummary.streak === streakSummary.best && (
                    <span className="text-[11px] font-medium text-success uppercase tracking-wider">
                      Best yet
                    </span>
                  )}
                </>
              )}
            </div>
          )}
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
              aria-label="Verification link"
              // Select the whole link on focus/click so the field is a working
              // manual-copy fallback. `copyToClipboard()` silently no-ops when
              // `writeClipboard()` fails (insecure context, denied permission —
              // the cases the clipboard trust-boundary helper guards), and this
              // read-only input is the only other path to the proof link.
              onFocus={(e) => e.currentTarget.select()}
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
              <XIcon />
              Post on X
            </a>
            <a
              href={linkedInUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 px-5 py-3 border border-deep-blue/15 text-deep-blue rounded-full font-medium text-sm hover:bg-deep-blue/5 transition-colors"
            >
              <LinkedInIcon />
              Share on LinkedIn
            </a>
          </div>

          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-deep-blue/30 uppercase tracking-[0.2em]">
              Embed badge
            </p>
            {/* A format switcher, not a tab set: `role="tab"`/`tablist` promises
                a tabpanel relationship (`aria-controls`), roving tabindex, and
                arrow-key navigation that this control doesn't implement, so a
                screen reader announced "tab, 1 of 2" and offered tab semantics
                that went nowhere. `aria-pressed` toggle buttons describe what
                these actually are — two mutually-exclusive on/off toggles that
                swap the snippet below. Accessibility-honesty sibling of the
                §6.39 playback-control and §6.29 verification-link a11y fixes. */}
            <div className="flex items-center gap-1 p-0.5 bg-deep-blue/[0.04] rounded-full" role="group" aria-label="Embed format">
              <button
                aria-pressed={embedFormat === 'markdown'}
                onClick={() => setEmbedFormat('markdown')}
                className={`px-3 py-1 rounded-full text-[11px] font-medium transition-colors ${
                  embedFormat === 'markdown' ? 'bg-deep-blue text-cream' : 'text-deep-blue/50 hover:text-deep-blue'
                }`}
              >
                Markdown
              </button>
              <button
                aria-pressed={embedFormat === 'html'}
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
                if (!(await writeClipboard(embedSnippet))) return;
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
            <WritingAnalysis metrics={session.metrics} wpm={wpm} />
          </div>
        )}
      </main>
    </div>
  );
}
