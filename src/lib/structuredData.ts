import { getSiteUrl } from './site';

// Single source of truth for the Organization + WebSite JSON-LD emitted on the
// marketing surfaces. The Organization object was duplicated *verbatim* on `/`,
// `/write`, and `/blog`, and the root-scoped WebSite object on `/` and `/write`
// — so a schema change (adding `sameAs`, a `description`, swapping the logo, or
// correcting a URL) had three/two places to drift from, exactly the kind of
// copy that had already drifted elsewhere (the §6.20 WPM panel, the §6.35 blog
// canonical). Consolidating here mirrors the prior getSiteUrl / getScoreLabel /
// buildEmbedSnippets / computeWpm consolidations. Each caller still renders its
// own `<script type="application/ld+json">` tag; only the object is shared.

export function organizationJsonLd() {
  const siteUrl = getSiteUrl();
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'By My Own Hand',
    url: siteUrl,
    // Raster logo, not `/logo.svg`. Google's structured-data image guidelines
    // accept raster formats (.jpg/.png/.gif/.webp) but not SVG — the same reason
    // the §6.35 fix moved the `BlogPosting` publisher.logo to the raster
    // `/icon-512x512.png`. This Organization `logo` (the more prominent
    // knowledge-panel field, emitted on `/`, `/write`, and `/blog`) was the last
    // logo still pointing at the SVG, so Google would drop it. Use the same
    // raster asset the OG/Twitter cards and the BlogPosting publisher logo
    // already ship, so every logo the site advertises to Google is eligible and
    // consistent.
    logo: `${siteUrl}/icon-512x512.png`,
    // A short description so search engines have organization-level context for
    // the knowledge panel instead of only a name and logo. Mirrors the site's
    // meta description; lands in the shared helper so all three surfaces (`/`,
    // `/write`, `/blog`) advertise it consistently.
    description:
      'By My Own Hand certifies that a piece of writing was composed by a human, keystroke by keystroke — a lockdown editor captures every keystroke, blocks external paste, and produces a shareable proof of authorship.',
    // Attribute the organization to its founder so Google can connect the
    // knowledge-panel entity to the person behind it. Grounded in the site's
    // own `public/llms.txt`, which names David Hurley (dbhurley.com) as the
    // creator — not fabricated. The `url` doubles as a `sameAs`-style external
    // reference. Additive, zero-risk enrichment lands in the shared helper, so
    // all three surfaces (`/`, `/write`, `/blog`) advertise it consistently —
    // discovery-enrichment sibling of the §6.42 Organization `description`.
    founder: {
      '@type': 'Person',
      name: 'David Hurley',
      url: 'https://dbhurley.com',
    },
  };
}

// The WebSite node the feed/index describes. `/` and `/write` use the root
// defaults; `/blog` passes its own blog-scoped name and URL.
export function websiteJsonLd(
  name: string = 'By My Own Hand',
  url: string = getSiteUrl(),
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name,
    url,
    // Declare the site's primary language so search engines have an explicit
    // language signal for the entity instead of inferring it from the page.
    // Matches the document's own `<html lang="en">` / `openGraph.locale`
    // (`en_US`) and the JSON Feed's `language` field. Additive, zero-risk
    // enrichment that lands on all three surfaces (`/`, `/write`, `/blog`) in
    // one edit — discovery-enrichment sibling of the Organization `founder` /
    // `description` additions.
    inLanguage: 'en-US',
  };
}
