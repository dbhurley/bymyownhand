'use client';

import { useCallback, useRef, useState, useSyncExternalStore } from 'react';
import { getRecentCertifications, getStreakSummary, subscribeToHistory, type CertificationRecord, type StreakSummary } from '@/lib/history';
import { ProofList } from '@/components/ProofList';

// A returning writer's own certified pieces, recalled from the local-first
// `lib/history.ts` record — Phase 1.4/1.2 staged rollout, rendered on the
// landing page.
//
// The recall list itself already shipped on `/success/<hash>`, but that surface
// is reachable *only* in the same session as a fresh certification: a cold visit
// to `/success/<hash>` has no `sessionStorage` and redirects to `/verify`. So
// the feature that exists to stop a writer from losing their proof links was
// visible exactly once per piece — in the one moment the writer still had the
// link in front of them. Someone who comes back the next day lands on `/` (or
// `/write`) with a streak pill and no path to anything they have written.
// Surfacing the same list on the homepage is what turns a certified piece into
// a body of work the writer returns to, which is the whole point of Phase 1.
//
// Renders nothing when the device has no history, so a first-time visitor, a
// crawler, and the server-rendered HTML all see today's page exactly as it is;
// the list appears only after the mount effect reads localStorage, so there is
// nothing to hydrate-mismatch. Migrates with the rest of `history.ts` to the
// `/u/<handle>` portfolio when accounts land in Phase 1.2.
//
// The collapsed list shows the three newest pieces so the marketing page stays
// a marketing page. But three was also the *only* number a returning writer
// could ever reach: `/success/<hash>` (which lists five and notes "showing N of
// M") is reachable only in the session that certified the piece, so for a writer
// with a dozen proofs the other nine had no path at all — the same "the work
// survives, the path to it doesn't" hole the recall list exists to close, just
// moved one step further out. Expanding in place reaches the rest without
// spending a new route or a hydration-sensitive surface on it, and the whole
// section still disappears on a device with no history.
const COLLAPSED_LIMIT = 3;

// A ceiling on what the expanded list renders. `lib/history.ts` keeps up to 500
// records; rendering all of them onto the landing page would be a wall, and the
// portfolio view that genuinely wants pagination is the Phase 1.2 `/u/<handle>`
// page. Anything beyond this is reported in the count rather than silently
// dropped.
const EXPANDED_LIMIT = 25;

// `localStorage` is an external store, so read it with `useSyncExternalStore`
// rather than the read-in-an-effect-then-setState pattern: React renders the
// server snapshot (empty) during hydration and the client snapshot afterwards,
// which is exactly the no-mismatch behavior we need, without the extra render
// pass a state update in an effect costs. The snapshot must be referentially
// stable across renders — `getRecentCertifications()` allocates a fresh array
// each call — so it is memoized in a ref and invalidated only by the shared
// history subscription. That subscription matters when certification finishes
// in another tab while this landing page remains open.
interface ProofsSnapshot {
  proofs: CertificationRecord[];
  summary: StreakSummary;
}

const EMPTY_SNAPSHOT: ProofsSnapshot = {
  proofs: [],
  summary: {
    total: 0,
    streak: 0,
    best: 0,
    thisWeek: 0,
    thisWeekWords: 0,
    certifiedToday: false,
  },
};
export function YourProofs() {
  const snapshot = useRef<ProofsSnapshot | null>(null);
  const [expanded, setExpanded] = useState(false);
  const subscribe = useCallback((onStoreChange: () => void) =>
    subscribeToHistory(() => {
      snapshot.current = null;
      onStoreChange();
    }), []);

  // Read the expandable set once, then slice per render — expanding is a view
  // change, not a new read, so the store snapshot stays referentially stable.
  const { proofs, summary } = useSyncExternalStore(
    subscribe,
    () =>
      (snapshot.current ??= {
        proofs: getRecentCertifications(EXPANDED_LIMIT),
        // The whole summary, not just `total`. This call already ran here and
        // its `streak` / `best` were discarded — see the streak line below.
        summary: getStreakSummary(),
      }),
    () => EMPTY_SNAPSHOT
  );

  if (proofs.length === 0) return null;

  const { total } = summary;

  const visible = expanded ? proofs : proofs.slice(0, COLLAPSED_LIMIT);
  // Records past EXPANDED_LIMIT — unreachable from this list even when it is
  // fully expanded, so they are the only ones worth calling out. Collapsed
  // pieces are already accounted for by the "Show all N" button.
  const beyondLimit = total - proofs.length;

  return (
    <>
      <div className="flex items-center justify-center gap-3 max-w-3xl mx-auto px-6">
        <div className="w-12 h-px bg-deep-blue/[0.08]" />
        <div className="w-1.5 h-1.5 rounded-full bg-deep-blue/[0.08]" />
        <div className="w-12 h-px bg-deep-blue/[0.08]" />
      </div>

      <section className="max-w-3xl mx-auto px-6 py-20 md:py-24">
        <div className="mb-10 text-center">
          <h2 className="text-xs font-semibold text-deep-blue/30 uppercase tracking-[0.2em]">
            Your proofs
          </h2>
          {/* A local weekly recap is the useful part of the planned Phase 1.4
              digest before accounts/email exist: it makes accumulated practice
              visible on the page a returning writer actually visits, without a
              notification, tracker, or new storage shape. Word volume is used
              instead of average integrity score so the habit loop rewards
              showing up and writing, not gaming an advisory score. */}
          {summary.thisWeek > 0 && (
            <p className="mt-3 text-sm text-deep-blue/50">
              This week: <span className="font-semibold text-deep-blue">{summary.thisWeek}</span>{' '}
              certified piece{summary.thisWeek === 1 ? '' : 's'} ·{' '}
              <span className="font-semibold text-deep-blue">
                {summary.thisWeekWords.toLocaleString('en-US')}
              </span>{' '}
              word{summary.thisWeekWords === 1 ? '' : 's'}
            </p>
          )}
          {/* The Phase 1.4 habit loop, on the surface a returning writer
              actually lands on. The streak already greets them on `/write` (as
              they sit down) and rewards them on `/success/<hash>` (right after
              certifying) — but `/` is the page they arrive at, and it was the
              one surface that recalled the *work* without ever reflecting the
              *habit*. Nothing extra is read for it: `getStreakSummary()` was
              already being called here for the total and its `streak`/`best`
              thrown away.

              Shown from two days on, matching the `/write` pill and the
              `/success` pill — a "1-day streak" is just today, which is not yet
              a habit worth naming. "Best yet" mirrors the personal-best
              recognition on `/success` so the milestone reads the same wherever
              the writer meets it. */}
          {summary.streak > 1 && (
            <p className={`${summary.thisWeek > 0 ? 'mt-2' : 'mt-3'} text-sm text-deep-blue/50`}>
              <span className="font-semibold text-deep-blue">{summary.streak}</span>-day streak
              {summary.streak === summary.best && (
                <span className="ml-2 text-[11px] font-medium text-success uppercase tracking-wider">
                  Best yet
                </span>
              )}
              {/* The streak counts today *or* yesterday as its anchor, so a run
                  that has not been extended today still renders as a healthy
                  "4-day streak" right up until midnight silently ends it. That
                  is the one moment in the habit loop where saying something
                  changes the outcome — and `/` is where the writer is standing
                  when the decision gets made. Stated as the fact it is rather
                  than as a countdown or a warning colour: this is a writing
                  ritual, not a game with a life bar. */}
              {!summary.certifiedToday && (
                <span className="block mt-1 text-xs text-deep-blue/40">
                  Write today to keep it going.
                </span>
              )}
            </p>
          )}
        </div>

        {/* The list itself is the shared `ProofList` — the same rows the
            `/success/<hash>` recall list renders. The landing page's narrower
            column is applied by the wrapper, not by a second copy of the card. */}
        <div className="max-w-xl mx-auto">
          <ProofList proofs={visible} />
        </div>

        {/* Only offer the toggle when it would actually reveal something. Once
            expanded it becomes "Show fewer", so the writer can always get the
            landing page back to its calm default. */}
        {proofs.length > COLLAPSED_LIMIT && (
          <div className="mt-4 text-center">
            <button
              onClick={() => setExpanded(v => !v)}
              aria-expanded={expanded}
              className="text-xs font-medium text-deep-blue/50 hover:text-deep-blue transition-colors underline underline-offset-4 decoration-deep-blue/20"
            >
              {expanded ? 'Show fewer' : `Show all ${proofs.length}`}
            </button>
          </div>
        )}

        <p className="text-xs text-deep-blue/35 mt-4 text-center">
          {/* Report anything past EXPANDED_LIMIT rather than silently dropping
              it, so the count a writer sees always matches what is on the
              device. */}
          {beyondLimit > 0 && `${beyondLimit} older piece${beyondLimit === 1 ? '' : 's'} not shown · `}
          This proof list is kept on this device — no account needed.
        </p>
      </section>
    </>
  );
}
