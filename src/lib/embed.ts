import { getSiteUrl } from './site';

// Single source of truth for the "Verified human-written" embed badge snippet
// in Markdown, HTML, and one-line `<script>` form. The Markdown variant covers
// Substack/Ghost/Notion/READMEs; the HTML variant covers WordPress, raw-HTML
// CMSes, and email signatures that strip Markdown; the script variant is the
// Phase 1.3 one-liner for any host that runs JavaScript.
//
// The badge logo is a raster PNG, not `/logo.svg`. This snippet is the artifact
// of the Phase 1.3 embed flywheel — it lands in third-party surfaces we don't
// control — and the two we explicitly advertise it for are the least SVG-friendly:
// most email clients (Outlook's Word rendering engine, several webmail clients)
// do not render an inline SVG `<img>` at all, and stricter CMS/feed HTML
// sanitizers strip `<img src="*.svg">`. So the badge would render broken in
// exactly the places the UI copy promises it works. Point it at the raster
// `/icon-192x192.png` — a sibling of the §6.44 raster-eligibility sweep that
// moved the Organization logo, the BlogPosting publisher logo, and the OG/Twitter
// cards off the SVG for the same reason. 192px is a natural badge size in a
// Markdown/README context (smaller than the 363px SVG it replaces) and downsizes
// cleanly to the HTML badge's 120px.
//
// HTML's `height` attribute requires a non-negative integer (CSS pixels);
// `height="auto"` is invalid and gets stripped by stricter CMS sanitizers. The
// raster is square (192×192), so width=120 → height=120 keeps the aspect ratio.

export type EmbedFormat = 'markdown' | 'html' | 'script';

export interface EmbedSnippets {
  markdown: string;
  html: string;
  script: string;
}

export function buildEmbedSnippets(verifyUrl: string, hash: string): EmbedSnippets {
  const siteUrl = getSiteUrl();
  const logoUrl = `${siteUrl}/icon-192x192.png`;
  return {
    markdown: `[![Verified human-written](${logoUrl})](${verifyUrl})`,
    html: `<a href="${verifyUrl}" target="_blank" rel="noopener"><img src="${logoUrl}" alt="Verified human-written" width="120" height="120" /></a>`,
    // Resolved through `getSiteUrl()` rather than the browser origin the other
    // two inherit from `verifyUrl`: the script tag is pasted into someone
    // else's page and has to keep loading long after the tab that copied it is
    // gone, so it must name the canonical host — the same reasoning as
    // `getCanonicalVerifyUrl()` for the certificate's printed link and QR code.
    script: `<script src="${siteUrl}/embed.js" data-hash="${hash}" async></script>`,
  };
}

// The format switcher's labels and the one-line "where this works" hint under
// the snippet, in one place. Both `/success/<hash>` and `/verify/<hash>` render
// this switcher, and the copy was already duplicated across them as a pair of
// mirrored ternaries — a third format would have made that four copies of the
// same sentence in two files. Same drift-prevention shape as the
// `buildEmbedSnippets()` / `getScoreLabel()` / `ProofList` consolidations.
export const EMBED_FORMATS: { id: EmbedFormat; label: string; hint: string }[] = [
  {
    id: 'markdown',
    label: 'Markdown',
    hint: 'Markdown works in Substack, Ghost, Notion, and READMEs.',
  },
  {
    id: 'html',
    label: 'HTML',
    hint: 'HTML works on WordPress, raw-HTML blocks, and email signatures.',
  },
  {
    id: 'script',
    label: 'Script',
    hint: 'The script renders a labelled badge — and updates wherever it is embedded.',
  },
];
