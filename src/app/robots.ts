import type { MetadataRoute } from 'next';
import { getSiteUrl } from '@/lib/site';

// Generated robots.txt that resolves the sitemap URL through the same
// NEXT_PUBLIC_SITE_URL helper as everything else, so staging and custom
// domains advertise their own sitemap rather than the production one.
export default function robots(): MetadataRoute.Robots {
  const base = getSiteUrl();
  return {
    rules: [{ userAgent: '*', allow: '/' }],
    sitemap: `${base}/sitemap.xml`,
  };
}
