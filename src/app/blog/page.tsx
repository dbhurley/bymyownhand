import Link from 'next/link';
import { getAllPosts, getFeaturedPost, getCategories, getAllTags, visibleTags } from '@/lib/blog';
import { formatPostDate } from '@/lib/date';
import { getSiteUrl } from '@/lib/site';
import { organizationJsonLd, websiteJsonLd } from '@/lib/structuredData';
import { ogShareImages, twitterShareImages } from '@/lib/share';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Blog | By My Own Hand',
  description: 'Insights on human authenticity, writing verification, identity, and the future of trust in a world of AI-generated content.',
  // Self-referential canonical. The root layout sets `alternates: { canonical:
  // "/" }`, which Next.js inherits into any route that doesn't override it — so
  // the blog index was declaring the homepage as its canonical URL, suppressing
  // its own indexing. Point it at `/blog`. (The per-post pages carry their own.)
  alternates: { canonical: '/blog' },
  openGraph: {
    title: 'Blog — Written by Hand, Read by All',
    description: 'Exploring authenticity, identity verification, and why human writing still matters in the age of AI.',
    url: '/blog',
    type: 'website',
    // Next.js *replaces* (does not deep-merge) the parent `openGraph` when a
    // route sets its own, so declaring `openGraph` here dropped the root's
    // default share image and left the blog-index card image-less — the same
    // §6.28 gap fixed for the per-post pages. Restore the default image.
    images: ogShareImages('By My Own Hand Blog'),
  },
  // Give the index its own Twitter card so X shows the blog title/description
  // (and an image) rather than the generic inherited site card.
  twitter: {
    card: 'summary_large_image',
    title: 'Blog — Written by Hand, Read by All',
    description: 'Exploring authenticity, identity verification, and why human writing still matters in the age of AI.',
    images: twitterShareImages('By My Own Hand Blog'),
  },
};

const CATEGORY_HEX: Record<string, string> = {
  blue: '#2563eb',
  amber: '#d97706',
  rose: '#e11d48',
  emerald: '#059669',
  violet: '#7c3aed',
};

export default function BlogPage() {
  const featured = getFeaturedPost();
  const categories = getCategories();
  const tags = getAllTags();
  const allPosts = getAllPosts();
  const siteUrl = getSiteUrl();

  return (
    <>
      {/* ── Hero ── */}
      <section className="blog-hero px-6 md:px-12 pt-16 pb-24 md:pt-20 md:pb-32">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center gap-12 md:gap-16">
            <div className="flex-1 text-center md:text-left">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/10 rounded-full border border-white/10 mb-6 animate-fade-in-up">
                <span className="w-2 h-2 bg-success rounded-full animate-pulse" />
                <span className="text-sm text-cream/70">The human side of digital writing</span>
              </div>

              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-cream mb-4 leading-[1.1] tracking-tight animate-fade-in-up animate-delay-100">
                Written by Hand,
                <br />
                <span className="text-accent">Read by All</span>
              </h1>

              <p className="text-lg text-cream/60 max-w-lg mb-8 leading-relaxed animate-fade-in-up animate-delay-200">
                Exploring authenticity, identity verification, and why human writing
                still matters in the age of artificial intelligence.
              </p>

              <div className="flex items-center justify-center md:justify-start gap-6 text-sm text-cream/40 animate-fade-in-up animate-delay-300">
                <span>
                  <strong className="text-cream/80">{allPosts.length}</strong> articles
                </span>
                <span className="w-1 h-1 bg-cream/20 rounded-full" />
                <span>
                  <strong className="text-cream/80">{categories.length}</strong> topics
                </span>
                <span className="w-1 h-1 bg-cream/20 rounded-full" />
                <span>100% human-written</span>
              </div>
            </div>

            <div className="flex-shrink-0 hidden md:block animate-fade-in-up animate-delay-200">
              <div className="relative">
                <div className="absolute inset-0 bg-accent/20 rounded-full blur-3xl scale-150" />
                <img
                  src="/logo.svg"
                  alt=""
                  width="180"
                  height="160"
                  className="relative block animate-float opacity-[0.12]"
                  style={{ filter: 'brightness(0) invert(1)' }}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Featured Post ── */}
      {featured && (
        <section className="px-6 md:px-12 -mt-12 mb-12 relative z-10">
          <div className="max-w-6xl mx-auto">
            <Link href={`/blog/${featured.slug}`} className="blog-card-featured group">
              <div className="flex flex-col md:flex-row md:items-center gap-6">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="blog-tag blog-tag-light">Latest</span>
                    <time dateTime={featured.date} className="text-sm text-cream/40">{formatPostDate(featured.date, 'short')}</time>
                    <span className="text-sm text-cream/40">{featured.readTime}</span>
                  </div>
                  <h2 className="text-2xl md:text-3xl font-bold text-cream mb-3 group-hover:text-accent transition-colors leading-tight">
                    {featured.title}
                  </h2>
                  <p className="text-cream/60 leading-relaxed line-clamp-2 mb-4">
                    {featured.excerpt}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {visibleTags(featured.tags).slice(0, 3).map(tag => (
                      <span key={tag} className="blog-tag blog-tag-light">{tag}</span>
                    ))}
                  </div>
                </div>
                <div className="hidden md:flex items-center justify-center w-16 h-16 rounded-full border border-cream/20 flex-shrink-0 group-hover:border-accent/50 transition-colors">
                  <svg width="24" height="24" fill="none" viewBox="0 0 24 24" className="text-cream/60 group-hover:text-accent transition-colors">
                    <path d="M5 12H19M19 12L13 6M19 12L13 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </div>
            </Link>
          </div>
        </section>
      )}

      {/* JSON-LD structured data. Rendered unconditionally — these blocks used
          to be nested inside the {featured && (...)} section, so a /blog crawl
          with no featured post emitted no structured data at all. URLs now
          resolve through getSiteUrl() instead of a hard-coded production
          domain, and the broken /images/logo.png path is replaced with the
          real /logo.svg. The fake `SearchAction` (target /blog?s=... — a route
          this site has no search UI for) and the `Article` block (wrong type
          for an index page, carrying a permanent 2024-01-01 freshness lie and
          a doubled headline) are dropped — same honesty fixes already applied
          to the / and /write JSON-LD. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd()) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd('By My Own Hand Blog', `${siteUrl}/blog`, 'Insights on human authenticity, writing verification, and identity in the age of AI.')) }}
      />

      {/* ── Main Content + Sidebar ── */}
      <section className="px-6 md:px-12 pb-16">
        <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-12">
          {/* Main Column */}
          <div className="flex-1 min-w-0">
            {categories.map(category => (
              <div key={category.slug} className="mb-16">
                <div className="flex items-center gap-3 mb-6">
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: CATEGORY_HEX[category.color] }}
                  />
                  <h2 className="text-xl font-bold text-deep-blue">{category.name}</h2>
                  <span className="text-xs font-medium text-deep-blue/40 bg-deep-blue/5 px-2.5 py-0.5 rounded-full">
                    {category.posts.length}
                  </span>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  {category.posts.slice(0, 4).map(post => (
                    <Link key={post.slug} href={`/blog/${post.slug}`} className="blog-card group">
                      <div className="flex flex-wrap gap-2 mb-3">
                        {visibleTags(post.tags).slice(0, 2).map(tag => (
                          <span key={tag} className={`blog-tag blog-tag-${category.color}`}>{tag}</span>
                        ))}
                        {/* Render the frontmatter date through the shared helper
                            (matching the featured card and the post header) rather
                            than the raw `YYYY-MM-DD` — a machine-looking value out
                            of step with the formatted date shown elsewhere on the
                            same page. Wrap in <time> for machine-readable semantics
                            like the post header does. */}
                        <time dateTime={post.date} className="text-xs text-deep-blue/30">{formatPostDate(post.date, 'short')}</time>
                      </div>
                      <h3 className="text-lg font-semibold text-deep-blue mb-2 group-hover:text-accent transition-colors leading-snug">
                        {post.title}
                      </h3>
                      <p className="text-sm text-deep-blue/50 leading-relaxed line-clamp-2">
                        {post.excerpt}
                      </p>
                      <div className="flex items-center gap-1 mt-3 text-sm text-accent font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                        <span>Read more</span>
                        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" className="group-hover:translate-x-1 transition-transform">
                          <path d="M5 12H19M19 12L13 6M19 12L13 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Sidebar */}
          <aside className="w-full lg:w-80 flex-shrink-0 space-y-6">
            {/* About */}
            <div className="blog-sidebar-card">
              <h3 className="text-sm font-semibold text-deep-blue/40 uppercase tracking-widest mb-3">About This Blog</h3>
              <p className="text-sm text-deep-blue/60 leading-relaxed">
                In a world where AI can write anything, we explore what it means to write
                by your own hand. Identity, authenticity, and the future of human expression.
              </p>
            </div>

            {/* Popular Tags */}
            <div className="blog-sidebar-card">
              <h3 className="text-sm font-semibold text-deep-blue/40 uppercase tracking-widest mb-4">Popular Topics</h3>
              <div className="flex flex-wrap gap-2">
                {tags.slice(0, 15).map(({ tag, count }) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-deep-blue/5 hover:bg-deep-blue/10 rounded-full text-xs font-medium text-deep-blue/60 transition-colors cursor-default"
                  >
                    {tag}
                    <span className="text-deep-blue/30">{count}</span>
                  </span>
                ))}
              </div>
            </div>

            {/* Categories Quick Nav */}
            <div className="blog-sidebar-card">
              <h3 className="text-sm font-semibold text-deep-blue/40 uppercase tracking-widest mb-4">Categories</h3>
              <div className="space-y-2">
                {categories.map(cat => (
                  <div key={cat.slug} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: CATEGORY_HEX[cat.color] }}
                      />
                      <span className="text-sm text-deep-blue/70">{cat.name}</span>
                    </div>
                    <span className="text-xs text-deep-blue/30">{cat.posts.length}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* CTA */}
            <div className="blog-sidebar-card bg-gradient-to-br from-deep-blue to-deep-blue/90 border-none text-cream">
              <h3 className="font-bold text-lg mb-2">Prove Your Writing</h3>
              <p className="text-sm text-cream/60 mb-4 leading-relaxed">
                Ready to certify your words as authentically human? Start writing and get your verification in minutes.
              </p>
              <Link
                href="/write"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-cream text-deep-blue text-sm font-semibold rounded-full hover:bg-white transition-colors"
              >
                Start Writing
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24">
                  <path d="M5 12H19M19 12L13 6M19 12L13 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}
