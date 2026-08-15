import { isValidVerificationHash } from '@/lib/hash';
import {
  BADGE_LABEL,
  BADGE_LINK_TITLE,
  BADGE_MARK_CSS,
  BADGE_MARK_SIZE,
  BADGE_PILL_CSS,
  BADGE_PILL_MARK_PATH,
} from '@/lib/embed';

// The Phase 1.3 `iframe` badge variant — the format that reaches the hosts the
// `<script>` one can't (hosted CMS templates, forum and wiki markup,
// documentation platforms, several newsletter editors, all of which strip
// `<script>` while allowing an `<iframe>` from an allow-listed origin):
//
//   <iframe src="https://bymyownhand.com/embed/bmoh-…" …></iframe>
//
// Served as a **route handler emitting its own complete document**, not as a
// page. That distinction is the whole point of this file.
//
// As an `app/embed/[hash]/page.tsx` it was a Next.js page like any other, so it
// inherited the root layout — and the root layout is the application. The badge
// fragment's built output carried the React runtime and seven more client
// chunks, the site's Tailwind stylesheet, **two preloaded `next/font` woff2
// files**, the web-app manifest, six icon links, the JSON-Feed autodiscovery
// link, and a canonical pointing at the homepage: 14.5 KB of HTML pulling ~671 KB
// of subresources, to render a 197×36 pill of text and one 22px image. The fonts
// are the sharpest instance of it — `BADGE_PILL_CSS` sets `system-ui`, so
// Bricolage Grotesque and Geist Mono (64 KB of woff2, `rel="preload"`, so
// fetched whether or not anything renders in them) were downloaded and never
// used.
//
// This route is fetched by every *reader* of every page carrying an iframe
// badge, on someone else's page, over their connection — which is precisely the
// volume the flywheel exists to grow, so the cost grew with the success. It is
// the same "what does this cost when it works?" shape as the share card that
// fetched a whole keystroke trace to read one title, and it made the route's own
// stated design ("no client JS, no fonts to fetch") untrue in the built output.
//
// A route handler has no layout to inherit, so the document below is exactly
// what a reader gets: no JavaScript, no framework, no stylesheet, no fonts, no
// metadata. Nothing else can be added to it by a change elsewhere in the app,
// which is the property this surface actually needs.
//
// Caching is now declared the same way its `/embed.js` twin declares it — an
// explicit `Cache-Control` with the same 24h shared-cache window the ISR
// `revalidate` provided, so a change to the shared badge definition still
// reaches embeds in the wild on one schedule rather than two.
//
// `noindex` moves from a `metadata` export to the `X-Robots-Tag` header, which
// is the equivalent for a response that isn't a rendered page. `robots.ts`
// already disallows `/embed/` outright.
//
// Framable by construction: the `frame-ancestors 'self'` / `X-Frame-Options`
// headers in `next.config.ts` are scoped to `/write` and `/success/*`, the
// input-capturing surfaces that must never be framed. This route is the
// opposite — it exists to be framed by third parties.

// The badge sits inside someone else's page, so it paints a transparent
// background and no chrome of its own; the frame is sized a little past the
// pill (see `IFRAME_WIDTH/HEIGHT` in `lib/embed.ts`) and the slack stays
// invisible on any host page, light or dark.
//
// The pill's own declarations come from the shared badge definition, so this
// variant and `/embed.js` cannot drift apart.
const FRAGMENT_CSS = [
  'html,body{background:transparent;margin:0;padding:0;overflow:hidden}',
  `.bmoh-badge{${BADGE_PILL_CSS}}`,
  `.bmoh-badge img{${BADGE_MARK_CSS}}`,
].join('');

function badgeDocument(hash: string): string {
  // Same gate as `/embed.js` applies to its `data-hash`: a value that can't have
  // been minted by `generateVerificationHash()` renders no badge at all, rather
  // than one linking to a proof that doesn't exist — and renders *genuinely*
  // nothing, not an empty styled slab, which is the state a hand-copied snippet
  // actually lands in (a truncated paste, a stale template, a deleted document).
  // The gate doubles as the escaping story for the interpolation below: a hash
  // that passes is `bmoh-` plus URL-safe nanoid characters only.
  const badge = isValidVerificationHash(hash)
    ? `<a class="bmoh-badge" href="/verify/${hash}" target="_blank" rel="noopener" title="${BADGE_LINK_TITLE}">` +
      // Decorative: the words beside it carry the meaning, so it stays out of
      // the host page's accessibility tree.
      `<img src="${BADGE_PILL_MARK_PATH}" alt="" width="${BADGE_MARK_SIZE}" height="${BADGE_MARK_SIZE}">` +
      `${BADGE_LABEL}</a>`
    : '';

  return (
    '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">' +
    `<title>${BADGE_LABEL}</title>` +
    `<style>${FRAGMENT_CSS}</style>` +
    `</head><body>${badge}</body></html>`
  );
}

// Keep the response in Next's own cache as well as the shared edge cache the
// `Cache-Control` below declares, so a cache miss still doesn't re-render per
// request. `generateStaticParams` returning nothing is the deliberate "no
// prebuilt paths, cache on first request" shape: there is no build-time list of
// hashes to enumerate, and `dynamicParams` (default `true`) admits every hash
// writers actually mint. The window matches the one `/embed.js` advertises, so a
// change to the shared badge definition reaches embeds in the wild on one
// schedule rather than two.
export const revalidate = 86400;

export async function generateStaticParams() {
  return [];
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ hash: string }> }
) {
  const { hash } = await params;

  return new Response(badgeDocument(hash), {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      // What this route renders is decided entirely by the *format* of the hash
      // in the URL, so the output for a given URL never changes. Cache it hard
      // at the shared edge — this is the one badge format fetched once per
      // reader rather than once per page — while letting a browser re-check
      // within the hour. Identical to the `/embed.js` policy.
      'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400',
      // A badge fragment is not a page: it has no prose, and indexing it would
      // put a chromeless duplicate of the proof link in front of searchers
      // instead of `/verify/<hash>`. `follow` stays on — the link out of it is
      // the real proof page.
      'X-Robots-Tag': 'noindex, follow',
    },
  });
}
