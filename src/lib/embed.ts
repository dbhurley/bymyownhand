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

export type EmbedFormat = 'markdown' | 'html' | 'script' | 'iframe';

// ─── The badge itself ───
//
// The whole argument for the `<script>` and `iframe` variants is that their
// markup is *ours*: unlike the copied Markdown/HTML snippets, a change to the
// badge's wording or styling reaches every embed already in the wild. That only
// holds while there is one badge to change. It shipped as two hand-maintained
// copies — a JS string in `app/embed.js/route.ts` and JSX in
// `app/embed/[hash]/page.tsx` — carrying the same label, title, colours,
// radius, padding, font stack, and mark size in two syntaxes. Nothing enforced
// that they agree, so the same badge could come to read two ways depending on
// which format a writer happened to paste, on surfaces we can't see and can't
// fix after the fact.
//
// Both routes now render from these constants. Same drift-prevention shape as
// the `buildEmbedSnippets()` / `getScoreLabel()` / `getSiteUrl()` / `ProofList`
// consolidations — done here before a third consumer (a WordPress plugin, the
// Phase 2.2 CMS integrations) makes it three copies.
export const BADGE_LABEL = 'Verified human-written';
export const BADGE_LINK_TITLE = 'Verify this document on By My Own Hand';

// Raster, not `/logo.svg` — see the note above on why the embed surfaces are
// the least SVG-friendly places we ship to. Also the logo used by the Markdown
// and HTML snippets below, so all four formats show one mark.
export const BADGE_MARK_PATH = '/icon-192x192.png';
export const BADGE_MARK_SIZE = 22;

// Inline CSS rather than a class: the script variant sets `style.cssText` on a
// node inside a page whose stylesheet we don't control, so the badge must carry
// its own appearance. The iframe variant emits the same declarations into its
// own scoped `<style>` block.
export const BADGE_PILL_CSS =
  'display:inline-flex;align-items:center;gap:8px;padding:6px 14px 6px 8px;' +
  'border:1px solid rgba(30,58,95,0.15);border-radius:999px;background:#f5f0e8;color:#1e3a5f;' +
  'font:500 13px/1.2 system-ui,-apple-system,Segoe UI,sans-serif;text-decoration:none;';

export const BADGE_MARK_CSS = `display:block;width:${BADGE_MARK_SIZE}px;height:${BADGE_MARK_SIZE}px;border:0;`;

export interface EmbedSnippets {
  markdown: string;
  html: string;
  script: string;
  iframe: string;
}

// The rendered pill is ~197×36 CSS pixels (a 22px mark, an 8px gap, the
// "Verified human-written" label at 13px, and the pill's own padding + border).
// The frame is sized a little past that so the badge never clips at a reader's
// default font settings, and `/embed/<hash>` paints a transparent background so
// the slack is invisible on any host page.
const IFRAME_WIDTH = 210;
const IFRAME_HEIGHT = 40;

export function buildEmbedSnippets(verifyUrl: string, hash: string): EmbedSnippets {
  const siteUrl = getSiteUrl();
  const logoUrl = `${siteUrl}${BADGE_MARK_PATH}`;
  return {
    markdown: `[![Verified human-written](${logoUrl})](${verifyUrl})`,
    html: `<a href="${verifyUrl}" target="_blank" rel="noopener"><img src="${logoUrl}" alt="Verified human-written" width="120" height="120" /></a>`,
    // Resolved through `getSiteUrl()` rather than the browser origin the other
    // two inherit from `verifyUrl`: the script tag is pasted into someone
    // else's page and has to keep loading long after the tab that copied it is
    // gone, so it must name the canonical host — the same reasoning as
    // `getCanonicalVerifyUrl()` for the certificate's printed link and QR code.
    script: `<script src="${siteUrl}/embed.js" data-hash="${hash}" async></script>`,
    // Same canonical-host reasoning as the script variant — this snippet also
    // has to keep resolving from someone else's page long after the tab that
    // copied it is gone. `title` is the frame's accessible name (a frame
    // without one is announced as an unlabelled region), and `loading="lazy"`
    // keeps a badge below the fold off the host page's critical path.
    iframe: `<iframe src="${siteUrl}/embed/${hash}" title="Verified human-written" width="${IFRAME_WIDTH}" height="${IFRAME_HEIGHT}" style="border:0" loading="lazy"></iframe>`,
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
  {
    id: 'iframe',
    label: 'iframe',
    hint: 'The iframe renders the same labelled badge on hosts that strip scripts.',
  },
];
