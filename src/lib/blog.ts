import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { marked } from 'marked';
import { countWords } from './metrics';

export interface BlogPost {
  slug: string;
  title: string;
  date: string;
  excerpt: string;
  tags: string[];
  content: string;
  readTime: string;
  author?: string;
}

export interface BlogCategory {
  name: string;
  slug: string;
  color: string;
  keywords: string[];
  posts: BlogPost[];
}

export interface TagCount {
  tag: string;
  count: number;
}

const BLOG_DIR = path.join(process.cwd(), 'blog');

const CATEGORY_MAP = [
  {
    name: 'Identity & Authentication',
    slug: 'identity',
    color: 'blue',
    keywords: ['identity', 'authentication', 'biometric', 'passkey', 'identity verification'],
  },
  {
    name: 'AI & Human Oversight',
    slug: 'ai',
    color: 'amber',
    keywords: ['ai', 'human oversight', 'human judgment', 'human touch', 'ai ethics', 'constitutional', 'reasoning', 'ai security'],
  },
  {
    name: 'Security & Compliance',
    slug: 'security',
    color: 'rose',
    keywords: ['cyber', 'security', 'compliance', 'regulation', 'supply chain', 'fraud', 'attack', 'oauth'],
  },
  {
    name: 'Technology & Innovation',
    slug: 'technology',
    color: 'emerald',
    keywords: ['blockchain', 'api', 'digital transformation', 'standards', 'technology', 'git'],
  },
  {
    name: 'Strategy & Industry',
    slug: 'strategy',
    color: 'violet',
    keywords: ['business', 'competitive', 'strategy', 'trends', 'skills gap', 'remote work', 'imperative'],
  },
];

// Tags that are noise on a writing-authenticity blog (project meta / stack
// detail) — hidden from category indexes, post chips, and related-post chips.
// Single source of truth for the rule; previously the page also filtered
// inline with a case-sensitive `['ByMyOwnHand', 'Next.js']` array, which
// missed lowercase variants and was drift-prone.
const FILTERED_TAGS = new Set(['bymyownhand', 'next.js']);

export function isVisibleTag(tag: string): boolean {
  return !FILTERED_TAGS.has(tag.toLowerCase());
}

export function visibleTags(tags: string[]): string[] {
  return tags.filter(isVisibleTag);
}

function stripFrontmatter(raw: string): { body: string; title: string; date: string; excerpt: string; tags: string[]; author: string } {
  let body = raw;
  let title = '';
  let date = '';
  let excerpt = '';
  let tags: string[] = [];
  let author = '';

  if (raw.startsWith('---')) {
    const end = raw.indexOf('\n---', 3);
    if (end !== -1) {
      const fm = raw.slice(4, end);
      body = raw.slice(end + 4).trim();
      const titleMatch = fm.match(/^title:\s*"?([^"\n]+)"?/m);
      const dateMatch = fm.match(/^date:\s*"?([^"\n]+)"?/m);
      const excerptMatch = fm.match(/^excerpt:\s*"?([^"\n]+)"?/m);
      const tagsMatch = fm.match(/^tags:\s*\[([^\]]+)\]/m);
      const authorMatch = fm.match(/^author:\s*"?([^"\n]+)"?/m);
      if (titleMatch) title = titleMatch[1].trim();
      if (dateMatch) date = dateMatch[1].trim();
      if (excerptMatch) excerpt = excerptMatch[1].trim();
      if (tagsMatch) tags = tagsMatch[1].split(',').map(t => t.trim().replace(/^"|"$/g, ''));
      if (authorMatch) author = authorMatch[1].trim();
    }
  }
  return { body, title, date, excerpt, tags, author };
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
      data = { title: fallback.title, date: fallback.date, excerpt: fallback.excerpt, tags: fallback.tags, author: fallback.author };
    }

    const firstLine = body.split('\n')[0];
    if (firstLine?.startsWith('# ') && data['title'] && firstLine.includes(String(data['title']))) {
      body = body.split('\n').slice(1).join('\n').trim();
    }

    const html = marked.parse(body) as string;
    // Use the shared word-counting contract (trim + collapse whitespace + drop
    // empty tokens) rather than a bespoke regex so blog read-time and the
    // editor's 10-word certification gate stay in lockstep.
    const wordCount = countWords(body);
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
      author: String(data['author'] || ''),
    };
  } catch {
    return null;
  }
}

// Memoized in module scope. Blog posts are markdown files on disk that don't
// change at runtime, but `getAllPosts()` is called from sitemap, feed,
// categories, tags, related-posts, and both blog pages — without caching, a
// single `/blog/[slug]` render re-reads and re-parses all 44+ posts several
// times. Module-scope cache makes subsequent calls free.
let cachedPosts: BlogPost[] | null = null;

export function getAllPosts(): BlogPost[] {
  if (cachedPosts) return cachedPosts;
  if (!fs.existsSync(BLOG_DIR)) return [];
  const files = fs.readdirSync(BLOG_DIR).filter(f => f.endsWith('.md') && f !== 'README.md');
  const posts = files.map(parsePost).filter((p): p is BlogPost => p !== null);
  // Newest-first, with a slug tiebreaker so posts that share a date have a
  // stable, deterministic order. 14 of the corpus dates carry two posts, and
  // `readdirSync` does not guarantee a sorted order — so without the tiebreaker
  // the relative order of same-date posts could differ across machines and
  // deployments, drifting the blog index, the sitemap entry order, and
  // `getFeaturedPost()` (`posts[0]`) whenever the newest date is itself shared.
  // The tiebreaker pins it to the slug. Determinism sibling of the sitemap
  // freshness-honesty fixes — a stable surface for crawlers to re-fetch.
  posts.sort((a, b) => b.date.localeCompare(a.date) || a.slug.localeCompare(b.slug));
  cachedPosts = posts;
  return posts;
}

export function getPostBySlug(slug: string): BlogPost | null {
  return getAllPosts().find(p => p.slug === slug) || null;
}

export function getFeaturedPost(): BlogPost | null {
  const posts = getAllPosts();
  return posts[0] || null;
}

export function getRelatedPosts(currentSlug: string, tags: string[], limit: number = 3): BlogPost[] {
  const posts = getAllPosts().filter(p => p.slug !== currentSlug);
  // Score relatedness on *visible* tags only. The corpus tags nearly every post
  // with the same project-meta boilerplate ("Next.js", "ByMyOwnHand") — the
  // exact set `isVisibleTag()` already hides from the tag cloud and the post
  // chips. Left in the scoring, those shared meta tags award a +3 exact-match
  // between almost every pair of posts, swamping the genuine topical overlap
  // (also +3) and surfacing subject-unrelated posts under "Related Articles."
  // Filtering them out before scoring makes relatedness reflect the
  // subject-matter tags a reader actually cares about. Correctness fix in the
  // same fabricated-relevance lineage as the §6.28 word-boundary partial-match
  // fix and the §6.30 zero-overlap-tail filter — those cleaned the noisy middle
  // and the empty tail; this removes the boilerplate tags that dominated the top.
  const currentTagsLower = visibleTags(tags).map(t => t.toLowerCase());

  const scored = posts.map(post => {
    const postTagsLower = visibleTags(post.tags).map(t => t.toLowerCase());
    let score = 0;
    for (const ct of currentTagsLower) {
      for (const pt of postTagsLower) {
        if (ct === pt) {
          score += 3;
        } else if (ct && pt && (matchesKeyword(ct, pt) || matchesKeyword(pt, ct))) {
          // Word-boundary partial match rather than a bare `includes()`. The
          // substring form awarded a relevance point for unrelated fragments —
          // "ai" inside "email" / "available", "git" inside "digital" — the
          // same substring-pollution class the §6.27 getCategories() fix
          // addressed, here inflating the related-posts list (a blog-discovery
          // surface) with noise. Word boundaries keep genuine partials intact
          // ("ai" ↔ "ai-ethics", "api" ↔ "api-first", where the hyphen is a
          // boundary) while dropping the false matches. Reuses the same
          // matchesKeyword() helper, so the two surfaces share one definition.
          score += 1;
        }
      }
    }
    return { post, score };
  });

  // Only return posts with a real tag relationship. `slice(0, limit)` on the
  // full sorted list returned `limit` posts unconditionally, so a post whose
  // tags overlapped *nothing* still surfaced three "Related Articles" — the
  // same fabricated-relevance class the §6.28 word-boundary partial-match fix
  // set out to shrink, just at the zero-overlap tail rather than the noisy
  // partial-match middle. The blog-post page already renders the section behind
  // `{related.length > 0 && …}`, so dropping the filler hides the section
  // cleanly rather than showing unrelated posts under a "Related" heading.
  return scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score || b.post.date.localeCompare(a.post.date))
    .slice(0, limit)
    .map(s => s.post);
}

// Match a keyword on word boundaries rather than as a bare substring. A plain
// `includes()` let short keywords pollute their category: "ai" matched
// "email" / "available" / "campaign" / "training", "git" matched "digital" /
// "legitimate", and "api" matched "rapidly" / "capital" — silently filing
// unrelated posts under "AI & Human Oversight" or "Technology & Innovation"
// and degrading the blog discovery surface (a cross-cutting roadmap
// investment). Word boundaries keep multi-word phrase keywords ("identity
// verification", "human oversight") matching intact, since the haystack joins
// tags and title with spaces.
//
// The compiled RegExp is memoized per keyword. `matchesKeyword()` is called in
// nested loops — `getCategories()` tests every category keyword against every
// post, and `getRelatedPosts()` tests tag pairs across every post — so a single
// blog-index render would otherwise recompile the same small set of patterns
// thousands of times. The keyword set is tiny and bounded (the static
// CATEGORY_MAP keywords plus post tags), so the cache can't grow unbounded.
// Efficiency sibling of the `getAllPosts()` memoization and the single-pass
// `calculateMetrics()` classification — keep the hot discovery path cheap.
const keywordRegexCache = new Map<string, RegExp>();

function keywordRegex(keyword: string): RegExp {
  let re = keywordRegexCache.get(keyword);
  if (!re) {
    const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    re = new RegExp(`\\b${escaped}\\b`);
    keywordRegexCache.set(keyword, re);
  }
  return re;
}

function matchesKeyword(haystack: string, keyword: string): boolean {
  return keywordRegex(keyword).test(haystack);
}

export function getCategories(): BlogCategory[] {
  const posts = getAllPosts();

  // Build each post's lowercased "tags + title" haystack once, then test every
  // category against the precomputed string. Previously the haystack was rebuilt
  // inside the inner `posts.filter` callback, so for N posts and the 5 static
  // CATEGORY_MAP entries it was lowercased and re-joined 5×N times on every
  // `/blog` render. Hoisting it out is a single pass over the corpus regardless
  // of category count. Efficiency sibling of the `getAllPosts()` memoization and
  // the keyword-regex memoization — keep the blog-discovery hot path cheap.
  const haystacks = posts.map(post => ({
    post,
    haystack: post.tags.map(t => t.toLowerCase()).join(' ') + ' ' + post.title.toLowerCase(),
  }));

  return CATEGORY_MAP.map(cat => {
    const catPosts = haystacks
      .filter(({ haystack }) => cat.keywords.some(kw => matchesKeyword(haystack, kw)))
      .map(({ post }) => post);
    return { ...cat, posts: catPosts };
  }).filter(cat => cat.posts.length > 0);
}

export function getAllTags(): TagCount[] {
  const posts = getAllPosts();

  // Aggregate tags case-insensitively. The corpus tags the same topic with
  // mixed casing across posts ("Compliance"/"compliance", "AI Transparency"/
  // "AI transparency", "Authenticity Verification"/"authenticity verification"),
  // and the old map keyed on the raw string — so each variant became its own
  // "Popular Topics" chip with a split count, double-listing the topic and
  // potentially pushing a genuinely-popular tag out of the top 15. The category
  // classifier (getCategories) and the related-posts scorer already lowercase
  // before matching; this brings the tag cloud — the third blog-discovery
  // surface — onto the same case-insensitive footing (the §6.27/§6.28/§6.34
  // tag-precision lineage). Each bucket keeps the most-frequent original casing
  // for display (first-seen wins ties), so a chip still reads naturally.
  const buckets = new Map<string, { count: number; displays: Map<string, number> }>();

  for (const post of posts) {
    for (const tag of post.tags) {
      if (!isVisibleTag(tag)) continue;
      const key = tag.toLowerCase();
      let bucket = buckets.get(key);
      if (!bucket) {
        bucket = { count: 0, displays: new Map() };
        buckets.set(key, bucket);
      }
      bucket.count += 1;
      bucket.displays.set(tag, (bucket.displays.get(tag) || 0) + 1);
    }
  }

  return Array.from(buckets.values())
    .map(({ count, displays }) => {
      let tag = '';
      let best = -1;
      for (const [display, n] of displays) {
        if (n > best) {
          best = n;
          tag = display;
        }
      }
      return { tag, count };
    })
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}
