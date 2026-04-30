// Single source of truth for the canonical site URL.
// Honors NEXT_PUBLIC_SITE_URL so staging, custom domains, and local previews
// produce correct proof links, certificate URLs, and embed badge logos.

const FALLBACK_SITE_URL = 'https://bymyownhand.com';

export function getSiteUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  return FALLBACK_SITE_URL;
}
