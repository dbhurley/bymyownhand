import { getSiteUrl } from '@/lib/site';
import {
  BADGE_LABEL,
  BADGE_LINK_TITLE,
  BADGE_MARK_CSS,
  BADGE_MARK_PATH,
  BADGE_MARK_SIZE,
  BADGE_PILL_CSS,
} from '@/lib/embed';

// The Phase 1.3 one-line embed:
//
//   <script src="https://bymyownhand.com/embed.js" data-hash="bmoh-…" async></script>
//
// Every embed in the wild is a backlink, a recurring brand impression, and a
// cold visitor arriving at `/verify/<hash>` — the flywheel the roadmap names as
// the reason the badge exists at all. The Markdown and HTML snippets that
// shipped first are an `<img>` of the app icon: a 120px blue square that a
// reader has to already recognise to understand. This variant renders a badge
// that *says* what it means ("Verified human-written"), which is the half of the
// impression the image-only badges never carried, and it lets a future change to
// the badge's wording or styling reach every existing embed rather than only the
// snippets copied after the change.
//
// Served from a route (like `/api/blog/feed.json`) rather than `public/` so the
// canonical host can be baked in as a fallback and the caching is explicit.
//
// The badge's label, link title, mark, and styling come from `lib/embed.ts`,
// shared with the `iframe` variant at `/embed/<hash>` — the two must render the
// same pill, and the promise that a change here reaches every embed in the wild
// only holds while there is one definition to change.
//
// The script is deliberately tiny and dependency-free: it reads its own
// `data-hash`, validates the format, and inserts one anchor where the tag sits.
// It never writes to `document` beyond that node, sets no cookies, reads no
// storage, and makes no network request of its own beyond the badge image — this
// runs on other people's pages, and the privacy pillar has to hold there too.
export const dynamic = 'force-static';

function buildScript(siteUrl: string): string {
  return `/* By My Own Hand — verified-human badge. https://bymyownhand.com */
(function () {
  var el = document.currentScript;
  if (!el) return;
  var hash = el.getAttribute('data-hash') || '';
  // Same shape as generateVerificationHash() emits (lib/hash.ts). A malformed
  // value renders nothing at all rather than a badge linking to a dead proof.
  if (!/^bmoh-[A-Za-z0-9_-]{4}-[A-Za-z0-9_-]{4}-[A-Za-z0-9_-]{4}$/.test(hash)) return;

  // Prefer the origin this script was served from, so a staging or
  // custom-domain deployment links back to itself; fall back to the canonical
  // host when the src can't be read.
  var base = ${JSON.stringify(siteUrl)};
  try {
    var src = el.getAttribute('src');
    if (src) base = new URL(src, document.baseURI).origin;
  } catch (e) {}

  var a = document.createElement('a');
  a.href = base + '/verify/' + hash;
  a.target = '_blank';
  a.rel = 'noopener';
  a.title = ${JSON.stringify(BADGE_LINK_TITLE)};
  a.style.cssText = ${JSON.stringify(BADGE_PILL_CSS)};

  var img = document.createElement('img');
  img.src = base + ${JSON.stringify(BADGE_MARK_PATH)};
  // Decorative: the words beside it carry the meaning, so it stays out of the
  // host page's accessibility tree.
  img.alt = '';
  img.width = ${BADGE_MARK_SIZE};
  img.height = ${BADGE_MARK_SIZE};
  img.style.cssText = ${JSON.stringify(BADGE_MARK_CSS)};

  var label = document.createElement('span');
  label.textContent = ${JSON.stringify(BADGE_LABEL)};

  a.appendChild(img);
  a.appendChild(label);
  if (el.parentNode) el.parentNode.insertBefore(a, el);
})();
`;
}

export async function GET() {
  return new Response(buildScript(getSiteUrl()), {
    headers: {
      'Content-Type': 'application/javascript; charset=utf-8',
      // The badge markup changes rarely and is loaded from third-party pages we
      // don't control, so cache it hard at the edge while letting a browser
      // re-check within the hour.
      'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400',
    },
  });
}
