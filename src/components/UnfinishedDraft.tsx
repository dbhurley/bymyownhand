'use client';

import { useRef, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { formatDraftAge, loadDraft } from '@/lib/draft';
import { countWords } from '@/lib/metrics';

// A returning writer's *unfinished* piece, recalled on the landing page.
//
// Phase 1.1 gave the draft durability — it survives a tab close, a failed
// certification, and a backgrounded mobile tab. But the only surface that ever
// told the writer a draft existed was the Resume banner on `/write`, which they
// have to already be on. A writer who left mid-piece and comes back the next day
// lands on `/`, sees their finished proofs (the `YourProofs` list right below
// this one) and a marketing page inviting them to "Begin Writing" — with no
// indication that the thing they were actually in the middle of is sitting one
// click away, and a 24h expiry quietly running against it.
//
// That is the same "the work survives, the path to it doesn't" gap the proof
// recall list closed for *certified* pieces, one step earlier in the funnel:
// there, a proof existed with no reachable URL; here, a draft exists with no
// reachable prompt. And it is the higher-value half of the two — an unfinished
// draft is a writer mid-session, which is the return visit Phase 1 is trying to
// earn, while a certified piece is already banked.
//
// Deliberately not a second copy of the Resume/Discard decision: this only
// announces the draft and links to `/write`, where the existing banner asks
// whether to resume or start fresh. Discarding is destructive, so it stays on
// the one surface that already frames the choice.
//
// Renders nothing when there is no draft, so a first-time visitor, a crawler,
// and the server-rendered HTML all see today's page exactly as it is.
// `loadDraft()` is read once per mount through a ref — it is an external store
// (and it prunes an expired draft as a side effect), so it must not re-run on
// every render — and delivered via `useSyncExternalStore` with an empty server
// snapshot, the same pattern `YourProofs` uses for the history.
interface DraftSummary {
  title: string;
  wordCount: number;
  savedAt: number;
}

const noopSubscribe = () => () => {};

export function UnfinishedDraft() {
  const snapshot = useRef<DraftSummary | null | undefined>(undefined);

  const draft = useSyncExternalStore(
    noopSubscribe,
    () => {
      if (snapshot.current === undefined) {
        const stored = loadDraft();
        snapshot.current = stored
          ? {
              title: stored.title,
              wordCount: countWords(stored.content),
              savedAt: stored.savedAt,
            }
          : null;
      }
      return snapshot.current;
    },
    () => null
  );

  // An empty draft (the editor autosaves a title-only snapshot) has nothing to
  // resume *to* — announcing "0 words" would be noise, not recall.
  if (!draft || draft.wordCount === 0) return null;

  return (
    <section className="max-w-3xl mx-auto px-6 pt-4 pb-8">
      <Link
        href="/write"
        className="group flex items-center justify-between gap-4 max-w-xl mx-auto bg-white rounded-2xl border border-deep-blue/[0.08] px-5 md:px-6 py-4 hover:border-deep-blue/20 transition-colors"
      >
        <span className="min-w-0">
          <span className="block text-xs font-semibold text-deep-blue/30 uppercase tracking-[0.2em] mb-1">
            Unfinished draft
          </span>
          <span className="block text-sm text-deep-blue/75 truncate">
            {draft.title || 'Untitled draft'}
          </span>
          <span className="block text-xs text-deep-blue/35 mt-0.5">
            {draft.wordCount} word{draft.wordCount === 1 ? '' : 's'} · saved {formatDraftAge(draft.savedAt)}
          </span>
        </span>
        <span className="flex items-center gap-2 flex-shrink-0 text-sm font-medium text-deep-blue">
          Resume
          {/* Decorative — "Resume" beside it is the accessible name. */}
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="group-hover:translate-x-0.5 transition-transform">
            <path d="M3 8H13M13 8L9 4M13 8L9 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </Link>
    </section>
  );
}
