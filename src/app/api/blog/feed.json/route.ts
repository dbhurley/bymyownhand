import { getAllPosts } from '@/lib/blog';
import { NextResponse } from 'next/server';

export async function GET() {
  const posts = getAllPosts();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://bymyownhand.com';

  const feed = {
    version: 'https://jsonfeed.org/version/1.1',
    title: 'By My Own Hand Blog',
    home_page_url: siteUrl,
    feed_url: `${siteUrl}/api/blog/feed.json`,
    description: 'Insights on human authenticity, writing verification, and identity in the age of AI.',
    language: 'en-US',
    items: posts.map(post => ({
      id: `${siteUrl}/blog/${post.slug}`,
      url: `${siteUrl}/blog/${post.slug}`,
      title: post.title,
      content_html: post.content,
      summary: post.excerpt,
      date_published: `${post.date}T00:00:00Z`,
      tags: post.tags,
      authors: [{ name: 'By My Own Hand' }],
    })),
  };

  return NextResponse.json(feed, {
    headers: { 'Cache-Control': 'public, max-age=3600' },
  });
}
