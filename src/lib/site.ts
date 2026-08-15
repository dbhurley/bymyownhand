// Single source of truth for the canonical site URL.
// Honors NEXT_PUBLIC_SITE_URL so staging, custom domains, and local previews
// produce correct proof links, certificate URLs, and embed badge logos.

const FALLBACK_SITE_URL = 'https://bymyownhand.com';

export function getSiteUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  // Collapse *all* trailing slashes, not just one. Every consumer concatenates
  // `${getSiteUrl()}/verify/...`, `/blog`, `/logo.svg`, etc., so a value like
  // `https://foo.com//` (an easy env-var typo) would otherwise leave a trailing
  // slash and emit double-slashed canonical tags, proof links, feed URLs, and
  // embed-badge logos — each a small correctness/SEO blemish across the very
  // surfaces this single source of truth exists to keep honest.
  if (fromEnv) return fromEnv.replace(/\/+$/, '');
  return FALLBACK_SITE_URL;
}

// Single source of truth for the absolute /verify/<hash> URL. Prefers the
// current browser origin so a writer who landed on a non-canonical host (a
// preview URL, a custom domain that hasn't yet been set as NEXT_PUBLIC_SITE_URL)
// gets a proof link that points back at the surface they're actually on, then
// falls back to getSiteUrl() during SSR. Previously inlined in both
// `/success/<hash>` and `/verify/<hash>` — same drift-prevention shape as the
// prior getScoreLabel / buildEmbedSnippets / countWords consolidations.
export function buildVerifyUrl(hash: string): string {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/verify/${hash}`;
  }
  return `${getSiteUrl()}/verify/${hash}`;
}

// Canonical /verify/<hash> URL that always resolves through getSiteUrl(),
// never the browser origin. Used where the URL is baked into a durable
// artifact that outlives the page that minted it — the POST /api/documents
// response handed to external API consumers, the PDF certificate's footer
// link, and the certificate QR code. Those must point at the canonical domain
// regardless of which preview host or custom domain the writer happened to be
// on. Distinct from buildVerifyUrl(), which prefers window.location.origin so
// an in-app share link points back at the surface the writer is actually on.
// Previously inlined as `${getSiteUrl()}/verify/${hash}` in three places.
export function getCanonicalVerifyUrl(hash: string): string {
  return `${getSiteUrl()}/verify/${hash}`;
}
