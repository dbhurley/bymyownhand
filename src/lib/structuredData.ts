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
    // A stable, resolvable node identifier so other JSON-LD on the same page can
    // reference this Organization by `@id` instead of restating it. Google (and
    // other consumers) merge every `<script type="application/ld+json">` block on
    // a page into one graph, so the `WebSite` node's `publisher: { '@id': … }`
    // below resolves to this entity. Anchored to the canonical site URL with a
    // `#organization` fragment (the conventional entity-anchor form), so the id
    // is stable across the three surfaces that emit this node (`/`, `/write`,
    // `/blog`). Additive, zero-risk graph-linking enrichment.
    '@id': `${siteUrl}/#organization`,
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
    // The brand tagline as schema.org's recognized Organization `slogan` — a
    // distinct field from `description` (the full explainer above). Grounded in
    // the documented product tagline the marketing surfaces already show
    // ("Your words deserve proof."), so not fabricated. Additive, zero-risk
    // enrichment that lands on all three surfaces (`/`, `/write`, `/blog`)
    // through this one helper — discovery-enrichment sibling of the `founder` /
    // `description` additions.
    slogan: 'Your words deserve proof.',
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

// SoftwareApplication/WebApplication node for the app surfaces. The site
// emits Organization + WebSite entities, but nothing typed the product itself as
// the *application* it is — the schema.org type Google reads to understand a
// free, browser-based tool (and the one that can qualify a page for the app
// rich result). Grounded, not fabricated: the tool runs entirely in the browser
// (`operatingSystem: 'Any'`, no install), needs JavaScript (Monaco), is squarely
// a productivity app (the same category the PWA manifest declares), and is free
// to use with no account on the MVP path — so `isAccessibleForFree` + a zero-
// price `Offer` describe the real pricing. `publisher` references the
// Organization node by `@id` so it resolves within the same page's merged graph
// (the homepage emits `organizationJsonLd()` alongside this) rather than
// restating it. Additive, zero-risk discovery-enrichment sibling of the
// Organization `founder`/`slogan` and WebSite `inLanguage` additions — the app
// rich-result surface those never reached.
//
// `url` defaults to the site root (the homepage represents the product) but
// `/write` passes its own URL, since that page *is* the application. Both
// surfaces share the one stable `@id`, so they describe a single entity rather
// than two competing app nodes — `/write` previously emitted a second,
// hand-rolled `SoftwareApplication` object with hard-coded production URLs.
export function webApplicationJsonLd(url: string = getSiteUrl()) {
  const siteUrl = getSiteUrl();
  return {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    '@id': `${siteUrl}/#webapp`,
    name: 'By My Own Hand',
    url,
    applicationCategory: 'ProductivityApplication',
    // Browser-based — runs on any OS with a modern browser, nothing to install.
    operatingSystem: 'Any',
    browserRequirements: 'Requires JavaScript.',
    description:
      'A lockdown writing editor that captures every keystroke with millisecond timing, blocks external paste, and produces a shareable, tamper-evident proof that a piece of writing was composed by a human.',
    inLanguage: 'en-US',
    // The capabilities the product actually ships (§6 of the PRD), so an answer
    // engine reading this node can describe the tool without inferring it from
    // marketing prose. Kept factual — every entry maps to shipped behavior in
    // `LockedEditor` / `lib/metrics.ts` / `/verify/<hash>`.
    featureList: [
      'Real-time keystroke capture with millisecond timing',
      'External paste and drag-drop blocking',
      'Keystroke-by-keystroke playback of the writing session',
      'Shareable verification link and downloadable certificate',
    ],
    // Free to use, no account required on the MVP path. `isAccessibleForFree`
    // plus a zero-price Offer is schema.org's recognized way to declare a free
    // application, so consumers don't have to infer the pricing.
    isAccessibleForFree: true,
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    // Reference the Organization emitted on the same page by `@id` rather than
    // restating it — the merged page graph resolves it.
    publisher: { '@id': `${siteUrl}/#organization` },
  };
}

// A BreadcrumbList from an ordered trail. `item` is omitted on any crumb
// without a `path` — per Google's guidance the current page shouldn't link to
// itself in the trail — and every path resolves through getSiteUrl() so a
// staging or preview host advertises its own trail rather than production's.
export function breadcrumbListJsonLd(trail: { name: string; path?: string }[]) {
  const siteUrl = getSiteUrl();
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((crumb, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: crumb.name,
      ...(crumb.path ? { item: `${siteUrl}${crumb.path}` } : {}),
    })),
  };
}

// BreadcrumbList for a blog post. The post page already renders a *visible*
// breadcrumb ("Blog / <title>"), but with no matching structured data Google
// can't render the breadcrumb rich result — the crawler sees a flat page with
// no trail back to the section index. This mirrors the on-page trail exactly
// (Blog → the post) so the machine-readable and human-readable breadcrumbs
// agree. Additive, zero-risk discovery-enrichment sibling of the Organization
// `founder` / WebSite `inLanguage` additions, applied to the 44+ post surface
// the sitemap already ships to search engines.
export function breadcrumbJsonLd(postTitle: string) {
  return breadcrumbListJsonLd([
    { name: 'Blog', path: '/blog' },
    { name: postTitle },
  ]);
}

// FAQPage node for `/write`.
//
// History worth keeping straight: an earlier revision *removed* an FAQPage
// block from this page because Google requires the Q&A to be visible on the
// page for the FAQ rich result, and deprecated that result for non-government/
// health sites in Aug 2023. It was re-introduced for answer-engine
// optimization, which is a genuinely different consumer — LLM-backed search
// reads FAQPage regardless of Google's rich-result policy. Both things are
// true, so the block stays, but with the tradeoff recorded rather than a stale
// comment claiming it was dropped: this markup earns nothing from Google and
// carries a (small) structured-data-policy risk there, and the answers below
// must therefore stay factually true of the shipped product, since nothing on
// `/write` renders them for a human to check.
const WRITE_FAQ: { question: string; answer: string }[] = [
  {
    question: 'How does By My Own Hand prove writing is human?',
    answer:
      'By My Own Hand records keystroke-level writing activity in real time, capturing the natural rhythm, edits, and pauses of human composition. This produces a verifiable authorship record that demonstrates the text was typed by a person rather than generated or pasted by AI.',
  },
  {
    question: 'Does By My Own Hand block AI-generated text?',
    answer:
      'The writing environment blocks external pasting and drag-and-drop, so every character must be typed in the editor. Blocked paste attempts are counted and shown on the verification page, and the keystroke trace can be replayed to see the document being composed.',
  },
  {
    question: 'What does the authenticity certificate include?',
    answer:
      'The certificate includes the document title, word count, writing duration, the integrity score derived from your keystroke metrics, and a verification hash linking to a replayable record of the writing session.',
  },
  {
    question: 'Who uses By My Own Hand?',
    answer:
      'Students, educators, journalists, and professionals use By My Own Hand to certify that essays, articles, and applications were written by a human, providing trustworthy proof of authenticity in an era of AI-generated text.',
  },
];

export function faqPageJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: WRITE_FAQ.map(({ question, answer }) => ({
      '@type': 'Question',
      name: question,
      acceptedAnswer: { '@type': 'Answer', text: answer },
    })),
  };
}

// The WebSite node the feed/index describes. `/` and `/write` use the root
// defaults; `/blog` passes its own blog-scoped name, URL, and description.
export function websiteJsonLd(
  name: string = 'By My Own Hand',
  url: string = getSiteUrl(),
  description: string = 'Prove your writing is authentically human — keystroke by keystroke. A lockdown editor captures every keystroke, blocks external paste, and produces a shareable proof of authorship.',
) {
  const siteUrl = getSiteUrl();
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    // Stable node id (the site's own URL + `#website` anchor) so the entity is
    // addressable within the page graph — the counterpart to the Organization
    // `@id` above. `/blog` passes its own `url`, so its WebSite is a distinct
    // `${siteUrl}/blog/#website` entity from the marketing root's.
    '@id': `${url}/#website`,
    name,
    url,
    // A short description for the site/blog entity, so search engines have
    // entity-level context rather than only a name and URL — the same enrichment
    // the Organization node already carries. `/` and `/write` describe the
    // product; `/blog` overrides with its own blog-scoped description so the
    // WebSite entity there reads as the blog, not the marketing site. Additive,
    // zero-risk discovery-enrichment sibling of the Organization `description`.
    description,
    // Declare the site's primary language so search engines have an explicit
    // language signal for the entity instead of inferring it from the page.
    // Matches the document's own `<html lang="en">` / `openGraph.locale`
    // (`en_US`) and the JSON Feed's `language` field. Additive, zero-risk
    // enrichment that lands on all three surfaces (`/`, `/write`, `/blog`) in
    // one edit — discovery-enrichment sibling of the Organization `founder` /
    // `description` additions.
    inLanguage: 'en-US',
    // Connect the site to its publishing organization by reference. Google's
    // structured-data guidance recommends associating a WebSite with the
    // Organization that publishes it; both nodes are emitted on the same page
    // (`/`, `/write`, `/blog`), so the `@id` reference resolves within the merged
    // page graph rather than restating the whole Organization object here.
    publisher: { '@id': `${siteUrl}/#organization` },
  };
}
