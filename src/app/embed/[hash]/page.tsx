import type { Metadata } from 'next';
import { isValidVerificationHash } from '@/lib/hash';
import {
  BADGE_LABEL,
  BADGE_LINK_TITLE,
  BADGE_MARK_CSS,
  BADGE_MARK_PATH,
  BADGE_MARK_SIZE,
  BADGE_PILL_CSS,
} from '@/lib/embed';

// The Phase 1.3 `iframe` badge variant — the last open item of the embed
// flywheel, and the one that reaches the hosts the other three can't.
//
//   <iframe src="https://bymyownhand.com/embed/bmoh-…" …></iframe>
//
// The `<script>` variant (see `app/embed.js/route.ts`) is the better badge
// wherever it runs: it renders a labelled pill whose markup stays ours to
// change. But a large share of the surfaces the roadmap names for this badge —
// hosted CMS templates, forum and wiki markup, documentation platforms, several
// newsletter editors — strip `<script>` outright while allowing an `<iframe>`
// from an allow-listed origin. On those, a writer's only option today is the
// bare `<img>` of the app icon: a 120px blue square a reader has to already
// recognise. This gives them the same *labelled* badge, served by us, in the
// element those hosts do accept.
//
// Deliberately the same pill as `/embed.js` renders, styled inline: the badge
// should read identically wherever a reader meets it, and a self-contained page
// keeps this cheap (no client JS, no Monaco, no fonts to fetch — the badge uses
// the reader's own system UI font, as the script variant does).
//
// Framable by construction: the `frame-ancestors 'self'` / `X-Frame-Options`
// headers in `next.config.ts` are scoped to `/write` and `/success/*`, the
// input-capturing surfaces that must never be framed. This route is the
// opposite — it exists to be framed by third parties.
// Cache the fragment. What this route renders is decided entirely by the
// *format* of the hash in the URL — a well-formed one gets the pill, anything
// else gets nothing — so the output for a given URL never changes, and there is
// no per-request state to read. It was nonetheless rendered on demand on every
// request, while its `/embed.js` twin (which renders the same badge from the
// same constants) is static and cached for a day at the edge.
//
// That asymmetry lands on the worst surface to have it: this route is fetched by
// every *reader* of every page carrying an iframe badge, which is exactly the
// volume the Phase 1.3 flywheel is built to grow — so the badge that succeeds
// most is the one that costs most. Serving it from the ISR cache makes the two
// served variants behave alike; the `revalidate` window is the same day
// `/embed.js` advertises, so a change to the shared badge definition still
// reaches embeds in the wild on the same schedule.
//
// `generateStaticParams` returning nothing is the deliberate "no prebuilt paths,
// cache on first request" shape: there is no build-time list of hashes to
// enumerate, and `dynamicParams` (default `true`) admits every hash the writers
// actually minted.
export const revalidate = 86400;

export async function generateStaticParams() {
  return [];
}

export const metadata: Metadata = {
  // A badge fragment is not a page: it has no prose, and indexing it would put
  // a chromeless duplicate of the proof link in front of searchers instead of
  // `/verify/<hash>`. `follow` stays on, matching the soft-404 `noindex` on
  // format-invalid verify URLs — the link out of it is the real proof page.
  robots: { index: false },
};

// The badge sits inside someone else's page, so the app's own body chrome must
// not: `globals.css` paints a cream background and applies safe-area padding to
// every surface, which inside a 40px frame renders as a cream slab with the pill
// inset from the corner. Scoped to this route because it is the only one that is
// a fragment rather than a page.
//
// Emitted *before* the hash gate below, and on every branch. It used to live
// inside the valid-hash branch, so the one case that is supposed to render
// nothing — a mistyped, truncated, or stale hash in a pasted snippet, which is
// exactly the state a hand-copied `iframe` tag lands in — instead painted a bare
// cream rectangle on the host page: the worst of both outcomes, since the reader
// sees an unexplained block where the writer sees a broken badge, and neither
// can tell what it is. An invalid hash now renders genuinely nothing.
//
// The pill's own declarations come from the shared badge definition, so this
// variant and `/embed.js` cannot drift apart.
const FRAGMENT_CSS = [
  'html,body{background:transparent!important;margin:0;padding:0;min-height:0;overflow:hidden}',
  `.bmoh-badge{${BADGE_PILL_CSS}}`,
  `.bmoh-badge img{${BADGE_MARK_CSS}}`,
].join('');

export default async function EmbedBadgePage({
  params,
}: {
  params: Promise<{ hash: string }>;
}) {
  const { hash } = await params;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: FRAGMENT_CSS }} />
      {/* Same gate as `/embed.js` applies to its `data-hash`: a value that can't
          have been minted by `generateVerificationHash()` renders no badge at
          all, rather than one linking to a proof that doesn't exist. */}
      {isValidVerificationHash(hash) && (
        <a
          className="bmoh-badge"
          href={`/verify/${hash}`}
          target="_blank"
          rel="noopener"
          title={BADGE_LINK_TITLE}
        >
          {/* Decorative: the words beside it carry the meaning. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={BADGE_MARK_PATH} alt="" width={BADGE_MARK_SIZE} height={BADGE_MARK_SIZE} />
          {BADGE_LABEL}
        </a>
      )}
    </>
  );
}
