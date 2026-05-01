import type { MetadataRoute } from 'next';
import { getAllPosts } from '@/lib/blog';
import { getSiteUrl } from '@/lib/site';

// Next.js auto-mounts this at /sitemap.xml. robots.txt has been pointing at
// that URL, but until now the route 404'd — so search engines couldn't
// discover the 44+ blog posts or the marketing surfaces.
export default function sitemap(): MetadataRoute.Sitemap {
  const base = getSiteUrl();
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/write`, lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${base}/blog`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
  ];

  const postEntries: MetadataRoute.Sitemap = getAllPosts().map(post => {
    const lastModified = post.date ? new Date(post.date) : now;
    return {
      url: `${base}/blog/${post.slug}`,
      lastModified: isNaN(lastModified.getTime()) ? now : lastModified,
      changeFrequency: 'yearly',
      priority: 0.6,
    };
  });

  return [...staticEntries, ...postEntries];
}
