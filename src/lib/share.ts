// Single source of truth for the social-share intent URLs used on
// `/success/<hash>` and `/verify/<hash>`. The two surfaces deliberately use
// different *voice* in their tweet copy (first-person on /success, third-person
// on /verify, since a visitor on /verify isn't necessarily the author), so the
// text template stays at the call site — but the encode-and-wrap shape of the
// intent URLs themselves is identical and was duplicated. A future tweak
// (UTM tagging, swapping intent endpoints, adding a Bluesky/Mastodon target)
// now lands in one place. Drift-prevention sibling of the prior
// getScoreLabel / getSiteUrl / buildEmbedSnippets / buildVerifyUrl / countWords
// consolidations.

export function buildTweetUrl(text: string, url?: string): string {
  // Target the canonical `x.com` intent host, not `twitter.com`. Since X's
  // domain migration `twitter.com/intent/tweet` 301-redirects to `x.com`, so
  // every share paid a redirect hop — and some in-app browsers and link-preview
  // scrapers drop or mangle the long `text` query param across the cross-domain
  // redirect. Pointing straight at `x.com` removes the hop and matches the
  // "Post on X" label both share surfaces already use.
  //
  // Carry the proof link in X's dedicated `url` param rather than concatenated
  // into `text`. X appends the `url` as a link and cards it from the page's
  // OG/Twitter tags — which the per-document `/verify/<hash>` card now
  // populates with the document title — so the shared tweet unfurls a proper
  // preview instead of a bare inline link, and the composed message reads
  // clean (the raw `bmoh-…` URL no longer clutters the sentence). Sharing is a
  // core success metric, so this makes the artifact the flywheel puts in front
  // of new readers look intentional. `text`-only callers are unaffected.
  const base = `https://x.com/intent/tweet?text=${encodeURIComponent(text)}`;
  return url ? `${base}&url=${encodeURIComponent(url)}` : base;
}

export function buildLinkedInShareUrl(verifyUrl: string): string {
  return `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(verifyUrl)}`;
}

// Single source of truth for the site-wide default Open Graph / Twitter share
// image — the raster asset the site falls back to when a surface has no bespoke
// card image. The path + intrinsic dimensions were inlined verbatim across four
// metadata surfaces (`app/layout.tsx`, `app/blog/page.tsx`,
// `app/blog/[slug]/page.tsx`, and `app/verify/[hash]/layout.tsx`), so the
// Phase 1.5 bespoke per-document OG image — or any future asset swap / dimension
// change — had four places to drift from. `ogShareImages(alt)` returns the
// OpenGraph `images` array (which carries per-surface alt text and dimensions);
// `SHARE_IMAGE_PATH` is the bare path the Twitter `images` array wants.
// Drift-prevention sibling of the prior getSiteUrl / getScoreLabel /
// buildEmbedSnippets / computeWpm consolidations.
export const SHARE_IMAGE_PATH = '/icon-512x512.png';

export function ogShareImages(alt: string) {
  // Declare the image MIME type alongside the dimensions. `og:image:type` is a
  // documented OpenGraph property some scrapers read to decide whether to fetch
  // and how to decode the card image before rendering a preview; the asset is a
  // PNG, so advertise it. Additive, zero-risk metadata enrichment that lands on
  // all four card surfaces (`app/layout.tsx`, `app/blog/page.tsx`,
  // `app/blog/[slug]/page.tsx`, `app/verify/[hash]/layout.tsx`) through this one
  // helper — discovery-enrichment sibling of the Organization `founder` /
  // WebSite `inLanguage` / BlogPosting `wordCount` / feed `icon`/`favicon`
  // additions. (The Twitter card uses the bare `SHARE_IMAGE_PATH`; X infers the
  // type itself, so it needs nothing here.)
  return [{ url: SHARE_IMAGE_PATH, width: 512, height: 512, alt, type: 'image/png' }];
}
