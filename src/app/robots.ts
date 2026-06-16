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
    sitemap: `${base}/sitemap.xml`,
  };
}
