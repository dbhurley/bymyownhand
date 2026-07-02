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
    // A short description so search engines have organization-level context for
    // the knowledge panel instead of only a name and logo. Mirrors the site's
    // meta description; lands in the shared helper so all three surfaces (`/`,
    // `/write`, `/blog`) advertise it consistently.
    description:
      'By My Own Hand certifies that a piece of writing was composed by a human, keystroke by keystroke — a lockdown editor captures every keystroke, blocks external paste, and produces a shareable proof of authorship.',
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
