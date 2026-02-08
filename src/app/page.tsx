import Link from 'next/link';

export default function Home() {
  return (
    <div className="fixed inset-0 overflow-y-auto overflow-x-hidden bg-cream">
      {/* Navigation */}
      <nav className="flex items-center justify-between px-8 py-6">
        <div className="flex items-center gap-2">
          <span className="text-2xl">✍️</span>
          <span className="text-xl font-semibold text-deep-blue">By My Own Hand</span>
        </div>
        <Link 
          href="/write"
          className="px-4 py-2 text-sm font-medium text-deep-blue border border-deep-blue/20 rounded-lg hover:bg-deep-blue/5 transition-colors"
        >
          Start Writing
        </Link>
      </nav>

      {/* Hero */}
      <main className="max-w-4xl mx-auto px-8 pt-20 pb-32">
        <div className="text-center mb-16">
          <h1 className="text-5xl md:text-6xl font-bold text-deep-blue mb-6 leading-tight">
            Prove it&apos;s yours.<br />
            <span className="text-accent">Write it yourself.</span>
          </h1>
          <p className="text-xl text-deep-blue/70 max-w-2xl mx-auto mb-8">
            In a world of AI-generated content, authenticity matters. 
            Certify your writing was created by your own hands, keystroke by keystroke.
          </p>
          <Link 
            href="/write"
            className="inline-flex items-center gap-2 px-8 py-4 bg-deep-blue text-cream text-lg font-medium rounded-xl hover:bg-deep-blue/90 transition-colors"
          >
            <span>Start Writing</span>
            <span>→</span>
          </Link>
        </div>

        {/* How it works */}
        <div className="grid md:grid-cols-3 gap-8 mb-20">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-deep-blue/10">
            <div className="w-12 h-12 bg-deep-blue/10 rounded-lg flex items-center justify-center text-2xl mb-4">
              ⌨️
            </div>
            <h3 className="text-lg font-semibold text-deep-blue mb-2">Write Naturally</h3>
            <p className="text-deep-blue/60">
              Use our locked-down editor. No pasting from external sources. 
              Every keystroke is recorded with timing data.
            </p>
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-sm border border-deep-blue/10">
            <div className="w-12 h-12 bg-deep-blue/10 rounded-lg flex items-center justify-center text-2xl mb-4">
              📊
            </div>
            <h3 className="text-lg font-semibold text-deep-blue mb-2">Get Certified</h3>
            <p className="text-deep-blue/60">
              Submit your work and receive a verification hash. 
              We analyze your writing patterns to calculate an authenticity score.
            </p>
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-sm border border-deep-blue/10">
            <div className="w-12 h-12 bg-deep-blue/10 rounded-lg flex items-center justify-center text-2xl mb-4">
              ✅
            </div>
            <h3 className="text-lg font-semibold text-deep-blue mb-2">Share Proof</h3>
            <p className="text-deep-blue/60">
              Get a shareable verification link and downloadable certificate. 
              Anyone can verify your writing is authentically human.
            </p>
          </div>
        </div>

        {/* Trust indicators */}
        <div className="text-center">
          <p className="text-sm text-deep-blue/50 uppercase tracking-wider mb-6">What we detect</p>
          <div className="flex flex-wrap justify-center gap-4 text-sm text-deep-blue/70">
            <span className="px-4 py-2 bg-white rounded-full border border-deep-blue/10">
              ⚡ Typing Speed
            </span>
            <span className="px-4 py-2 bg-white rounded-full border border-deep-blue/10">
              📋 Paste Attempts
            </span>
            <span className="px-4 py-2 bg-white rounded-full border border-deep-blue/10">
              ⏸️ Natural Pauses
            </span>
            <span className="px-4 py-2 bg-white rounded-full border border-deep-blue/10">
              ⌫ Edit Patterns
            </span>
            <span className="px-4 py-2 bg-white rounded-full border border-deep-blue/10">
              🎯 Keystroke Rhythm
            </span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-deep-blue/10 py-8">
        <div className="max-w-4xl mx-auto px-8 flex items-center justify-between text-sm text-deep-blue/50">
          <p>© 2025 By My Own Hand</p>
          <p>Prove you&apos;re human.</p>
        </div>
      </footer>
    </div>
  );
}
