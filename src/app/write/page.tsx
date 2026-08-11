'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { MAX_DOCUMENT_TITLE_LENGTH, type WritingSession } from '@/lib/types';
import { clearDraft, formatDraftAge, formatDraftExpiry, loadDraft, type DraftSnapshot } from '@/lib/draft';
import { countWords } from '@/lib/metrics';
import { getStreakSummary, recordCertification, type StreakSummary } from '@/lib/history';
import { isValidVerificationHash } from '@/lib/hash';
import { writeSessionHandoff } from '@/lib/sessionHandoff';
import {
  breadcrumbListJsonLd,
  faqPageJsonLd,
  organizationJsonLd,
  webApplicationJsonLd,
  websiteJsonLd,
} from '@/lib/structuredData';
import { getSiteUrl } from '@/lib/site';

// Dynamic import for Monaco to avoid SSR issues
const LockedEditor = dynamic(() => import('@/components/LockedEditor'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full bg-cream">
      {/* role="status" + aria-live so a screen-reader user is told the editor
          is loading rather than landing on a silent blank surface (Monaco is a
          heavy client bundle, so this fallback can show for a beat on a cold
          load); the spinner is decorative and hidden from the a11y tree. Same
          treatment as the /verify loading state (§6.36) and the /write submit
          spinner — always-on cross-cutting accessibility investment. */}
      <div className="flex flex-col items-center gap-4" role="status" aria-live="polite">
        <div className="w-10 h-10 border-2 border-deep-blue/15 border-t-deep-blue/60 rounded-full animate-spin" aria-hidden="true" />
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
      // Older/tampered drafts can predate the shared title cap. Normalize on
      // restore too, otherwise a controlled input can begin over maxLength and
      // the success page can still diverge from the server's stored title.
      setTitle(existing.title.slice(0, MAX_DOCUMENT_TITLE_LENGTH));
      // The resume banner is an interstitial that gates the editor to ask a
      // question — "do you want your earlier work back?" — and that question
      // only means anything when there *is* earlier work. The autosave persists
      // a snapshot as soon as the writer has a title *or* content, so someone
      // who typed a title and left came back to a full-screen card offering to
      // resume a draft of zero words, and had to answer it before they could
      // write anything. Friction, on the one surface the entire product exists
      // to get people onto — and inconsistent with the landing-page recall card,
      // which already declines to announce a wordless draft as something to
      // return to.
      //
      // Resumed silently rather than discarded: the title carries over as it
      // always did, and a wordless draft can still hold a real keystroke trace
      // (a writer who typed a paragraph and deleted all of it), which resuming
      // keeps continuous exactly as the banner's Resume button would.
      setDecision(countWords(existing.content) === 0 ? 'resume' : 'pending');
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

  // Resolves `true` only when the document is actually certified. The editor
  // holds the writer's localStorage draft until it gets that answer, so a
  // failed certification no longer erases their only saved copy.
  const handleComplete = async (session: WritingSession): Promise<boolean> => {
    setIsSubmitting(true);
    setError(null);

    try {
      // Send and retain exactly the title the server will persist. Previously
      // the server trimmed/capped independently while sessionStorage and the
      // local proof history kept the raw client title, producing two names for
      // one proof until the writer reached the durable /verify page.
      const certifiedTitle = title.trim().slice(0, MAX_DOCUMENT_TITLE_LENGTH) || 'Untitled Document';
      const response = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: certifiedTitle,
          session,
        }),
      });

      // Infrastructure errors do not always arrive as JSON (a proxy may send
      // an empty or HTML 502/503 body). Parsing such a body used to throw its
      // own SyntaxError and replace the useful certification failure with an
      // implementation detail. Treat the body as optional/untrusted and keep a
      // calm status-based fallback while the editor continues autosaving.
      const data: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        const message = data && typeof data === 'object' && 'error' in data &&
          typeof data.error === 'string'
          ? data.error
          : `Certification failed (${response.status}). Please try again.`;
        throw new Error(message);
      }

      // A 2xx status is not enough to clear the only local draft. Validate the
      // response fields that drive the success route and handoff before treating
      // the write as certified; otherwise an incomplete proxy/server response
      // sends the writer to /success/undefined and permanently discards their
      // recoverable work. This is the response-side twin of the API request
      // validation below.
      if (!data || typeof data !== 'object') {
        throw new Error('Certification response was incomplete. Your draft is still safe — please try again.');
      }
      const { verificationHash: hash, documentId } = data as Record<string, unknown>;
      if (!isValidVerificationHash(hash) || typeof documentId !== 'string' || !documentId) {
        throw new Error('Certification response was incomplete. Your draft is still safe — please try again.');
      }
      // The document is already certified server-side by the time we get here,
      // so nothing below is allowed to report the certification as a failure.
      // `sessionStorage.setItem` can throw: the payload carries the whole
      // keystroke trace (a long piece runs to megabytes, against a ~5MB origin
      // quota), and some privacy modes reject storage writes outright. The call
      // used to sit inside this function's outer `try`, so a throw took the
      // writer down the catch path — "Something went wrong" in the header, the
      // draft kept, and *no proof link at all* for a document that had just
      // been certified. Pressing Complete again then minted a second hash for
      // the same piece.
      if (!writeSessionHandoff({
        ...session,
        verificationHash: hash,
        documentId,
        title: certifiedTitle,
        // These fields are always present on an editor-minted session. Making
        // that runtime contract explicit here lets the shared handoff validator
        // protect both destination pages from partial browser storage.
        endedAt: session.endedAt!,
        metrics: session.metrics!,
        integrityScore: session.integrityScore!,
      })) {
        // Without the handoff payload `/success/<hash>` has nothing to render
        // and redirects to `/verify/<hash>` on its own, so go straight there.
        // Record the certification here too: `/success` is what normally writes
        // it into the local history that the streak and the proof-recall lists
        // read, and skipping that page would silently break the writer's streak
        // on the one day their storage was full. `recordCertification()` is
        // idempotent on the hash and swallows its own storage failures.
        recordCertification({
          hash,
          certifiedAt: Date.now(),
          wordCount: session.wordCount,
          integrityScore: session.integrityScore ?? 0,
          title: certifiedTitle,
        });
        router.push(`/verify/${hash}`);
        return true;
      }

      // Redirect to success/verification page
      router.push(`/success/${hash}`);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setIsSubmitting(false);
      return false;
    }
  };

  return (
    <div className="fixed inset-0 flex flex-col bg-cream overflow-hidden">
      {/* Header */}
      <header className="flex-shrink-0 flex items-center justify-between px-5 md:px-8 py-3 md:py-4 border-b border-deep-blue/[0.06]">
        {/* The mark is decorative — the wordmark beside it is the same words,
            and announcing both read the brand twice. The wordmark is hidden
            below `sm`, though, so the link carries the name itself rather than
            leaning on text that isn't always rendered; it matches the visible
            text exactly where that text is shown (WCAG 2.5.3). */}
        <Link href="/" aria-label="By My Own Hand" className="flex items-center gap-2.5 hover:opacity-70 transition-opacity">
          <img src="/logo.svg" alt="" width="22" height="20" className="block" />
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
          this site has no /?s=... search route.

          The app / FAQ / breadcrumb nodes below were added inline with
          hard-coded `https://bymyownhand.com/...` URLs, so a staging or preview
          deployment advertised production's URLs, and the app node was a second
          hand-rolled description of the product competing with the homepage's
          `webApplicationJsonLd()` entity. All three now come from the shared
          `lib/structuredData.ts` helpers, resolve through getSiteUrl(), and the
          app node reuses the one stable `@id` so both surfaces describe a single
          entity. See `faqPageJsonLd()` for why the FAQ block stays despite the
          earlier decision to drop it. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd()) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd()) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webApplicationJsonLd(`${getSiteUrl()}/write`)) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqPageJsonLd()) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbListJsonLd([{ name: 'Home', path: '/' }, { name: 'Write' }])
          ),
        }}
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
  // The 24h window was enforced silently — see formatDraftExpiry(). A writer
  // deciding whether to resume should know how long the choice stays open.
  const expiry = formatDraftExpiry(draft.savedAt);
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
          {' '}({wordCount} word{wordCount === 1 ? '' : 's'}, {formatDraftAge(draft.savedAt)}
          {expiry ? `, ${expiry}` : ''}).
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
