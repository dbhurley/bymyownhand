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
    language: 'en-US',
    items,
  };

  return NextResponse.json(feed, {
    headers: { 'Cache-Control': 'public, max-age=3600' },
  });
}
