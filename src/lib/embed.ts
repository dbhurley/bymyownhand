import { getSiteUrl } from './site';

// Single source of truth for the "Verified human-written" embed badge snippet
// in Markdown and HTML form. The Markdown variant covers Substack/Ghost/Notion/
// READMEs; the HTML variant covers WordPress, raw-HTML CMSes, and email
// signatures that strip Markdown.
//
// HTML's `height` attribute requires a non-negative integer (CSS pixels);
// `height="auto"` is invalid and gets stripped by stricter CMS sanitizers.
// The logo is 363×324, so width=120 → height=107 keeps the aspect ratio.

export interface EmbedSnippets {
  markdown: string;
  html: string;
}

export function buildEmbedSnippets(verifyUrl: string): EmbedSnippets {
  const logoUrl = `${getSiteUrl()}/logo.svg`;
  return {
    markdown: `[![Verified human-written](${logoUrl})](${verifyUrl})`,
    html: `<a href="${verifyUrl}" target="_blank" rel="noopener"><img src="${logoUrl}" alt="Verified human-written" width="120" height="107" /></a>`,
  };
}
