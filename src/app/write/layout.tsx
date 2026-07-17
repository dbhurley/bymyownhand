import type { Metadata } from 'next';

// Server layout wrapping the (client) /write editor page so it can carry the
// metadata the page itself can't: `write/page.tsx` is `'use client'` (Monaco,
// localStorage draft resume, the streak pill), and a client component cannot
// export `metadata`.
//
// The fix is the self-referential canonical. The root layout declares
// `alternates: { canonical: "/" }`, and Next.js *inherits* a parent's
// `alternates` into any child route that doesn't override it — so /write was
// emitting `<link rel="canonical" href="https://bymyownhand.com/">`, telling
// search engines the editor is a duplicate of the homepage and asking them to
// drop it from the index. Verified in the built HTML: /write carried the
// homepage's canonical while /blog (which sets its own) carried its own.
//
// This is the same inherited-canonical bug the blog-canonical fix and the
// /verify/<hash> layout each corrected on their own surface; /write was the
// last route still inheriting it, and it is the one page the product exists to
// send people to — the sitemap ranks it at priority 0.9, second only to the
// homepage, while the canonical tag on it pointed somewhere else entirely.
export const metadata: Metadata = {
  alternates: { canonical: '/write' },
};

export default function WriteLayout({ children }: { children: React.ReactNode }) {
  return children;
}
