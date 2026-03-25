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

function stripFrontmatter(raw: string): { body: string; title: string; date: string; excerpt: string; tags: string[] } {
  let body = raw;
  let title = '';
  let date = '';
  let excerpt = '';
  let tags: string[] = [];
  
  if (raw.startsWith('---')) {
    const end = raw.indexOf('\n---', 3);
    if (end !== -1) {
      const fm = raw.slice(4, end);
      body = raw.slice(end + 4).trim();
      const titleMatch = fm.match(/^title:\s*"?([^"\n]+)"?/m);
      const dateMatch = fm.match(/^date:\s*"?([^"\n]+)"?/m);
      const excerptMatch = fm.match(/^excerpt:\s*"?([^"\n]+)"?/m);
      const tagsMatch = fm.match(/^tags:\s*\[([^\]]+)\]/m);
      if (titleMatch) title = titleMatch[1].trim();
      if (dateMatch) date = dateMatch[1].trim();
      if (excerptMatch) excerpt = excerptMatch[1].trim();
      if (tagsMatch) tags = tagsMatch[1].split(',').map(t => t.trim().replace(/^"|"$/g, ''));
    }
  }
  return { body, title, date, excerpt, tags };
}

function parsePost(filename: string): BlogPost | null {
  try {
    const raw = fs.readFileSync(path.join(BLOG_DIR, filename), 'utf-8');
    let data: Record<string, unknown> = {};
    let body: string;

    try {
      const parsed = matter(raw);
      data = parsed.data;
      body = parsed.content.trim();
    } catch {
      const fallback = stripFrontmatter(raw);
      body = fallback.body;
      data = { title: fallback.title, date: fallback.date, excerpt: fallback.excerpt, tags: fallback.tags };
    }

    const firstLine = body.split('\n')[0];
    if (firstLine?.startsWith('# ') && data['title'] && firstLine.includes(String(data['title']))) {
      body = body.split('\n').slice(1).join('\n').trim();
    }

    const html = marked.parse(body) as string;
    const wordCount = body.split(/\s+/).length;
    const slugMatch = filename.match(/^\d{4}-\d{2}-\d{2}-(.+)\.md$/);
    const slug = slugMatch ? slugMatch[1] : filename.replace('.md', '');

    return {
      slug,
      title: String(data['title'] || slug.replace(/-/g, ' ')),
      date: String(data['date'] || ''),
      excerpt: String(data['excerpt'] || ''),
      tags: Array.isArray(data['tags']) ? data['tags'].map(String) : [],
      content: html,
      readTime: `${Math.max(1, Math.ceil(wordCount / 250))} min read`,
    };
  } catch {
    return null;
  }
}

export function getAllPosts(): BlogPost[] {
  if (!fs.existsSync(BLOG_DIR)) return [];
  const files = fs.readdirSync(BLOG_DIR).filter(f => f.endsWith('.md'));
  const posts = files.map(parsePost).filter((p): p is BlogPost => p !== null);
  posts.sort((a, b) => b.date.localeCompare(a.date));
  return posts;
}

export function getPostBySlug(slug: string): BlogPost | null {
  return getAllPosts().find(p => p.slug === slug) || null;
}
