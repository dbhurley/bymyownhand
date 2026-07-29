import Link from 'next/link';
import { organizationJsonLd, websiteJsonLd, webApplicationJsonLd } from '@/lib/structuredData';
import { YourProofs } from '@/components/YourProofs';
import { UnfinishedDraft } from '@/components/UnfinishedDraft';

export default function Home() {
  return (
    <div className="fixed inset-0 overflow-y-auto overflow-x-hidden bg-cream">
      {/* Navigation */}
      <nav className="relative flex items-center justify-between max-w-3xl mx-auto px-6 py-8">
        <div className="flex items-center gap-3">
          <img src="/logo.svg" alt="By My Own Hand" width="28" height="25" className="block" />
          <span className="text-lg font-semibold text-deep-blue tracking-tight">By My Own Hand</span>
        </div>
        <div className="flex items-center gap-6">
          <Link href="/blog" className="text-sm text-deep-blue/40 hover:text-deep-blue transition-colors hidden sm:inline">
            Blog
          </Link>
          <Link
            href="/write"
            className="group flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-deep-blue border border-deep-blue/15 rounded-full hover:border-deep-blue hover:bg-deep-blue hover:text-cream transition-all duration-300"
          >
            Start Writing
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="group-hover:translate-x-0.5 transition-transform" aria-hidden="true">
              <path d="M3 8H13M13 8L9 4M13 8L9 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        </div>
      </nav>

      {/* Primary content wrapped in a <main> landmark. The landing page is the
          most-crawled marketing surface, yet it was the one top-level page with
          no <main> — the blog routes (via blog/layout.tsx), /success, and
          /verify all already carry one. Without it a screen-reader user has no
          "skip to main content" landmark to jump past the nav (WCAG 1.3.1 /
          Lighthouse landmark best practice), and the document has no primary
          region for assistive-tech document navigation. The <nav> and <footer>
          stay outside it as their own landmarks; styling is unchanged.
          Accessibility is an always-on cross-cutting investment, alongside the
          §6.46 heading-hierarchy and list-semantics fixes on this same page. */}
      <main>
      {/* Hero */}
      <section className="relative min-h-[75vh] flex flex-col items-center justify-center px-6">
        {/* Watermark */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
          <img src="/logo.svg" alt="" className="w-[420px] md:w-[540px] opacity-[0.025]" />
        </div>

        <div className="relative text-center max-w-2xl mx-auto">
          <img src="/logo.svg" alt="" width="56" height="50" className="block mx-auto mb-10" />

          <h1 className="text-4xl md:text-[3.5rem] lg:text-6xl font-bold text-deep-blue mb-6 leading-[1.08] tracking-tight">
            Your words
            <br />
            deserve proof.
          </h1>

          <p className="text-lg md:text-xl text-deep-blue/50 max-w-lg mx-auto mb-12 leading-relaxed">
            Certify your writing was created by your own hands &mdash;
            keystroke by keystroke. Every pause, every correction,
            every word. Unmistakably human.
          </p>

          <Link
            href="/write"
            className="group inline-flex items-center gap-3 px-8 py-4 bg-deep-blue text-cream text-lg font-medium rounded-full hover:bg-deep-blue/90 transition-all duration-300 shadow-lg shadow-deep-blue/10 hover:shadow-xl hover:shadow-deep-blue/20 hover:-translate-y-0.5"
          >
            Begin Writing
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="group-hover:translate-x-0.5 transition-transform" aria-hidden="true">
              <path d="M5 12H19M19 12L13 6M19 12L13 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        </div>
      </section>

      {/* A returning writer's unfinished draft, ahead of their finished proofs:
          the piece they are in the middle of is the more urgent recall, and the
          only surface that previously announced a saved draft was /write itself.
          Renders nothing when no draft exists — see components/UnfinishedDraft.tsx.
          Carries no divider of its own, so the divider YourProofs renders falls
          between the two when both are present and the page's existing rhythm is
          unchanged in every other combination. */}
      <UnfinishedDraft />

      {/* A returning writer's own certified pieces, recalled from the local-first
          history. Renders nothing (not even its divider) on a device with no
          history, so the marketing page is untouched for first-time visitors and
          crawlers — see components/YourProofs.tsx for why the homepage is the
          surface that needed it. */}
      <YourProofs />

      {/* Ornamental divider */}
      <Divider />

      {/* How It Works */}
      <section id="how-it-works" className="scroll-mt-20 max-w-3xl mx-auto px-6 py-20 md:py-24">
        {/* An <h2>, not a styled <p>: the step titles below are <h3>, so leaving
            these section labels as paragraphs made the page jump straight from
            the hero <h1> to <h3> with no <h2> — a broken heading outline that
            hurts screen-reader section navigation (WCAG 1.3.1) and the SEO
            document outline. The visual styling is unchanged (same classes). */}
        <h2 className="text-xs font-semibold text-deep-blue/30 uppercase tracking-[0.2em] mb-16 text-center">
          How it works
        </h2>

        {/* An ordered list: these are three sequential steps (01, 02, 03), so
            <ol>/<li> gives a screen reader the count and order the numbered
            visual already conveys to a sighted reader (WCAG 1.3.1). Tailwind's
            preflight strips list markers/indentation, so the render is
            unchanged. Same heading/structure-honesty spirit as the <h2> fix on
            this page. */}
        <ol className="space-y-14 md:space-y-16">
          {[
            {
              num: '01',
              title: 'Write Naturally',
              desc: 'Use our locked-down editor. No pasting from external sources, no AI assistance. Every keystroke is captured with precise timing data.',
            },
            {
              num: '02',
              title: 'Get Certified',
              desc: 'Submit your work and receive a unique verification hash. We analyze your writing patterns \u2014 speed, rhythm, pauses, corrections \u2014 to calculate an authenticity score.',
            },
            {
              num: '03',
              title: 'Share Proof',
              desc: 'Get a shareable verification link and a downloadable certificate. Anyone can verify your writing is authentically human, anytime.',
            },
          ].map((step, i) => (
            <li key={step.num} className="flex gap-6 md:gap-10 items-start">
              <div className="flex flex-col items-center flex-shrink-0">
                <span className="text-4xl md:text-5xl font-bold text-deep-blue/[0.07] leading-none tabular-nums select-none">
                  {step.num}
                </span>
                {i < 2 && (
                  <div className="w-px h-10 md:h-14 bg-deep-blue/[0.06] mt-4 hidden md:block" />
                )}
              </div>
              <div className="pt-1 md:pt-2">
                <h3 className="text-xl md:text-2xl font-semibold text-deep-blue mb-2 tracking-tight">
                  {step.title}
                </h3>
                <p className="text-deep-blue/50 leading-relaxed max-w-lg">
                  {step.desc}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Ornamental divider */}
      <Divider />

      {/* What We Analyze */}
      <section className="max-w-3xl mx-auto px-6 py-20 md:py-24">
        {/* <h2> for the same heading-outline reason as the "How it works"
            section above — keeps the page's h1 → h2 → h3 hierarchy valid.
            Styling unchanged. */}
        <h2 className="text-xs font-semibold text-deep-blue/30 uppercase tracking-[0.2em] mb-14 text-center">
          What we analyze
        </h2>

        {/* A semantic <ul>: five parallel signals we analyze, marked up as a
            list so a screen reader announces "list, 5 items" instead of five
            unrelated paragraphs (WCAG 1.3.1). Tailwind's preflight removes the
            default marker/indent, so the render is unchanged; the decorative
            dot is hidden from the a11y tree since the <li> now carries the
            list semantics. */}
        <ul className="space-y-6">
          {[
            { label: 'Typing Speed', desc: 'Natural words-per-minute patterns that distinguish human rhythm from machine output' },
            { label: 'Paste Attempts', desc: 'Every external paste is blocked and logged \u2014 your words must originate in the editor' },
            { label: 'Natural Pauses', desc: 'The thinking gaps between sentences that reveal a mind composing in real time' },
            { label: 'Edit Patterns', desc: 'Backspaces, rewrites, and revisions \u2014 the unmistakable trail of human deliberation' },
            { label: 'Keystroke Rhythm', desc: 'Timing variance between keystrokes that no algorithm can convincingly replicate' },
          ].map((item, i) => (
            <li key={i} className="flex gap-4 items-baseline">
              <span aria-hidden="true" className="w-1.5 h-1.5 rounded-full bg-deep-blue/15 flex-shrink-0 mt-[0.6rem]" />
              <div>
                <span className="font-semibold text-deep-blue">{item.label}</span>
                <span className="text-deep-blue/35 mx-2">&mdash;</span>
                <span className="text-deep-blue/50">{item.desc}</span>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Ornamental divider */}
      <Divider />

      {/* CTA */}
      <section className="max-w-3xl mx-auto px-6 py-24 md:py-32 text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-deep-blue mb-4 tracking-tight">
          Ready to prove it&apos;s yours?
        </h2>
        <p className="text-deep-blue/50 mb-10 max-w-md mx-auto leading-relaxed">
          Start writing now and get your authenticity certificate in minutes.
        </p>
        <Link
          href="/write"
          className="group inline-flex items-center gap-3 px-10 py-4 bg-deep-blue text-cream text-lg font-medium rounded-full hover:bg-deep-blue/90 transition-all duration-300 shadow-lg shadow-deep-blue/10"
        >
          Start Your Certification
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="group-hover:translate-x-0.5 transition-transform" aria-hidden="true">
            <path d="M5 12H19M19 12L13 6M19 12L13 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
      </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-deep-blue/[0.06] py-8">
        <div className="max-w-3xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-deep-blue/35">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <img src="/logo.svg" alt="" width="16" height="14" className="block opacity-25" />
              <span>&copy; {new Date().getFullYear()} By My Own Hand</span>
            </div>
            {/* Keep the Blog link reachable on every breakpoint. The nav's Blog
                link is `hidden sm:inline`, so on a phone (<640px) this footer was
                the only remaining path to /blog — and it was `hidden md:inline`,
                leaving mobile homepage visitors with no way to reach the blog at
                all. The blog is the content-marketing surface the SEO work drives
                traffic to, so make its link (and divider) visible everywhere. */}
            <span className="text-deep-blue/15">|</span>
            <Link href="/blog" className="hover:text-deep-blue/60 transition-colors">Blog</Link>
          </div>
          <p>Prove you&apos;re human, one keystroke at a time.</p>
        </div>
      </footer>
    
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd()) }}
      />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd()) }}
      />

      {/* SoftwareApplication node so search engines understand the product as
          the free, browser-based writing tool it is (and can qualify the page
          for the app rich result). Emitted only on the homepage — the surface
          that best represents the app — alongside the Organization it references
          by @id. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webApplicationJsonLd()) }}
      />
    </div>
  );
}

function Divider() {
  return (
    <div className="flex items-center justify-center gap-3 max-w-3xl mx-auto px-6">
      <div className="w-12 h-px bg-deep-blue/[0.08]" />
      <div className="w-1.5 h-1.5 rounded-full bg-deep-blue/[0.08]" />
      <div className="w-12 h-px bg-deep-blue/[0.08]" />
    </div>
  );
}
