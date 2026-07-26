import type { Metadata } from 'next';
import { getDocumentByHash } from '@/lib/db';
import { isValidVerificationHash } from '@/lib/hash';
import { ogShareImages, twitterShareImages } from '@/lib/share';

// Server layout wrapping the (client) /verify/<hash> proof page so it can carry
// per-request metadata the page itself can't: the page is `'use client'` (it
// reads sessionStorage for the author's own just-certified fast-path and falls
// back to the API), so it can't export `generateMetadata`. This layout runs for
// the crawler / social scraper that fetches a *shared* proof link. Two fixes:
//
//  1. Self-referential canonical. The root layout declares
//     `alternates: { canonical: "/" }`, and Next.js inherits a parent's
//     `alternates` into any child route that doesn't override it — so every
//     /verify/<hash> was emitting `<link rel="canonical" href=".../">`, telling
//     search engines the proof page (the crawlable surface the embed flywheel
//     drives cold visitors to — `/verify` is intentionally *not* disallowed in
//     robots.ts, unlike `/success`) is a duplicate of the homepage. Same
//     inherited-canonical bug the §6.35 blog-canonical fix corrected; point it
//     at the page's own URL.
//
//  2. Per-document share card. When a writer shares their proof link on
//     X / LinkedIn / iMessage, the scraper saw only the generic root title
//     ("By My Own Hand | Prove Your Writing is Human"). Sharing is a core
//     success metric and the embed flywheel depends on shared proof links
//     looking credible, so surface the document's own title in the OG/Twitter
//     card when we can resolve it (DB-backed). Falls back to the generic card
//     when there's no DATABASE_URL or the hash isn't found — identical to
//     today's behavior, so no regression on the MVP no-DB path. The bespoke OG
//     *image* with title + score + word count (Phase 1.5 ◐) remains separate
//     future work; this gets the per-document *title* into the card today.
export async function generateMetadata({ params }: { params: Promise<{ hash: string }> }): Promise<Metadata> {
  const { hash } = await params;

  // A hash that can't have been minted by `generateVerificationHash()` (a
  // truncated share link, a crawler probing `/verify/<garbage>`) always renders
  // the client "Document Not Found" state — with a 200, because the page is
  // client-rendered and can't call `notFound()`. That is a soft 404, and this
  // branch used to hand crawlers a canonical pointing at `/verify`, which isn't
  // a route at all (only `/verify/<hash>` exists), so the page advertised a
  // canonical URL that itself 404s. Mark these `noindex` instead and declare no
  // canonical: the surface has nothing to index, and `follow` stays on so the
  // links back into the site are still crawled. Only the *format-invalid* case
  // is excluded — a well-formed hash stays indexable even when it can't be
  // resolved here (the MVP no-DB path resolves nothing server-side yet renders a
  // real proof for its author), so no legitimate proof link is affected. Same
  // crawl-budget honesty as the `/success` + `/api/documents` disallows and the
  // sitemap freshness fixes.
  if (!isValidVerificationHash(hash)) {
    return { robots: { index: false } };
  }

  const canonicalPath = `/verify/${hash}`;

  let docTitle: string | null = null;
  try {
    const doc = await getDocumentByHash(hash);
    if (doc && typeof doc.title === 'string' && doc.title.trim()) {
      docTitle = doc.title.trim();
    }
  } catch {
    // No DB / lookup failure — fall through to the generic share card.
  }

  // No resolvable document (the common MVP no-DB path, or an unknown hash):
  // still fix the canonical, but inherit the root OG/Twitter card unchanged.
  if (!docTitle) {
    return { alternates: { canonical: canonicalPath } };
  }

  const pageTitle = `"${docTitle}" — verified human-written`;
  const description = `Proof that "${docTitle}" was composed keystroke by keystroke, by a human hand.`;
  return {
    title: pageTitle,
    description,
    alternates: { canonical: canonicalPath },
    openGraph: {
      title: pageTitle,
      description,
      type: 'article',
      // Next.js replaces (does not deep-merge) the parent `openGraph` when this
      // route resolves a document title and sets its own, so without these two
      // the per-document proof card drops the root's `og:site_name` /
      // `og:locale` — the same replace-not-merge gap just closed on the blog
      // post card. (The no-DB / unknown-hash path returns only `alternates` and
      // still inherits the full root card, so this matters only on the
      // DB-backed branch.) Restore them so a shared proof link carries brand
      // attribution and a locale hint like every other surface.
      siteName: 'By My Own Hand',
      locale: 'en_US',
      url: canonicalPath,
      images: ogShareImages('By My Own Hand'),
    },
    twitter: {
      card: 'summary_large_image',
      title: pageTitle,
      description,
      images: twitterShareImages('By My Own Hand'),
    },
  };
}

export default function VerifyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
