import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { marked } from 'marked';

export interface BlogPost {
  slug: string;
  title: string;
  date: string;
  excerpt: string;
  tags: string[];
  content: string;
  readTime: string;
}

const BLOG_DIR = path.join(process.cwd(), 'blog');

export function getAllPosts(): BlogPost[] {
  if (!fs.existsSync(BLOG_DIR)) return [];
  const files = fs.readdirSync(BLOG_DIR).filter(f => f.endsWith('.md'));
  const posts = files.map(filename => {
    const raw = fs.readFileSync(path.join(BLOG_DIR, filename), 'utf-8');
    const { data, content } = matter(raw);
    let body = content.trim();
    const firstLine = body.split('\n')[0];
    if (firstLine?.startsWith('# ') && data.title && firstLine.includes(data.title)) {
      body = body.split('\n').slice(1).join('\n').trim();
    }
    const html = marked.parse(body) as string;
    const wordCount = body.split(/\s+/).length;
    const readTime = `${Math.max(1, Math.ceil(wordCount / 250))} min read`;
    const slugMatch = filename.match(/^\d{4}-\d{2}-\d{2}-(.+)\.md$/);
    const slug = slugMatch ? slugMatch[1] : filename.replace('.md', '');
    return {
      slug,
      title: data.title || slug.replace(/-/g, ' '),
      date: data.date || '',
      excerpt: data.excerpt || data.seo?.description || '',
      tags: data.tags || [],
      content: html,
      readTime,
    };
  });
  posts.sort((a, b) => b.date.localeCompare(a.date));
  return posts;
}

export function getPostBySlug(slug: string): BlogPost | null {
  return getAllPosts().find(p => p.slug === slug) || null;
}
