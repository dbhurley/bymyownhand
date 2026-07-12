'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import type { WritingSession } from '@/lib/types';
import { clearDraft, formatDraftAge, loadDraft, type DraftSnapshot } from '@/lib/draft';
import { countWords } from '@/lib/metrics';
import { getStreakSummary, type StreakSummary } from '@/lib/history';
import { organizationJsonLd, websiteJsonLd } from '@/lib/structuredData';

// Dynamic import for Monaco to avoid SSR issues
const LockedEditor = dynamic(() => import('@/components/LockedEditor'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full bg-cream">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-2 border-deep-blue/15 border-t-deep-blue/60 rounded-full animate-spin" />
        <span className="text-deep-blue/40 text-sm">Preparing your writing environment...</span>
      </div>
    </div>
  ),
});

type DraftDecision = 'pending' | 'resume' | 'fresh';

export default function WritePage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftSnapshot | null>(null);
  const [decision, setDecision] = useState<DraftDecision>('pending');
  const [streak, setStreak] = useState<StreakSummary | null>(null);

  useEffect(() => {
    const existing = loadDraft();
    if (existing) {
      setDraft(existing);
      setTitle(existing.title);
    } else {
      setDecision('fresh');
    }
    // Surface the returning writer's habit before they start — the same
    // local-first streak the /success page records into `lib/history.ts`
    // (Phase 1.4). Seeing "3-day streak" as you sit down to write is the
    // reinforcement half of the habit loop the success-page pill only rewards
    // *after* the fact. Reads localStorage on mount, so it stays a client-only
    // effect; shows nothing until a first piece is certified.
    setStreak(getStreakSummary());
  }, []);

  const handleResume = () => setDecision('resume');
  const handleDiscard = () => {
    clearDraft();
    setDraft(null);
    setTitle('');
    setDecision('fresh');
  };

  const handleComplete = async (session: WritingSession) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title || 'Untitled Document',
          session,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit document');
      }

      // Store session data in sessionStorage for the success page
      sessionStorage.setItem('lastSession', JSON.stringify({
        ...session,
        verificationHash: data.verificationHash,
        documentId: data.documentId,
        title: title || 'Untitled Document',
      }));

      // Redirect to success/verification page
      router.push(`/success/${data.verificationHash}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 flex flex-col bg-cream overflow-hidden">
      {/* Header */}
      <header className="flex-shrink-0 flex items-center justify-between px-5 md:px-8 py-3 md:py-4 border-b border-deep-blue/[0.06]">
        <Link href="/" className="flex items-center gap-2.5 hover:opacity-70 transition-opacity">
          <img src="/logo.svg" alt="By My Own Hand" width="22" height="20" className="block" />
          <span className="font-semibold text-deep-blue text-sm hidden sm:inline">By My Own Hand</span>
        </Link>

        <div className="flex items-center gap-4">
          {/* Calm returning-writer streak — the reinforcement half of the
              Phase 1.4 habit loop, shown before writing rather than only after.
              Hidden while submitting/erroring so it never competes with those
              transient states, and absent entirely until a first certification. */}
          {!error && !isSubmitting && streak && streak.streak > 1 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-deep-blue/[0.08] rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-deep-blue/40" />
              <span className="text-xs text-deep-blue/60">
                <span className="font-semibold text-deep-blue">{streak.streak}</span>-day streak
              </span>
            </div>
          )}
          {/* role="alert" so a screen reader announces a failed certification —
              the header is the only place the submission error surfaces, and a
              writer using assistive tech otherwise gets no feedback that the
              Complete they just pressed failed. Same a11y-honesty lineage as the
              DownloadCertificate inline error (role="alert") and the /verify
              loading state (role="status"). */}
          {error && (
            <div role="alert" className="flex items-center gap-2 px-3 py-1.5 bg-red-50 border border-red-100 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
              <span className="text-xs text-red-600">{error}</span>
            </div>
          )}
          {/* role="status" + aria-live so the in-flight certification is
              announced too; the decorative spinner is hidden from the a11y tree. */}
          {isSubmitting && (
            <div className="flex items-center gap-2" role="status" aria-live="polite">
              <div className="w-3.5 h-3.5 border-2 border-deep-blue/20 border-t-deep-blue/60 rounded-full animate-spin" aria-hidden="true" />
              <span className="text-xs text-deep-blue/50">Certifying...</span>
            </div>
          )}
        </div>
      </header>

      {/* JSON-LD structured data. URLs resolve through getSiteUrl() so
          staging/local-preview pages emit their own canonical instead of
          hard-coding production. The SearchAction was dropped (§6.16) because
          this site has no /?s=... search route. The FAQPage block was dropped
          too: Google's FAQ schema requires the Q&A content to be visible to
          users on the page at the same URL, but `/write` is just the locked
          editor — the questions and answers were never rendered anywhere on
          this surface. Google also deprecated FAQ rich results in Aug 2023
          (only government/health sites still get them), so the block was
          carrying real schema-policy risk for zero SEO upside. Same honesty
          principle as the prior "no fabricated evidence" series. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd()) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd()) }}
      />

      {/* Editor. A <main> landmark rather than a bare <div>: the editor is the
          page's primary content, and — like the homepage fix — /write was
          missing the "skip to main content" landmark that /success, /verify, and
          the blog routes already carry (WCAG 1.3.1). The <header> above stays its
          own landmark; the flex layout is unchanged (same classes on <main>). */}
      <main className="flex-1 min-h-0 overflow-hidden">
        {decision === 'pending' && draft ? (
          <ResumeBanner
            draft={draft}
            onResume={handleResume}
            onDiscard={handleDiscard}
          />
        ) : decision !== 'pending' ? (
          <LockedEditor
            title={title}
            onTitleChange={setTitle}
            onComplete={handleComplete}
            initialDraft={decision === 'resume' ? draft : null}
            isSubmitting={isSubmitting}
          />
        ) : null}
      </main>
    </div>
  );
}

function ResumeBanner({
  draft,
  onResume,
  onDiscard,
}: {
  draft: DraftSnapshot;
  onResume: () => void;
  onDiscard: () => void;
}) {
  const wordCount = countWords(draft.content);
  return (
    <div className="h-full flex items-center justify-center px-6 bg-cream">
      <div className="max-w-md w-full bg-white rounded-2xl border border-deep-blue/[0.08] p-6 md:p-8 shadow-sm">
        <p className="text-xs font-semibold text-deep-blue/30 uppercase tracking-[0.2em] mb-3">
          Unfinished draft
        </p>
        <h2 className="text-2xl font-bold text-deep-blue mb-2 tracking-tight">
          Resume where you left off?
        </h2>
        <p className="text-deep-blue/50 mb-6 leading-relaxed">
          We saved <span className="font-semibold text-deep-blue/70">{draft.title || 'an untitled draft'}</span>
          {' '}({wordCount} word{wordCount === 1 ? '' : 's'}, {formatDraftAge(draft.savedAt)}).
          Resuming preserves your full keystroke trace.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={onResume}
            className="flex-1 px-5 py-3 bg-deep-blue text-cream rounded-full font-medium text-sm hover:bg-deep-blue/90 transition-colors"
          >
            Resume draft
          </button>
          <button
            onClick={onDiscard}
            className="flex-1 px-5 py-3 border border-deep-blue/15 text-deep-blue rounded-full font-medium text-sm hover:bg-deep-blue/5 transition-colors"
          >
            Start fresh
          </button>
        </div>
      </div>
    </div>
  );
}
