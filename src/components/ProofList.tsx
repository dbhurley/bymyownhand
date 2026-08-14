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
interface ProofListProps {
  proofs: CertificationRecord[];
  managing?: boolean;
  pendingRemovalHash?: string | null;
  onRemove?: (proof: CertificationRecord) => void;
}

export function ProofList({ proofs, managing = false, pendingRemovalHash, onRemove }: ProofListProps) {
  return (
    <ul className="bg-white rounded-2xl border border-deep-blue/[0.06] overflow-hidden divide-y divide-deep-blue/[0.04]">
      {proofs.map(proof => {
        const score = getScoreLabel(proof.integrityScore);
        const displayTitle = proof.title || proof.hash;
        const removalPending = pendingRemovalHash === proof.hash;
        return (
        <li key={proof.hash} className="flex items-stretch">
          <Link
            href={`/verify/${proof.hash}`}
            className="min-w-0 flex-1 flex items-center justify-between gap-4 px-5 md:px-6 py-3.5 hover:bg-deep-blue/[0.02] transition-colors"
          >
            <span className="min-w-0 flex-1">
              <span className="block text-sm text-deep-blue/75 truncate">
                {/* Records written before titles were kept fall back to the
                    hash, which is still a meaningful handle. */}
                {displayTitle}
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
            {/* The row is a single link, so its accessible name is the
                concatenation of everything inside it — and it used to end in a
                bare number ("Essay draft, Jul 30, 2026, 412 words, 92"), which
                tells a screen-reader user nothing about what the 92 is. The
                figure is also the one value in the row whose *meaning* is
                carried visually by colour alone; the `getScoreLabel()` word
                behind that colour ("Excellent", "Good") is already shown as
                text beside the score on `/success` and `/verify`, and was the
                only thing missing here. Both are supplied to assistive tech
                without changing the calm numeral a sighted reader sees. */}
            <span className={`text-sm font-semibold flex-shrink-0 tabular-nums ${score.color}`}>
              <span className="sr-only">Integrity score </span>
              {proof.integrityScore}
              <span className="sr-only"> out of 100, {score.label}</span>
            </span>
          </Link>
          {managing && onRemove && (
            <button
              type="button"
              onClick={() => onRemove(proof)}
              aria-label={`${removalPending ? 'Confirm removal of' : 'Remove'} ${displayTitle} from this device`}
              className={`flex-shrink-0 border-l border-deep-blue/[0.06] px-3 md:px-4 text-xs font-medium transition-colors ${
                removalPending
                  ? 'bg-red-50 text-red-700 hover:bg-red-100'
                  : 'text-deep-blue/45 hover:bg-deep-blue/[0.03] hover:text-deep-blue'
              }`}
            >
              {removalPending ? 'Remove?' : 'Remove'}
            </button>
          )}
        </li>
        );
      })}
    </ul>
  );
}
