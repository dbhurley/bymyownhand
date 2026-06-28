import { getAllPosts } from '@/lib/blog';
import { getSiteUrl } from '@/lib/site';
import { NextResponse } from 'next/server';

export async function GET() {
  const posts = getAllPosts();
  const siteUrl = getSiteUrl();

  // JSON Feed 1.1 requires `date_published` to be RFC 3339. Posts without a
  // valid date used to emit a literal `"T00:00:00Z"` (no date prefix) which
  // most feed validators reject. Skip those entries instead of emitting a
  // malformed timestamp.
  const items = posts.flatMap(post => {
    if (!post.date) return [];
    const parsed = new Date(`${post.date}T00:00:00Z`);
    if (isNaN(parsed.getTime())) return [];
    return [{
      id: `${siteUrl}/blog/${post.slug}`,
      url: `${siteUrl}/blog/${post.slug}`,
      title: post.title,
      content_html: post.content,
      summary: post.excerpt,
      date_published: parsed.toISOString(),
      tags: post.tags,
      // Honor the post's parsed `author` frontmatter rather than hard-coding
      // the site name — posts carry distinct authors and the feed should
      // reflect them. Falls back to the site name when frontmatter omits it.
      authors: [{ name: post.author || 'By My Own Hand' }],
    }];
  });

  const feed = {
    version: 'https://jsonfeed.org/version/1.1',
    title: 'By My Own Hand Blog',
    // JSON Feed 1.1 defines `home_page_url` as the HTML page the feed
    // *describes* — for a blog feed that's the blog index a reader lands on
    // when they click through from their feed reader, not the marketing root.
    // The feed's title ("…Blog") and `feed_url` (`/api/blog/feed.json`) are
    // already blog-scoped; point the home page at `/blog` to match.
    home_page_url: `${siteUrl}/blog`,
    feed_url: `${siteUrl}/api/blog/feed.json`,
    description: 'Insights on human authenticity, writing verification, and identity in the age of AI.',
    // JSON Feed 1.1 optional top-level branding: `icon` is the large square
    // image a reader shows next to the feed (the spec suggests 512×512+), and
    // `favicon` the small one (~64px) for compact lists. Both must be absolute
    // URLs. We already ship these raster assets (used by the OG/Twitter cards
    // and the PWA manifest), so advertising them lets a subscribing reader
    // render the feed with our mark instead of a generic placeholder — a small
    // branding win on the discovery surface §6.37 made auto-discoverable.
    icon: `${siteUrl}/icon-512x512.png`,
    favicon: `${siteUrl}/icon-192x192.png`,
    language: 'en-US',
    items,
  };

  return NextResponse.json(feed, {
    // Mirror the edge-caching the /api/documents/[hash] route uses (§6.13): a
    // bare `max-age` caches only in the browser — Vercel's Edge Network caches
    // a Function response only when `s-maxage` (or CDN-Cache-Control) is set.
    // Without it, every feed-reader poll and crawler hit re-runs this route and
    // re-serializes the full feed (every post's `content_html`). The feed only
    // changes when a post is added, so a long edge TTL with stale-while-
    // revalidate keeps it cheap and fresh. The JSON Feed is a discovery surface
    // we deliberately keep crawlable and a Phase 4.1 (opt-in feed) surface.
    headers: {
      // JSON Feed 1.1 specifies `application/feed+json` as the feed's media
      // type; `NextResponse.json` defaults to `application/json`. Feed readers
      // and `<link rel="alternate">` auto-discovery that content-type-sniff
      // rely on the registered type to recognize this as a subscribable feed
      // rather than a generic JSON document. Feed-correctness sibling of the
      // §6.33 `home_page_url` and §6.12 `date_published` fixes.
      'Content-Type': 'application/feed+json; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
