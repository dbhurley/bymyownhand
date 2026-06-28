import Link from 'next/link';

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-cream flex flex-col">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 flex items-center justify-between px-6 md:px-12 py-4 bg-white/90 backdrop-blur-md border-b border-deep-blue/5">
        <Link href="/" className="flex items-center gap-3 hover:opacity-70 transition-opacity">
          <img src="/logo.svg" alt="By My Own Hand" width="28" height="25" className="block" />
          <span className="text-lg font-semibold text-deep-blue tracking-tight hidden sm:inline">By My Own Hand</span>
        </Link>
        <div className="flex items-center gap-6">
          <Link href="/blog" className="text-sm font-medium text-accent hover:text-deep-blue transition-colors">
            Blog
          </Link>
          <Link href="/#how-it-works" className="text-sm font-medium text-deep-blue/50 hover:text-deep-blue transition-colors hidden sm:inline">
            How It Works
          </Link>
          <Link
            href="/write"
            className="px-4 py-2 text-sm font-medium text-cream bg-deep-blue rounded-full hover:bg-deep-blue/90 transition-colors"
          >
            Start Writing
          </Link>
        </div>
      </nav>

      {/* Page Content */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="border-t border-deep-blue/10 bg-white/50">
        <div className="max-w-6xl mx-auto px-6 md:px-12 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-3">
                <img src="/logo.svg" alt="" width="24" height="21" className="block" />
                <span className="font-semibold text-deep-blue">By My Own Hand</span>
              </div>
              <p className="text-sm text-deep-blue/50 max-w-sm leading-relaxed">
                Certify your writing was created by your own hands. In a world of AI-generated content, authenticity is your signature.
              </p>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-deep-blue/40 uppercase tracking-widest mb-3">Product</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/" className="text-deep-blue/60 hover:text-deep-blue transition-colors">Home</Link></li>
                <li><Link href="/write" className="text-deep-blue/60 hover:text-deep-blue transition-colors">Start Writing</Link></li>
                <li><Link href="/blog" className="text-deep-blue/60 hover:text-deep-blue transition-colors">Blog</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-deep-blue/40 uppercase tracking-widest mb-3">Resources</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/#how-it-works" className="text-deep-blue/60 hover:text-deep-blue transition-colors">How It Works</Link></li>
                <li><Link href="/api/blog/feed.json" className="text-deep-blue/60 hover:text-deep-blue transition-colors">JSON Feed</Link></li>
              </ul>
            </div>
          </div>
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-8 border-t border-deep-blue/10 text-sm text-deep-blue/40">
            <span>&copy; {new Date().getFullYear()} By My Own Hand</span>
            <p className="italic">Prove you&apos;re human, one keystroke at a time.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
