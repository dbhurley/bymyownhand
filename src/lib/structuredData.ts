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
    logo: `${siteUrl}/logo.svg`,
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
  };
}
