import { getAllPosts, getPostBySlug, getRelatedPosts, visibleTags } from '@/lib/blog';
import { getSiteUrl } from '@/lib/site';
import { SHARE_IMAGE_PATH, ogShareImages } from '@/lib/share';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';

export const dynamicParams = true;

export async function generateStaticParams() {
  return getAllPosts().map(post => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return { title: 'Post not found' };

  // Honor the post's frontmatter `author` rather than hard-coding the site
  // name — parsePost() already extracts it, and the JSON Feed has used it
  // since the §6.17 polish. OG metadata was the last surface still flattening
  // every post to a single house byline.
  const authorName = post.author || 'By My Own Hand';
  const canonicalPath = `/blog/${post.slug}`;
  return {
    title: `${post.title} | By My Own Hand Blog`,
    description: post.excerpt,
    // Self-referential canonical. The root layout declares
    // `alternates: { canonical: "/" }`, and Next.js *inherits* a parent's
    // `alternates` into any child route that doesn't set its own — so every one
    // of the 44+ blog posts was emitting `<link rel="canonical" href=".../">`,
    // telling search engines each post is a duplicate of the homepage and
    // suppressing its own indexing. Point the canonical at the post's own URL.
    // Resolved against `metadataBase`. Same SEO-honesty lineage as the §6.14–
    // §6.18 JSON-LD/URL sweeps — make the discovery surface honest.
    alternates: { canonical: canonicalPath },
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: 'article',
      // og:url should be the page's own canonical URL, not the inherited root.
      url: canonicalPath,
      publishedTime: post.date,
      authors: [authorName],
      tags: post.tags,
      // Next.js replaces (does not deep-merge) the parent `openGraph` when a
      // route defines its own, so without this the per-post share card would be
      // the one surface left image-less after the root default-image fix. Keep
      // the same default image so blog-post shares render a card like the rest
      // of the site.
      images: ogShareImages(post.title),
    },
    // Per-post Twitter card. The root layout sets a generic `twitter` block
    // (title "By My Own Hand", site description), and — like `alternates` —
    // Next.js inherits it into any route that doesn't override it. X/Twitter
    // prefers `twitter:*` tags over `og:*`, so every blog-post share rendered
    // the generic site title/description instead of the post's, even though the
    // per-post `openGraph` above is correct. Mirror the post's real title,
    // excerpt, and image so the X card matches the OG card.
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.excerpt,
      images: [SHARE_IMAGE_PATH],
    },
  };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  const related = getRelatedPosts(slug, post.tags, 3);
  const filteredTags = visibleTags(post.tags);

  // JSON-LD honesty pass, in the same shape as the §6.14–§6.17 sweep on
  // `/`, `/write`, and `/blog`:
  //   - `publisher.logo.url` must be an absolute URL (a relative `/logo.svg`
  //     is invalid in a JSON-LD context and gets dropped by stricter parsers);
  //   - `author` honors the post's frontmatter `author` (and is typed as a
  //     Person when present, Organization for the house byline) — the feed
  //     was already doing this; the page schema was the last surface to flatten
  //     every post to "By My Own Hand";
  //   - `dateModified` is required by Google for the Article rich result;
  //     posts here are static, so it mirrors `datePublished`;
  //   - `mainEntityOfPage` and `image` round out the rich-result requirements.
  const siteUrl = getSiteUrl();
  const postUrl = `${siteUrl}/blog/${post.slug}`;
  // Google's structured-data image guidelines accept raster formats (.jpg,
  // .png, .gif, .webp) but not SVG, for both the Article `image` field and the
  // publisher `logo`. The site previously pointed both at `/logo.svg`, so
  // Google dropped them and the post couldn't qualify for the Article rich
  // result. Use the raster `/icon-512x512.png` — the same image the OG/Twitter
  // cards already ship — so the structured data is eligible and consistent with
  // every other share surface. Surface-honesty fix in the §6.14–§6.18 lineage.
  const imageUrl = `${siteUrl}/icon-512x512.png`;
  const author = post.author
    ? { '@type': 'Person', name: post.author }
    : { '@type': 'Organization', name: 'By My Own Hand' };
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    datePublished: post.date,
    dateModified: post.date,
    description: post.excerpt,
    keywords: post.tags.join(', '),
    mainEntityOfPage: { '@type': 'WebPage', '@id': postUrl },
    image: imageUrl,
    author,
    publisher: {
      '@type': 'Organization',
      name: 'By My Own Hand',
      logo: { '@type': 'ImageObject', url: imageUrl },
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* ── Post Header ── */}
      <header className="blog-hero px-6 md:px-12 pt-12 pb-16 md:pt-16 md:pb-20">
        <div className="max-w-3xl mx-auto">
          <nav className="flex items-center gap-2 text-sm text-cream/40 mb-8 animate-fade-in-up">
            <Link href="/blog" className="hover:text-cream/70 transition-colors">Blog</Link>
            <span>/</span>
            <span className="text-cream/60 truncate max-w-[300px]">{post.title}</span>
          </nav>

          <div className="flex flex-wrap gap-2 mb-4 animate-fade-in-up animate-delay-100">
            {filteredTags.slice(0, 4).map(tag => (
              <span key={tag} className="blog-tag blog-tag-light">{tag}</span>
            ))}
          </div>

          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-cream mb-6 leading-[1.15] tracking-tight animate-fade-in-up animate-delay-200">
            {post.title}
          </h1>

          <div className="flex items-center gap-4 animate-fade-in-up animate-delay-300">
            <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
              <img src="/logo.svg" alt="" width="20" height="18" style={{ filter: 'brightness(0) invert(1)' }} />
            </div>
            <div>
              <p className="text-sm font-medium text-cream/80">{post.author || 'By My Own Hand'}</p>
              <div className="flex items-center gap-3 text-sm text-cream/40">
                <time dateTime={post.date}>{formatDate(post.date)}</time>
                <span className="w-1 h-1 bg-cream/20 rounded-full" />
                <span>{post.readTime}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ── Article Body ── */}
      <div className="px-6 md:px-12 py-12 md:py-16">
        <article
          className="blog-prose max-w-3xl mx-auto"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />
      </div>

      {/* ── CTA ── */}
      <section className="px-6 md:px-12 pb-12">
        <div className="max-w-3xl mx-auto">
          <div className="bg-gradient-to-br from-deep-blue to-deep-blue/90 rounded-2xl p-8 md:p-12 text-center text-cream">
            <h2 className="text-2xl md:text-3xl font-bold mb-3">Ready to prove your words?</h2>
            <p className="text-cream/60 max-w-md mx-auto mb-6">
              Certify your writing as authentically human. No AI. No shortcuts. Just your own hand.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/write"
                className="inline-flex items-center gap-2 px-8 py-3 bg-cream text-deep-blue font-semibold rounded-full hover:bg-white transition-colors"
              >
                Start Writing
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24">
                  <path d="M5 12H19M19 12L13 6M19 12L13 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
              <Link
                href="/blog"
                className="inline-flex items-center gap-2 px-6 py-3 text-cream/70 hover:text-cream font-medium transition-colors"
              >
                More Articles
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Related Posts ── */}
      {related.length > 0 && (
        <section className="px-6 md:px-12 pb-16">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center gap-4 mb-8">
              <h2 className="text-xl font-bold text-deep-blue">Related Articles</h2>
              <div className="flex-1 h-px bg-gradient-to-r from-deep-blue/10 to-transparent" />
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {related.map(rp => (
                <Link key={rp.slug} href={`/blog/${rp.slug}`} className="blog-card group">
                  <div className="flex flex-wrap gap-2 mb-3">
                    {visibleTags(rp.tags).slice(0, 2).map(tag => (
                      <span key={tag} className="blog-tag blog-tag-blue">{tag}</span>
                    ))}
                    <span className="text-xs text-deep-blue/30">{rp.date}</span>
                  </div>
                  <h3 className="font-semibold text-deep-blue group-hover:text-accent transition-colors leading-snug mb-2">
                    {rp.title}
                  </h3>
                  <p className="text-sm text-deep-blue/50 line-clamp-2">{rp.excerpt}</p>
                </Link>
              ))}
            </div>

            <div className="text-center mt-8">
              <Link href="/blog" className="text-sm font-medium text-accent hover:text-deep-blue transition-colors">
                &larr; Back to all posts
              </Link>
            </div>
          </div>
        </section>
      )}
    </>
  );
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}
