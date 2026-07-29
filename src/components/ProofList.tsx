import Link from 'next/link';
import type { CertificationRecord } from '@/lib/history';
import { getScoreLabel } from '@/lib/metrics';

// The rendering of a writer's recalled proofs, in one place.
//
// This markup shipped twice — once in `components/YourProofs.tsx` (the landing
// page) and once inline in `app/success/[hash]/page.tsx` — as two identical
// copies of the same card: the `/verify/<hash>` link, the title-or-hash
// fallback for records written before titles were kept, the localized date, the
// pluralized word count, and the score in its `getScoreLabel()` colour. Two
// copies means a change to any one of those — a date format, an added "view
// certificate" affordance, the wording of the legacy fallback — has to land in
// both or the writer sees two different renderings of the same record on two
// pages that link to each other.
//
// Same drift-prevention shape as the prior `getScoreLabel()` / `getSiteUrl()` /
// `buildEmbedSnippets()` / `countWords()` consolidations, and worth doing before
// the list migrates to the Phase 1.2 `/u/<handle>` portfolio, which will be a
// third caller of exactly this row.
export function ProofList({ proofs }: { proofs: CertificationRecord[] }) {
  return (
    <ul className="bg-white rounded-2xl border border-deep-blue/[0.06] overflow-hidden divide-y divide-deep-blue/[0.04]">
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
  );
}
