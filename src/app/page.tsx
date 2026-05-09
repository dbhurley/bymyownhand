import Link from 'next/link';
import { getSiteUrl } from '@/lib/site';

export default function Home() {
  const siteUrl = getSiteUrl();
  const logoUrl = `${siteUrl}/logo.svg`;
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
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="group-hover:translate-x-0.5 transition-transform">
              <path d="M3 8H13M13 8L9 4M13 8L9 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        </div>
      </nav>

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
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="group-hover:translate-x-0.5 transition-transform">
              <path d="M5 12H19M19 12L13 6M19 12L13 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        </div>
      </section>

      {/* Ornamental divider */}
      <Divider />

      {/* How It Works */}
      <section id="how-it-works" className="scroll-mt-20 max-w-3xl mx-auto px-6 py-20 md:py-24">
        <p className="text-xs font-semibold text-deep-blue/30 uppercase tracking-[0.2em] mb-16 text-center">
          How it works
        </p>

        <div className="space-y-14 md:space-y-16">
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
            <div key={step.num} className="flex gap-6 md:gap-10 items-start">
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
            </div>
          ))}
        </div>
      </section>

      {/* Ornamental divider */}
      <Divider />

      {/* What We Analyze */}
      <section className="max-w-3xl mx-auto px-6 py-20 md:py-24">
        <p className="text-xs font-semibold text-deep-blue/30 uppercase tracking-[0.2em] mb-14 text-center">
          What we analyze
        </p>

        <div className="space-y-6">
          {[
            { label: 'Typing Speed', desc: 'Natural words-per-minute patterns that distinguish human rhythm from machine output' },
            { label: 'Paste Attempts', desc: 'Every external paste is blocked and logged \u2014 your words must originate in the editor' },
            { label: 'Natural Pauses', desc: 'The thinking gaps between sentences that reveal a mind composing in real time' },
            { label: 'Edit Patterns', desc: 'Backspaces, rewrites, and revisions \u2014 the unmistakable trail of human deliberation' },
            { label: 'Keystroke Rhythm', desc: 'Timing variance between keystrokes that no algorithm can convincingly replicate' },
          ].map((item, i) => (
            <div key={i} className="flex gap-4 items-baseline">
              <span className="w-1.5 h-1.5 rounded-full bg-deep-blue/15 flex-shrink-0 mt-[0.6rem]" />
              <div>
                <span className="font-semibold text-deep-blue">{item.label}</span>
                <span className="text-deep-blue/35 mx-2">&mdash;</span>
                <span className="text-deep-blue/50">{item.desc}</span>
              </div>
            </div>
          ))}
        </div>
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
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="group-hover:translate-x-0.5 transition-transform">
            <path d="M5 12H19M19 12L13 6M19 12L13 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-deep-blue/[0.06] py-8">
        <div className="max-w-3xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-deep-blue/35">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <img src="/logo.svg" alt="" width="16" height="14" className="block opacity-25" />
              <span>&copy; {new Date().getFullYear()} By My Own Hand</span>
            </div>
            <span className="hidden md:inline text-deep-blue/15">|</span>
            <Link href="/blog" className="hover:text-deep-blue/60 transition-colors hidden md:inline">Blog</Link>
          </div>
          <p>Prove you&apos;re human, one keystroke at a time.</p>
        </div>
      </footer>
    
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'Organization',
          name: 'By My Own Hand',
          url: siteUrl,
          logo: logoUrl,
        }) }}
      />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          name: 'By My Own Hand',
          url: siteUrl,
          potentialAction: {
            '@type': 'SearchAction',
            target: `${siteUrl}/?s={search_term_string}`,
            'query-input': 'required name=search_term_string',
          },
        }) }}
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
