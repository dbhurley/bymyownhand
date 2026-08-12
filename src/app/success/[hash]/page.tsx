'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { computeWpm, formatDuration, getScoreLabel, getSessionWritingTime } from '@/lib/metrics';
import { buildEmbedSnippets, EMBED_FORMATS, type EmbedFormat } from '@/lib/embed';
import { getRecentCertifications, recordCertification, type CertificationRecord, type StreakSummary } from '@/lib/history';
import { buildVerifyUrl } from '@/lib/site';
import { buildLinkedInShareUrl, buildTweetUrl } from '@/lib/share';
import { writeClipboard } from '@/lib/clipboard';
import { WritingAnalysis } from '@/components/WritingAnalysis';
import { ProofList } from '@/components/ProofList';
import { XIcon, LinkedInIcon } from '@/components/ShareIcons';
import { readSessionHandoff, type SessionHandoff } from '@/lib/sessionHandoff';

const DownloadCertificate = dynamic(
  () => import('@/components/DownloadCertificate').then(mod => mod.DownloadCertificate),
  { ssr: false, loading: () => <div className="h-12 w-48 bg-deep-blue/5 rounded-full animate-pulse" /> }
);

export default function SuccessPage({ params }: { params: Promise<{ hash: string }> }) {
  const { hash } = use(params);
  const router = useRouter();
  const [session, setSession] = useState<SessionHandoff | null>(null);
  const [copied, setCopied] = useState(false);
  const [embedCopied, setEmbedCopied] = useState(false);
  const [embedFormat, setEmbedFormat] = useState<EmbedFormat>('markdown');
  const [streakSummary, setStreakSummary] = useState<StreakSummary | null>(null);
  const [recentProofs, setRecentProofs] = useState<CertificationRecord[]>([]);

  useEffect(() => {
    // sessionStorage is an external browser system. Reconcile it from a timer
    // callback after the effect has subscribed rather than synchronously
    // cascading four state updates from the effect body; this keeps the
    // success handoff one paint after hydration and satisfies React's effect
    // contract without changing the cold-visit redirect behavior.
    const reconcileSession = window.setTimeout(() => {
      const parsed = readSessionHandoff(hash);
    // Cold visits to /success/<hash> (a bookmark, a refresh after sessionStorage
    // expired) used to render a placeholder card showing "0 words / 0s / 0 Low"
    // for the user's own document — confusing, and incorrectly suggests a fresh
    // certification was just made. Hand off to /verify/<hash> instead, which
    // can fetch from the DB or fail clearly when neither source has the doc.
      if (!parsed) {
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
        title: parsed.title,
      });
      setStreakSummary(summary);
    // Read the recall list *after* recording, and exclude the piece this page
    // is already about, so the list is strictly "everything else you've
    // certified on this device."
      setRecentProofs(getRecentCertifications(5, parsed.verificationHash));
    }, 0);

    return () => window.clearTimeout(reconcileSession);
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
  const embeds = buildEmbedSnippets(verifyUrl, hash);
  const embedSnippet = embeds[embedFormat];
  const embedFormatMeta = EMBED_FORMATS.find(f => f.id === embedFormat)!;

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
          {/* Decorative — the wordmark beside it carries the same words. */}
          <img src="/logo.svg" alt="" width="24" height="21" className="block" />
          <span className="font-semibold text-deep-blue">By My Own Hand</span>
        </Link>
      </header>

      <main className="max-w-2xl mx-auto px-6 md:px-8 py-12 md:py-16">
        {/* Success header */}
        <div className="text-center mb-12">
          <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-6">
            {/* Decorative: the adjacent "Document Certified" heading already
                carries the meaning, so exposing this checkmark as an unlabeled
                graphic only adds noise for a screen reader. Same treatment as
                the certificate Download button's icons (§6.54) and the
                loading-spinner icons across /write and /verify (§6.55). */}
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" className="text-success" aria-hidden="true">
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
            <div className="mt-6 inline-flex flex-wrap items-center justify-center gap-3 px-4 py-2 bg-white border border-deep-blue/[0.08] rounded-2xl text-sm">
              <span className="text-deep-blue/70">
                <span className="font-semibold text-deep-blue">{streakSummary.total}</span> certified piece{streakSummary.total === 1 ? '' : 's'}
              </span>
              <span className="w-1 h-1 rounded-full bg-deep-blue/20" />
              <span className="text-deep-blue/70">
                <span className="font-semibold text-deep-blue">{streakSummary.thisWeek}</span> this week
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
                  {/* Decorative — the button's own "Copied" / "Copy" text is the
                      accessible name; an unlabeled inline graphic beside it only
                      adds noise. */}
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <path d="M4 8L7 11L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Copied
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
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

          {/* Wraps rather than overflows: the switcher carries four formats
              since the iframe variant shipped, which no longer fits beside the
              label on a narrow phone. */}
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
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
              {EMBED_FORMATS.map(format => (
                <button
                  key={format.id}
                  aria-pressed={embedFormat === format.id}
                  onClick={() => setEmbedFormat(format.id)}
                  className={`px-3 py-1 rounded-full text-[11px] font-medium transition-colors ${
                    embedFormat === format.id ? 'bg-deep-blue text-cream' : 'text-deep-blue/50 hover:text-deep-blue'
                  }`}
                >
                  {format.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-stretch gap-3">
            {/* The snippet is longer than the box and scrolls horizontally
                (`overflow-x-auto whitespace-nowrap`), but it held no focusable
                element — so the only way to read the rest of it was to drag with
                a mouse or trackpad. A scrollable region has to be reachable and
                scrollable from the keyboard (WCAG 2.1.1); `tabIndex={0}` makes
                it a tab stop the arrow keys then scroll, and the group role +
                label give a screen reader something to announce when it lands
                there rather than a bare unlabeled region. */}
            <code
              tabIndex={0}
              role="group"
              aria-label={`${embedFormatMeta.label} embed badge snippet`}
              className="flex-1 px-3 py-2.5 bg-deep-blue/[0.04] rounded-lg text-xs font-mono text-deep-blue/70 overflow-x-auto whitespace-nowrap"
            >
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
            {embedFormatMeta.hint}
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

        {/* Your other proofs — Phase 1.4/1.2 staged rollout. `lib/history.ts`
            has recorded every certification on this device since the streak
            pill shipped, but nothing ever read those records back, so a writer
            who closed the tab without copying a link had no way to reach that
            proof again: the document is certified and the local record of it is
            right here, yet the URL was unrecoverable. Recalling the list turns
            this page into the pre-accounts stand-in for the `/u/<handle>`
            portfolio in Phase 1.2 — and gives a returning writer a reason to
            treat their certified pieces as a body of work rather than one-shot
            links. Local-first, so it renders only after the mount effect reads
            localStorage (nothing to hydrate-mismatch), and it migrates with the
            rest of `history.ts` when accounts land. */}
        {recentProofs.length > 0 && (
          <div className="mt-14">
            <div className="flex items-baseline justify-between mb-4">
              <h2 className="text-xs font-semibold text-deep-blue/30 uppercase tracking-[0.2em]">
                Your other proofs
              </h2>
              {streakSummary && streakSummary.total > recentProofs.length + 1 && (
                <span className="text-xs text-deep-blue/30">
                  showing {recentProofs.length} of {streakSummary.total - 1}
                </span>
              )}
            </div>
            {/* Shared with the landing page's recall list — see
                components/ProofList.tsx for why the rows live in one place. */}
            <ProofList proofs={recentProofs} />
            <p className="text-xs text-deep-blue/35 mt-3">
              This proof list is kept on this device — no account needed.
            </p>
          </div>
        )}

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
