import Link from 'next/link';

export default function Home() {
  return (
    <div className="fixed inset-0 overflow-y-auto overflow-x-hidden bg-cream">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-deep-blue/5 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -left-20 w-60 h-60 bg-accent/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-1/4 w-40 h-40 bg-deep-blue/5 rounded-full blur-2xl" />
      </div>

      {/* Navigation */}
      <nav className="relative flex items-center justify-between px-6 md:px-12 py-6">
        <div className="flex items-center gap-3">
          <div className="relative">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" className="text-deep-blue">
              <path d="M8 28L16 4L24 28" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M10 20H22" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <path d="M16 4C16 4 18 8 18 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.5"/>
            </svg>
          </div>
          <span className="text-xl font-semibold text-deep-blue tracking-tight">By My Own Hand</span>
        </div>
        <Link 
          href="/write"
          className="group px-5 py-2.5 text-sm font-medium text-deep-blue border-2 border-deep-blue/20 rounded-full hover:border-deep-blue hover:bg-deep-blue hover:text-cream transition-all duration-300"
        >
          <span className="flex items-center gap-2">
            Start Writing
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="group-hover:translate-x-1 transition-transform">
              <path d="M3 8H13M13 8L9 4M13 8L9 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </span>
        </Link>
      </nav>

      {/* Hero */}
      <main className="relative max-w-5xl mx-auto px-6 md:px-12 pt-16 md:pt-24 pb-32">
        {/* Badge */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-deep-blue/5 rounded-full border border-deep-blue/10">
            <span className="w-2 h-2 bg-success rounded-full animate-pulse" />
            <span className="text-sm text-deep-blue/70">Anti-AI writing verification</span>
          </div>
        </div>

        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-deep-blue mb-6 leading-[1.1] tracking-tight">
            Prove it&apos;s yours.
            <br />
            <span className="relative">
              <span className="text-accent">Write it yourself.</span>
              <svg className="absolute -bottom-2 left-0 w-full" height="8" viewBox="0 0 200 8" fill="none" preserveAspectRatio="none">
                <path d="M1 5.5C47 2.5 153 2.5 199 5.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-accent/30"/>
              </svg>
            </span>
          </h1>
          <p className="text-lg md:text-xl text-deep-blue/60 max-w-2xl mx-auto mb-10 leading-relaxed">
            In a world of AI-generated content, authenticity matters. 
            Certify your writing was created by your own hands, keystroke by keystroke.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link 
              href="/write"
              className="group inline-flex items-center gap-3 px-8 py-4 bg-deep-blue text-cream text-lg font-medium rounded-2xl hover:bg-deep-blue/90 transition-all duration-300 shadow-lg shadow-deep-blue/20 hover:shadow-xl hover:shadow-deep-blue/30 hover:-translate-y-0.5"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M4 16L16 4M16 4H8M16 4V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Start Writing
            </Link>
            <a 
              href="#how-it-works"
              className="inline-flex items-center gap-2 px-6 py-4 text-deep-blue/70 hover:text-deep-blue font-medium transition-colors"
            >
              <span>See how it works</span>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 3V13M8 13L4 9M8 13L12 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </a>
          </div>
        </div>

        {/* How it works */}
        <div id="how-it-works" className="scroll-mt-20">
          <div className="text-center mb-12">
            <h2 className="text-sm font-semibold text-deep-blue/40 uppercase tracking-widest mb-3">How it works</h2>
            <p className="text-2xl md:text-3xl font-semibold text-deep-blue">Three simple steps to certification</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6 mb-24">
            <div className="group relative bg-white/80 backdrop-blur-sm p-8 rounded-3xl border border-deep-blue/10 hover:border-deep-blue/20 transition-all duration-300 hover:shadow-xl hover:shadow-deep-blue/5 hover:-translate-y-1">
              <div className="absolute top-6 right-6 text-6xl font-bold text-deep-blue/5">1</div>
              <div className="w-14 h-14 bg-gradient-to-br from-deep-blue to-deep-blue/80 rounded-2xl flex items-center justify-center text-cream text-2xl mb-6 shadow-lg shadow-deep-blue/20">
                ⌨️
              </div>
              <h3 className="text-xl font-semibold text-deep-blue mb-3">Write Naturally</h3>
              <p className="text-deep-blue/60 leading-relaxed">
                Use our locked-down editor. No pasting from external sources. 
                Every keystroke is recorded with timing data.
              </p>
            </div>
            
            <div className="group relative bg-white/80 backdrop-blur-sm p-8 rounded-3xl border border-deep-blue/10 hover:border-deep-blue/20 transition-all duration-300 hover:shadow-xl hover:shadow-deep-blue/5 hover:-translate-y-1">
              <div className="absolute top-6 right-6 text-6xl font-bold text-deep-blue/5">2</div>
              <div className="w-14 h-14 bg-gradient-to-br from-accent to-accent/80 rounded-2xl flex items-center justify-center text-white text-2xl mb-6 shadow-lg shadow-accent/20">
                📊
              </div>
              <h3 className="text-xl font-semibold text-deep-blue mb-3">Get Certified</h3>
              <p className="text-deep-blue/60 leading-relaxed">
                Submit your work and receive a verification hash. 
                We analyze your writing patterns to calculate an authenticity score.
              </p>
            </div>
            
            <div className="group relative bg-white/80 backdrop-blur-sm p-8 rounded-3xl border border-deep-blue/10 hover:border-deep-blue/20 transition-all duration-300 hover:shadow-xl hover:shadow-deep-blue/5 hover:-translate-y-1">
              <div className="absolute top-6 right-6 text-6xl font-bold text-deep-blue/5">3</div>
              <div className="w-14 h-14 bg-gradient-to-br from-success to-success/80 rounded-2xl flex items-center justify-center text-white text-2xl mb-6 shadow-lg shadow-success/20">
                ✅
              </div>
              <h3 className="text-xl font-semibold text-deep-blue mb-3">Share Proof</h3>
              <p className="text-deep-blue/60 leading-relaxed">
                Get a shareable verification link and downloadable certificate. 
                Anyone can verify your writing is authentically human.
              </p>
            </div>
          </div>

          {/* Trust indicators */}
          <div className="bg-deep-blue rounded-3xl p-8 md:p-12 text-cream">
            <div className="text-center mb-8">
              <h3 className="text-sm font-semibold text-cream/50 uppercase tracking-widest mb-3">Detection capabilities</h3>
              <p className="text-2xl font-semibold">What we analyze to verify authenticity</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {[
                { icon: '⚡', label: 'Typing Speed', desc: 'Natural WPM patterns' },
                { icon: '📋', label: 'Paste Attempts', desc: 'Blocked & logged' },
                { icon: '⏸️', label: 'Natural Pauses', desc: 'Thinking patterns' },
                { icon: '⌫', label: 'Edit Patterns', desc: 'Revision behavior' },
                { icon: '🎯', label: 'Keystroke Rhythm', desc: 'Timing variance' },
              ].map((item, i) => (
                <div key={i} className="text-center p-4 rounded-2xl bg-cream/5 hover:bg-cream/10 transition-colors">
                  <span className="text-3xl mb-2 block">{item.icon}</span>
                  <span className="font-medium block mb-1">{item.label}</span>
                  <span className="text-xs text-cream/50">{item.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-24 text-center">
          <div className="inline-block bg-gradient-to-br from-white to-cream/50 p-12 rounded-3xl border border-deep-blue/10 shadow-2xl shadow-deep-blue/5">
            <h2 className="text-3xl md:text-4xl font-bold text-deep-blue mb-4">Ready to prove it&apos;s yours?</h2>
            <p className="text-deep-blue/60 mb-8 max-w-md mx-auto">Start writing now and get your authenticity certificate in minutes.</p>
            <Link 
              href="/write"
              className="inline-flex items-center gap-3 px-10 py-4 bg-deep-blue text-cream text-lg font-medium rounded-2xl hover:bg-deep-blue/90 transition-all duration-300 shadow-lg shadow-deep-blue/20"
            >
              Start Your Certification
              <span className="text-xl">→</span>
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative border-t border-deep-blue/10 py-8 bg-white/50 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-6 md:px-12 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-deep-blue/50">
          <div className="flex items-center gap-2">
            <svg width="20" height="20" viewBox="0 0 32 32" fill="none" className="text-deep-blue/30">
              <path d="M8 28L16 4L24 28" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M10 20H22" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <span>© 2025 By My Own Hand</span>
          </div>
          <p className="italic">Prove you&apos;re human, one keystroke at a time.</p>
        </div>
      </footer>
    </div>
  );
}
