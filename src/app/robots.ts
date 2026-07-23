import type { MetadataRoute } from 'next';
import { getSiteUrl } from '@/lib/site';

// Generated robots.txt that resolves the sitemap URL through the same
// NEXT_PUBLIC_SITE_URL helper as everything else, so staging and custom
// domains advertise their own sitemap rather than the production one.
export default function robots(): MetadataRoute.Robots {
  const base = getSiteUrl();
  // Disallow /success/ — it's a transient post-submission page that reads the
  // writing session from sessionStorage. A crawler has no sessionStorage, so a
  // cold load client-redirects to /verify/<hash> (the canonical, shareable
  // proof page). Indexing /success/<hash> therefore produces a soft-404 /
  // duplicate of /verify and wastes crawl budget — the same crawl-budget
  // honesty principle behind the sitemap freshness fixes. /verify/<hash> stays
  // crawlable because it's the public proof surface the embed flywheel targets.
  //
  // Also disallow /api/documents/ — the raw GET /api/documents/<hash> JSON is
  // what /verify/<hash> proxies into; a JS-rendering crawler can surface it as
  // a discovered URL, and indexing that JSON is a soft-duplicate of the proof
  // page that wastes crawl budget on a payload no reader should land on. Same
  // principle as the /success/ rule. /api/blog/feed.json stays crawlable — it's
  // a discovery surface (the JSON Feed) we *want* found.
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/success/', '/api/documents/'] }],
    // Declare the site's canonical host. Crawlers that honor the `Host`
    // directive (Yandex most notably) use it to pick one preferred mirror when
    // the same content is reachable on multiple hostnames (apex vs. www, a
    // Vercel preview domain vs. the production domain), consolidating ranking
    // signals onto it instead of splitting them. Resolved through the same
    // `getSiteUrl()` helper as the sitemap so staging and custom domains
    // advertise *their own* host rather than production's, and emitted as the
    // bare hostname (the form the directive expects) rather than the full URL.
    // Additive, zero-risk discovery hint in the same crawl-honesty spirit as the
    // /success + /api/documents disallows and the sitemap freshness fixes.
    host: new URL(base).host,
    sitemap: `${base}/sitemap.xml`,
  };
}
