import type { MetadataRoute } from 'next';
import { getAllPosts } from '@/lib/blog';
import { getSiteUrl } from '@/lib/site';

// Next.js auto-mounts this at /sitemap.xml. robots.txt has been pointing at
// that URL, but until now the route 404'd — so search engines couldn't
// discover the 44+ blog posts or the marketing surfaces.
export default function sitemap(): MetadataRoute.Sitemap {
  const base = getSiteUrl();
  const now = new Date();
  const posts = getAllPosts();

  // Anchor `/blog`'s lastModified to the most-recent post date so the index's
  // freshness signal reflects when content actually changed. Defaulting to
  // `now` made every crawl re-fetch a page that hadn't changed.
  const latestPostDate = posts.reduce<Date>((latest, post) => {
    if (!post.date) return latest;
    const d = new Date(post.date);
    if (isNaN(d.getTime())) return latest;
    return d > latest ? d : latest;
  }, new Date(0));
  const contentLastModified = latestPostDate.getTime() > 0 ? latestPostDate : now;

  // Anchor `/` and `/write` to content freshness rather than `now` — the prior
  // revision already corrected this freshness lie for `/blog`, but `/` and
  // `/write` were still emitting `now` on every crawl. The homepage features
  // the blog and the recently-certified surface, so its meaningful freshness
  // signal is the latest blog post date. `/write` is a stable editor surface
  // — its content rarely changes — so anchoring it to the latest post date is
  // a conservative under-promise that still falls back to the real "site has
  // new content" cadence. Search engines now spend crawl budget when the site
  // actually changed instead of re-fetching unchanged surfaces every visit.
  const staticEntries: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: contentLastModified, changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/write`, lastModified: contentLastModified, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${base}/blog`, lastModified: contentLastModified, changeFrequency: 'weekly', priority: 0.8 },
  ];

  // Skip posts whose date is missing or unparseable rather than advertising
  // `lastModified=now` for them. That fallback is the same freshness lie we
  // just fixed for `/blog`: it spends crawl budget on a page whose content
  // didn't actually change. Better to omit the entry than to mislead crawlers.
  const postEntries: MetadataRoute.Sitemap = posts.flatMap(post => {
    if (!post.date) return [];
    const lastModified = new Date(post.date);
    if (isNaN(lastModified.getTime())) return [];
    return [{
      url: `${base}/blog/${post.slug}`,
      lastModified,
      changeFrequency: 'yearly' as const,
      priority: 0.6,
    }];
  });

  return [...staticEntries, ...postEntries];
}
