'use client';

import { useRef, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { getRecentCertifications, type CertificationRecord } from '@/lib/history';
import { getScoreLabel } from '@/lib/metrics';

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
const RECALL_LIMIT = 3;

// `localStorage` is an external store, so read it with `useSyncExternalStore`
// rather than the read-in-an-effect-then-setState pattern: React renders the
// server snapshot (empty) during hydration and the client snapshot afterwards,
// which is exactly the no-mismatch behavior we need, without the extra render
// pass a state update in an effect costs. The snapshot must be referentially
// stable across renders — `getRecentCertifications()` allocates a fresh array
// each call — so it is memoized per mount in a ref. Nothing mutates the history
// while this page is open (certification happens on `/write` → `/success`), so
// there is no change to subscribe to.
const EMPTY_SNAPSHOT: CertificationRecord[] = [];
const noopSubscribe = () => () => {};

export function YourProofs() {
  const snapshot = useRef<CertificationRecord[] | null>(null);
  const proofs = useSyncExternalStore(
    noopSubscribe,
    () => (snapshot.current ??= getRecentCertifications(RECALL_LIMIT)),
    () => EMPTY_SNAPSHOT
  );

  if (proofs.length === 0) return null;

  return (
    <>
      <div className="flex items-center justify-center gap-3 max-w-3xl mx-auto px-6">
        <div className="w-12 h-px bg-deep-blue/[0.08]" />
        <div className="w-1.5 h-1.5 rounded-full bg-deep-blue/[0.08]" />
        <div className="w-12 h-px bg-deep-blue/[0.08]" />
      </div>

      <section className="max-w-3xl mx-auto px-6 py-20 md:py-24">
        <h2 className="text-xs font-semibold text-deep-blue/30 uppercase tracking-[0.2em] mb-10 text-center">
          Your proofs
        </h2>

        <ul className="max-w-xl mx-auto bg-white rounded-2xl border border-deep-blue/[0.06] overflow-hidden divide-y divide-deep-blue/[0.04]">
          {proofs.map(proof => (
            <li key={proof.hash}>
              <Link
                href={`/verify/${proof.hash}`}
                className="flex items-center justify-between gap-4 px-5 md:px-6 py-3.5 hover:bg-deep-blue/[0.02] transition-colors"
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-sm text-deep-blue/75 truncate">
                    {/* Records written before titles were kept fall back to the
                        hash, which is still a meaningful handle. */}
                    {proof.title || proof.hash}
                  </span>
                  <span className="block text-xs text-deep-blue/35 mt-0.5">
                    {new Date(proof.certifiedAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                    {' · '}
                    {proof.wordCount} word{proof.wordCount === 1 ? '' : 's'}
                  </span>
                </span>
                <span className={`text-sm font-semibold flex-shrink-0 tabular-nums ${getScoreLabel(proof.integrityScore).color}`}>
                  {proof.integrityScore}
                </span>
              </Link>
            </li>
          ))}
        </ul>

        <p className="text-xs text-deep-blue/35 mt-4 text-center">
          Kept on this device only — no account needed, nothing uploaded.
        </p>
      </section>
    </>
  );
}
