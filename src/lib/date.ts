// Single source of truth for rendering a blog post's `YYYY-MM-DD` frontmatter
// date as a human-readable string. Both `/blog` and `/blog/<slug>` previously
// defined their own local `formatDate()` — identical except for the month style
// (`short` on the index, `long` on the post page) — so a change to the display
// rule (a defensive guard, a locale, a different format) had two places to drift
// from. This consolidates the rule, mirroring the prior `getScoreLabel` /
// `getSiteUrl` / `buildEmbedSnippets` / `computeWpm` consolidations; each caller
// passes the month style it wants.
//
// Parse at local midnight (`T00:00:00`) so a `YYYY-MM-DD` value renders on its
// own calendar day rather than shifting a day earlier in negative-offset
// timezones (which a bare `new Date('2026-07-05')` — parsed as UTC midnight —
// would do). Guard against a missing or unparseable date the same way the
// sitemap and JSON Feed already do (§6.12): rather than emit the literal
// "Invalid Date" string a `toLocaleDateString` on an invalid Date produces,
// fall back to the raw value so a post that ever lands without a clean
// frontmatter date degrades quietly instead of printing a broken cell.
export function formatPostDate(dateStr: string, monthStyle: 'short' | 'long' = 'long'): string {
  if (!dateStr) return '';
  const date = new Date(`${dateStr}T00:00:00`);
  if (isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString('en-US', {
    month: monthStyle,
    day: 'numeric',
    year: 'numeric',
  });
}
