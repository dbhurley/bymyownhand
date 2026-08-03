import type { Metadata } from 'next';
import { isValidVerificationHash } from '@/lib/hash';

// The Phase 1.3 `iframe` badge variant — the last open item of the embed
// flywheel, and the one that reaches the hosts the other three can't.
//
//   <iframe src="https://bymyownhand.com/embed/bmoh-…" …></iframe>
//
// The `<script>` variant (see `app/embed.js/route.ts`) is the better badge
// wherever it runs: it renders a labelled pill whose markup stays ours to
// change. But a large share of the surfaces the roadmap names for this badge —
// hosted CMS templates, forum and wiki markup, documentation platforms, several
// newsletter editors — strip `<script>` outright while allowing an `<iframe>`
// from an allow-listed origin. On those, a writer's only option today is the
// bare `<img>` of the app icon: a 120px blue square a reader has to already
// recognise. This gives them the same *labelled* badge, served by us, in the
// element those hosts do accept.
//
// Deliberately the same pill as `/embed.js` renders, styled inline: the badge
// should read identically wherever a reader meets it, and a self-contained page
// keeps this cheap (no client JS, no Monaco, no fonts to fetch — the badge uses
// the reader's own system UI font, as the script variant does).
//
// Framable by construction: the `frame-ancestors 'self'` / `X-Frame-Options`
// headers in `next.config.ts` are scoped to `/write` and `/success/*`, the
// input-capturing surfaces that must never be framed. This route is the
// opposite — it exists to be framed by third parties.
export const metadata: Metadata = {
  // A badge fragment is not a page: it has no prose, and indexing it would put
  // a chromeless duplicate of the proof link in front of searchers instead of
  // `/verify/<hash>`. `follow` stays on, matching the soft-404 `noindex` on
  // format-invalid verify URLs — the link out of it is the real proof page.
  robots: { index: false },
};

export default async function EmbedBadgePage({
  params,
}: {
  params: Promise<{ hash: string }>;
}) {
  const { hash } = await params;

  // Same gate as `/embed.js` applies to its `data-hash`: a value that can't have
  // been minted by `generateVerificationHash()` renders nothing at all, rather
  // than a badge linking to a proof that doesn't exist.
  if (!isValidVerificationHash(hash)) return null;

  return (
    <>
      {/* The badge sits inside someone else's page, so the app's own body
          chrome must not: `globals.css` paints a cream background and applies
          safe-area padding to every surface, which inside a 40px frame would
          render as a cream slab with the pill inset from the corner. Scoped to
          this route because it is the only one that is a fragment rather than a
          page. */}
      <style
        dangerouslySetInnerHTML={{
          __html:
            'html,body{background:transparent!important;margin:0;padding:0;min-height:0;overflow:hidden}',
        }}
      />
      <a
        href={`/verify/${hash}`}
        target="_blank"
        rel="noopener"
        title="Verify this document on By My Own Hand"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 14px 6px 8px',
          border: '1px solid rgba(30,58,95,0.15)',
          borderRadius: '999px',
          background: '#f5f0e8',
          color: '#1e3a5f',
          font: '500 13px/1.2 system-ui,-apple-system,Segoe UI,sans-serif',
          textDecoration: 'none',
        }}
      >
        {/* Decorative: the words beside it carry the meaning. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/icon-192x192.png"
          alt=""
          width={22}
          height={22}
          style={{ display: 'block', width: '22px', height: '22px', border: 0 }}
        />
        Verified human-written
      </a>
    </>
  );
}
