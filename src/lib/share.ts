// Single source of truth for the social-share intent URLs used on
// `/success/<hash>` and `/verify/<hash>`. The two surfaces deliberately use
// different *voice* in their tweet copy (first-person on /success, third-person
// on /verify, since a visitor on /verify isn't necessarily the author), so the
// text template stays at the call site — but the encode-and-wrap shape of the
// intent URLs themselves is identical and was duplicated. A future tweak
// (UTM tagging, swapping intent endpoints, adding a Bluesky/Mastodon target)
// now lands in one place. Drift-prevention sibling of the prior
// getScoreLabel / getSiteUrl / buildEmbedSnippets / buildVerifyUrl / countWords
// consolidations.

export function buildTweetUrl(text: string): string {
  return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
}

export function buildLinkedInShareUrl(verifyUrl: string): string {
  return `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(verifyUrl)}`;
}
