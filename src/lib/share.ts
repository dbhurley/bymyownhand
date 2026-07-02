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
  // Target the canonical `x.com` intent host, not `twitter.com`. Since X's
  // domain migration `twitter.com/intent/tweet` 301-redirects to `x.com`, so
  // every share paid a redirect hop — and some in-app browsers and link-preview
  // scrapers drop or mangle the long `text` query param across the cross-domain
  // redirect. Pointing straight at `x.com` removes the hop and matches the
  // "Post on X" label both share surfaces already use.
  return `https://x.com/intent/tweet?text=${encodeURIComponent(text)}`;
}

export function buildLinkedInShareUrl(verifyUrl: string): string {
  return `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(verifyUrl)}`;
}
