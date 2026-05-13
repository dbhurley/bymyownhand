// Single source of truth for the canonical site URL.
// Honors NEXT_PUBLIC_SITE_URL so staging, custom domains, and local previews
// produce correct proof links, certificate URLs, and embed badge logos.

const FALLBACK_SITE_URL = 'https://bymyownhand.com';

export function getSiteUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, '');
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
