# By My Own Hand — Product Requirements Document

> **Last updated:** 2026-05-19
> **Status:** Living document — evolves with the roadmap
> **Owner:** DB Hurley

---

## 1. Vision

In an era where any sentence can be machine-generated in milliseconds, **the act of writing — keystroke by keystroke — is one of the few remaining proofs of human presence.** By My Own Hand exists so writers, students, journalists, professionals, and creators can prove their words came from their own hands and own minds.

> *"Your words deserve proof."*

---

## 2. Problem

| Audience | The pain |
|---|---|
| **Students & academics** | Schools cannot reliably distinguish AI-written submissions from human-written ones. False positives from AI-detection tools punish honest writers. |
| **Journalists & writers** | "Was this written by a human?" is now an editorial question. There is no portable, verifiable proof of authorship. |
| **Professionals & knowledge workers** | Cover letters, statements of purpose, internal memos, and creative briefs all need to demonstrate human authorship — but no standard exists. |
| **Creators & bloggers** | AI content floods the open web. Human writers want a visible signal that their work is hand-composed. |
| **Platforms** | Publishers, hiring teams, and educators want a low-friction way to verify human authorship without invasive surveillance. |

---

## 3. Target Audience (priority order)

1. **Writers & creators** publishing on personal sites, Substack, Medium — want a "verified human" badge alongside their post.
2. **Students** submitting essays who want a defensible record of their writing process.
3. **Educators** asking students to compose drafts in a verifiable environment.
4. **Job seekers** submitting written application materials (cover letters, essays, take-home assignments).
5. **Journalists & op-ed writers** whose work depends on the credibility of human voice.

---

## 4. Core Value Proposition

A **lockdown editor** that captures every keystroke with millisecond timing, blocks all external paste, and produces a **shareable, tamper-evident verification link** plus a **downloadable certificate** — proving a piece of writing was composed by a real human in real time.

The output is not a probability score from an AI detector; it is **a recording of the act of writing**, replayable on demand.

---

## 5. Product Pillars

| Pillar | What it means |
|---|---|
| **Provable** | Every claim ties back to a keystroke trace. Anyone with the link can replay the writing as it happened. |
| **Frictionless** | Open the page, write, click submit, get a link. No accounts required for the MVP path. |
| **Portable** | The proof lives at a stable URL, can be embedded as a badge, and downloaded as a PDF certificate. |
| **Private by default** | We capture timing, not biometrics. Documents are never used for AI training. |
| **Aesthetic** | Writers are an aesthetic-sensitive audience. The editor must feel like a calm, premium writing surface — not surveillance software. |

---

## 6. Current Capabilities (shipped)

### 6.1 Locked writing editor
- Monaco-based plaintext editor with calm typography (Bricolage Grotesque, large line-height).
- **Paste blocking:** Cmd+V/Ctrl+V from external clipboard is intercepted; only intra-editor copy/paste is permitted (preserves accessibility for moving text within a draft).
- **Drag-and-drop blocking:** Files and external text dropped onto the editor are rejected and counted.
- **Quiet recording indicator:** A pulsing dot signals the session is active.
- **Live word count, elapsed timer, blocked-paste counter** in the toolbar.
- **Submission gate:** ≥10 words required before "Complete" is enabled.

### 6.2 Keystroke capture
- Each event recorded with `{ t (ms-from-session-start), type, key, pos, len? }`.
- Event types: `key`, `delete`, `paste_blocked`, `paste_internal`.

### 6.3 Metrics + integrity score
Computed at submission time:
- Average keystroke interval, keystroke variance (CoV), pause count (>2s gaps), deletion rate, blocked-paste count, longest uninterrupted burst.
- A 0–100 **integrity score** that penalizes blocked pastes, super-human typing speed, robotic variance, and missing pauses/deletions.

### 6.4 Verification & sharing
- `bmoh-xxxx-xxxx-xxxx` verification hash (nanoid, URL-safe).
- Shareable verification page at `/verify/<hash>` with:
  - Word count, duration, integrity score, blocked-paste count.
  - **Keystroke playback:** the document is replayed character-by-character at 3× speed.
  - Detailed metrics panel.
- Success page at `/success/<hash>` with copy-link and "Write another."
- Downloadable PDF certificate (`@react-pdf/renderer`).
- Optional Neon Postgres persistence (graceful degradation to `sessionStorage` for the MVP demo flow).

### 6.5 Content & SEO
- 44+ long-form blog posts on identity, AI, and content provenance.
- JSON Feed at `/api/blog/feed.json`.
- `llms.txt`, `humans.txt`, full Open Graph + Twitter card metadata, canonical URL via `metadataBase`.

### 6.6 Reliability fixes (prior revision)
- WPM penalty branches reordered so the `>200 WPM` rule is reachable; divide-by-zero in WPM computation guarded.
- Duplicated integrity-scoring logic in the verify page replaced with a single shared helper.
- Footer year now derives from `Date.now()` instead of a hard-coded `2025`.

### 6.7 Stickiness foundations (prior revision)
- **Draft auto-save** — the locked editor persists a snapshot (title, content, full keystroke trace, blocked-paste count, original `startTime`) to `localStorage` every 3s and on `beforeunload`. Drafts <24h old surface as a Resume banner on `/write`; resuming preserves the keystroke timeline so the integrity score remains coherent. Drafts are cleared on successful certification.
- **Share + embed surface on `/success`** — Post-on-X and Share-on-LinkedIn buttons with an auto-generated proof message; a copy-to-clipboard Markdown badge snippet that links any embed back to the verification page. Every embed becomes a recurring brand impression, kicking off the Phase 1.3 flywheel before the full `embed.js` ships.
- **Real `averageWordLength` metric** — previously hard-coded to `5`; now computed from the certified content so the writing-analysis panel reflects actual prose density. Removed an unused `lastContentRef` from `LockedEditor` along the way.

### 6.8 Reliability + config polish (prior revision)
- **WPM divide-by-zero in `Certificate.tsx`** — the PDF certificate's WPM stat could render as `Infinity`/`NaN` for sub-millisecond writing windows; now guarded the same way as the in-app metrics path.
- **Honor `NEXT_PUBLIC_SITE_URL` everywhere** — certificate verify links, the embedded QR code, and the on-page share copy now resolve through the documented env var instead of a hard-coded production domain. Staging, custom domains, and locally-served previews all produce correct proof links.
- **Server-side certification gate** — `/api/documents` now rejects submissions with fewer than 10 words *or* an empty keystroke trace. The 10-word minimum was previously enforced only in the client editor, so a direct POST could mint a hash for an empty document.
- **Shared `getScoreLabel()` helper** — the duplicated label/colour mapping in `success/[hash]` and `verify/[hash]` is now exported from `lib/metrics.ts`, so changes to score thresholds propagate everywhere at once (mirrors the prior dedupe of the integrity-score calculation).

### 6.9 Stickiness + fidelity polish (prior revision)
- **Cold-visitor share + embed on `/verify/<hash>`** — the share/embed surface that previously only lived on `/success` is now mirrored on the public verification page, so anyone arriving via a shared link can copy the proof link, post to X/LinkedIn, or grab the Markdown badge to embed. Closes the second-order distribution gap that was blocking the embed flywheel.
- **Faithful-cased keystroke playback** — the `/verify/<hash>` playback used to reconstruct the document from raw key codes (`KeyH` → `h`), so a piece titled "Hello" played back as "hello" before snapping to the final cased text. Playback is now driven positionally from the certified content while keystroke timings still control the typing/deletion rhythm. Result: the playback matches the document the visitor is verifying, end-to-end.
- **Single `getSiteUrl()` helper** — the four-times-duplicated `process.env.NEXT_PUBLIC_SITE_URL || 'https://bymyownhand.com'` pattern is collapsed into one helper in `lib/site.ts`. The `/success` embed badge image URL was the last place still hard-coded to the production domain (so a staging-generated badge pointed its logo at production); it now honors the env var like everything else.

### 6.10 Discovery + embed-format polish (prior revision)
- **Real `/sitemap.xml` and `/robots.txt` routes** — `public/robots.txt` had been pointing at a `/sitemap.xml` URL that 404'd, so search engines couldn't discover the 44+ blog posts or the marketing surfaces. Both are now generated from `app/sitemap.ts` and `app/robots.ts`, resolved through `getSiteUrl()`, and the sitemap enumerates `/`, `/write`, `/blog`, and every blog post with appropriate `lastModified` and `changeFrequency` hints. Discovery surface for the cross-cutting "Documentation" investment in the roadmap.
- **HTML embed snippet alongside Markdown** — Phase 1.3 (Embeddable badge) now ships a Markdown ↔ HTML toggle on both `/success` and `/verify/<hash>`. WordPress, raw-HTML CMSes, and email signatures accept HTML but strip Markdown; a single-toggle UX widens the set of platforms where the embed flywheel can take root before the full `embed.js` and `iframe` variants ship.
- **Surface `averageWordLength` in writing-analysis panels** — the metric was already computed (§6.7) but never displayed; it's now shown on both `/success/<hash>` and `/verify/<hash>` so the panel reflects all the data we actually capture.
- **Drop the fabricated `integrityScore = 75` fallback on `/verify/<hash>`** — for a document with no keystroke trace (legacy, or trace stripped) the verify page used to render a confident-looking "75 / Good" score. It now renders an explicit "— / No trace" cell so a verifier can never mistake silence for evidence.

### 6.11 Performance + API + embed-validity polish (prior revision)
- **Memoize `getAllPosts()` in `lib/blog.ts`** — `getAllPosts()` is the single source for sitemap, JSON Feed, blog index, individual posts, related-posts, categories, and tags. Each call re-read all 44+ markdown files from disk and re-ran `marked` over them; a single render of `/blog/<slug>` was triggering this work several times. A module-scope cache makes the first call canonical and every subsequent call free, materially reducing cold-start work for the blog index, the post page, and the sitemap that ships every certified URL to search engines.
- **Absolute `verifyUrl` from `POST /api/documents`** — the create-document endpoint returned a relative `/verify/<hash>` URL, which the in-app web client doesn't use (it constructs its own from `window.location.origin`). External API consumers (Phase 2.1) need a full URL they can share unmodified. The route now returns `${getSiteUrl()}/verify/<hash>` so the shape matches the documented Phase 2.1 contract before the public API ships.
- **Valid `height` on the HTML embed snippet** — the HTML badge snippet on `/success` and `/verify/<hash>` rendered `<img ... height="auto" />`. HTML's `height` attribute requires a non-negative integer; `"auto"` is invalid and gets stripped by stricter CMS sanitizers (and tarnishes any HTML-validator scan a publisher might run on the post). Replaced with a real numeric height (`107`, computed from the `363×324` logo at `width=120`) so the badge renders cleanly across every embed target the toggle is meant to support.
- **Sitemap `/blog` `lastModified` anchored to the latest post date** — the blog index entry was emitting `lastModified: new Date()` on every crawl, which is a freshness lie: the page never changes between posts. Search engines re-spent crawl budget on a static index instead of on the new posts they'd actually discover. The entry now uses the most-recent post's date so the index's freshness signal tracks real content changes.

### 6.12 Habit-loop + drift-prevention polish (prior revision)
- **Local-first writing streak on `/success/<hash>`** — first surface for Phase 1.4 (Writing streaks) before the optional accounts in Phase 1.2 land. A new `lib/history.ts` records each certification (hash, ts, word count, score) into `localStorage`; the success page reads back the total count and the consecutive-day streak and renders a calm pill — *"3 certified pieces · 2-day streak"* — directly under the "Document Certified" header. Recording is idempotent on hash, so revisits don't double-count. Same staged-rollout pattern as Phase 1.3 (Markdown badge first, full `embed.js` later): we start the habit-formation feedback loop on day one and migrate to a server-synced shape when accounts ship.
- **Single `buildEmbedSnippets(verifyUrl)` helper in `lib/embed.ts`** — the markdown + HTML embed-badge snippets were defined inline in *both* `success/[hash]` and `verify/[hash]` with the same `width=120, height=107` aspect-ratio comment in each copy. A future tweak (alt-text wording, query-string tracking, a v2 logo URL) had two places to drift from. The snippet generator now lives in one helper, mirroring the prior `getScoreLabel` / `getSiteUrl` consolidations. Drift-prevention before the script-tag and iframe variants land in Phase 1.3.
- **Defensive blog-date handling in `sitemap.ts` and `feed.json`** — posts with a missing or unparseable `date` used to fall through into the sitemap with `lastModified=now` (the same freshness-lie pattern §6.11 just fixed for `/blog`) and into the JSON Feed with a literal `"T00:00:00Z"` `date_published` (which most feed validators reject — a bad signal for Phase 4.1's opt-in feed work and any partner ingesting the feed). Both routes now skip such posts entirely rather than emit a misleading entry. Today's content corpus all parses cleanly; the change protects discovery surface against a future post landing without a date in frontmatter.

### 6.22 Resume-timeline + draft-schema + dead-hash + sitemap-freshness polish (this revision)
- **Resume-session timeline rebase in `LockedEditor`** — a draft saved at minute 5 of writing, then resumed 23h later, used to anchor new keystroke timestamps against the *original* `startTime`. The first resumed event's `t` was therefore ~`5min + 23h ≈ 82,800,000ms`, and the gap between the last saved event and that first new event was an ~83M-ms "interval" — which the `pauseCount` filter (`> 2000ms`) counted as one bogus pause, blew up `avgKeystrokeInterval`, and the elapsed-time toolbar displayed "23h" instead of "5m." The certificate PDF, the `/verify/<hash>` Duration cell, and WPM were all polluted by the same inflated window. On resume we now rebase `startTime` to `Date.now() - lastEventT - 1ms`, so the first new keystroke lands 1ms after the last saved one and the entire trace reads as one continuous writing session — and the original wall-clock start is preserved separately so the certified `startedAt` still reflects when the writer first opened the editor. Correctness fix in the same spirit as the §6.13 DST-safe streak arithmetic and the §6.20 keystroke whitelist: keystroke-derived metrics must reflect the writing the writer actually did.
- **Strict schema check in `loadDraft()`** — the loader previously gated only on `parsed?.content` and `typeof parsed.startTime === 'number'`, so a corrupted or tampered `bmoh:draft:v1` payload with a missing `events` array, a non-string `title`, or a non-finite `savedAt`/`blockedPasteCount` would slip through and crash downstream code: the resume-timeline rebase reads `events.reduce(...)`, `calculateMetrics()` filters across `events`, and the autosave persist callback reuses the snapshot's `sessionId`. The loader now type-checks every field, discards the storage entry on any mismatch, and falls back to a fresh session — the same trust-boundary principle as the prior server-side `wordCount` (§6.15), `title` (§6.19), `writingTimeMs` (§6.20), and trace-size (§6.21) gates, applied to the local-storage trust boundary that backs draft resumption.
- **Dropped the broken-and-unused `createContentHash()`** — `lib/hash.ts` exported a `createContentHash(content, metadata)` that embedded `Date.now()` in the input being hashed, so the same `(content, metadata)` pair produced a different SHA-256 every call. That makes it useless as a content hash (its stated purpose) — and worse, a trap for Phase 3.1 (Tamper-evident hashing): a future engineer reaching for the obvious function name would get non-deterministic results, then have to figure out why their signature check kept failing. The function had zero call sites. Removing it parallels the §6.18 fix that stripped a phantom `integrityScore` parameter from `createDocument` — both shape the API surface to honestly reflect what the codebase actually does.
- **Sitemap `/` and `/write` `lastModified` anchored to content freshness** — completes the freshness-honesty sweep §6.11 started for `/blog`. The two static surfaces still emitted `lastModified: new Date()` on every crawl, telling search engines the homepage and the editor change every visit. Crawlers spent budget re-fetching unchanged pages instead of on the new posts they'd actually discover. Both URLs now anchor to the most-recent post date (the homepage features blog content, so its meaningful freshness signal is when site content last changed; `/write` is a stable editor surface that rarely changes — under-promising freshness is fine). Same freshness-lie shape as the prior `/blog` fix; closes the last surface still mis-reporting "always-fresh."

### 6.21 Blog-index drift + WPM-helper + trace-size trust-boundary polish (prior revision)
- **Blog-index tag filter uses the `visibleTags()` helper** — `/blog/<slug>` was migrated to the case-insensitive `visibleTags()` helper in §6.18, but the blog index (`/blog`) was missed and still filtered tags inline with a case-sensitive `['ByMyOwnHand', 'Next.js'].includes(t)` check in three call sites (the featured-post chip row, the category-card chip rows, and the same set on related-post chips on the index). The drift had a real consequence: a post tagged literally `bymyownhand` (lowercase) or `Next.JS` (mixed-case) would be filtered out of the global tag cloud in the sidebar but *not* out of the post-card chips on the same page — exactly the inconsistency §6.18 set out to fix. All three call sites now go through `visibleTags()` and the dead inline function is removed. Drift-prevention sibling of the prior `getScoreLabel` / `getSiteUrl` / `buildEmbedSnippets` / `countWords` consolidations.
- **Single `computeWpm()` helper in `lib/metrics.ts`** — the `writingTimeMs > 0 ? (wordCount / writingTimeMs) * 60000 : 0` formula was duplicated four times: the integrity-score branches in `calculateIntegrityScore()`, the writing-analysis panel on `/success/<hash>`, the same panel on `/verify/<hash>`, and the WPM stat in the certificate PDF. Three copies rounded for display, one stayed raw for the `>150` / `>200` threshold checks. A future tweak (different divide-by-zero behavior, a "ms vs ns" precision change, a different rounding rule for the certificate) had four places to drift from — and the same divide-by-zero bug that §6.8 fixed in `Certificate.tsx` had originally existed because the math was inlined per surface in the first place. The formula now lives once in `computeWpm()`, with display sites rounding the result themselves. Same drift-prevention shape as the prior `getScoreLabel` / `countWords` / `buildEmbedSnippets` / `buildVerifyUrl` consolidations.
- **Server-side cap on the keystroke trace size in `POST /api/documents`** — completes the trust-boundary series alongside the §6.15 `wordCount`, §6.19 `title`, and §6.20 `writingTimeMs` server-side sanitization. The route validated that `session.events` was a non-empty array but didn't cap its length; a direct API caller could POST a multi-million-event trace and balloon the `keystroke_data` JSONB column (Neon's row-size limit is generous but not infinite) and tank `/verify/<hash>` playback for that hash on every pageload (the page deserializes and walks the full trace). The route now rejects traces over 250k events with `413 Payload Too Large` — a generous bound (a 5,000-word essay typed character-by-character is ~30k events; 250k is ~8× the longest plausible writing window). Same trust-boundary shape as the prior server-side gates: the server is the canonical source for what it admits.

### 6.20 Keystroke-coverage + draft-durability + success-parity + writing-window-trust polish (prior revision)
- **Keystroke whitelist now covers the keys real writers actually use** — `LockedEditor` only recorded events whose `KeyboardEvent.code` matched `Key*`, `Digit*`, `Space`, `Enter`, `Bracket*`, `Quote*`, `Comma`, `Period`, or `Semicolon`. That dropped *every* hyphen (`-` / `Minus`), forward-slash (`/` / `Slash`), backslash (`\` / `Backslash`), equal sign (`=` / `Equal`), backtick (`` ` `` / `Backquote`), tab character, and the entire `Numpad*` family from the trace. A writer using compound words ("self-aware"), dates ("5/17/2026"), or a numpad had those keystrokes silently missing — which deflates `avgKeystrokeInterval`, `keystrokeVariance`, `pauseCount`, and `longestBurst` against the real writing session, and the integrity score derived from them. The whitelist now covers `Minus` / `Equal` / `Slash` / `Backslash` / `Backquote` / `IntlBackslash` / `Tab` / `Numpad*` so every typed character lands in the trace.
- **Draft autosave actually ticks every 3 seconds** — the autosave effect's deps included `content` (and `title`, `blockedPasteCount`), so each keystroke cleared the running interval and started a fresh 3000ms timer. A writer typing continuously would never see an autosave fire until they paused for ≥3s; the only safety net was the `beforeunload` listener, which fires on tab close but not on a browser crash, OS sleep, or process kill. The persist callback now reads the latest snapshot through a ref, so the interval can be set up once (when `isRecording` flips true) and tick steadily — matching the §6.7 intent that the localStorage snapshot exists *as durability* against a closed tab, not just as a tab-close handler.
- **WPM parity between `/success/<hash>` and `/verify/<hash>` writing-analysis panels** — the two surfaces had drifted: `/verify` showed `WPM` as the seventh metric, while `/success` showed `Blocked Pastes`. But `Blocked Pastes` is *already* in the top stats grid above the analysis panel on `/success` — a true duplicate, taking a slot that could surface WPM (which actually drives the integrity-score penalty branches at >150 and >200 WPM). The analysis panels on the two pages now display the same seven metrics in the same order. Drift-prevention sibling of the variance-formatting parity fix in §6.14 and the prior `getScoreLabel` / `getSiteUrl` / `buildEmbedSnippets` / `countWords` consolidations.
- **Server-side sanitization of the writing window in `POST /api/documents`** — §6.15 closed the `wordCount` trust boundary and §6.19 closed the matching one on `title`; this closes the third, on `writingTimeMs`. The route computed `(session.endedAt || Date.now()) - session.startedAt` and persisted the result directly. A direct API caller could send `startedAt` in the future, a non-numeric `endedAt`, or an inverted pair — producing a negative, NaN, or absurdly large `writing_time_ms` that gets persisted and downstream tarnishes WPM, the verify page's Duration cell, and the certificate PDF (where it could even feed back into `wordCount / writingTimeMs * 60000 = Infinity`). The route now coerces both timestamps through `Number()`, falls back to `Date.now()` on a non-finite `endedAt`, and persists `0` whenever the resulting window is non-finite or non-positive — same trust-boundary shape as the prior server-side gates.

### 6.19 Share-URL drift-prevention + write-page schema-honesty + trust-boundary + double-submit polish (prior revision)
- **Single `buildTweetUrl()` / `buildLinkedInShareUrl()` helper in `lib/share.ts`** — the `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}` and `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(verifyUrl)}` patterns lived inline in both `/success/<hash>` and `/verify/<hash>`. The tweet *text* deliberately differs between the two surfaces ("I wrote …" in first person on `/success`; "[title] was written by hand …" in third person on `/verify`, since a visitor on the verify page is often not the author) — so the text templates stay at the call sites and only the intent-URL wrapping is consolidated. A future tweak (UTM tagging, swapping intent endpoints, adding a Bluesky/Mastodon target) now lands in one place. Same drift-prevention shape as the prior `getScoreLabel` / `getSiteUrl` / `buildEmbedSnippets` / `buildVerifyUrl` / `countWords` consolidations.
- **Dropped the unverified `FAQPage` JSON-LD from `/write`** — the page emitted a `FAQPage` block with two Q&A pairs ("Why is it important to prove my writing is human?", "How does By My Own Hand help …?") that *aren't visible anywhere on the page* — `/write` is just the locked editor. Google's FAQ schema requires the Q&A content to be visible to users at the same URL; an invisible-FAQ block is a structured-data policy violation that can flag the site in Search Console. Google also deprecated FAQ rich results in August 2023 (only government/health sites still surface them), so the block was carrying real schema-policy risk for zero SEO upside. Same "no fabricated evidence" honesty principle as the §6.10 fake-integrity-score fix, the §6.14 fabricated-Pastes-Blocked fix, the §6.15 broken-`wp-content`-logo fix, and the §6.16 fake-`SearchAction` fix.
- **Server-side title sanitization in `POST /api/documents`** — §6.15 closed the wordCount trust boundary; this closes the matching one on `title`. The route accepted any truthy string, so a direct API caller could submit `title: "   "` (whitespace only) and persist that as the document's title — rendering blank on `/verify/<hash>`, on the certificate PDF header, in the OG/Twitter share preview, and on any future profile/leaderboard surface. The route now trims the incoming title, falls back to the same `'Untitled Document'` placeholder the web client uses, and caps to 200 characters so a maliciously long title can't blow up the persisted record. Trust-boundary fix paralleling the server-computed `wordCount` from §6.15 — the server is the canonical source for what it admits.
- **Double-submit guard in `LockedEditor`** — a rapid double-click on Complete fired `onComplete` twice, which the parent `/write` page handled by issuing two `POST /api/documents` calls in parallel. Each call returns a *different* `verificationHash`, and the parent then races on `router.push(/success/<hash>)` while writing only the second response to `sessionStorage.lastSession`. End state: the URL bar shows one hash, `sessionStorage` points at the other, and `/success/<hash>`'s hash-match check bounces the writer to `/verify/<hash>` (where their session-cached data isn't available either) — a confusing "did I just certify or not?" failure mode that was easiest to trigger on touch devices with sticky tap behavior. The Complete button now reads `isSubmitting` from the parent and is `disabled` for the duration of the POST. If the parent's submission errors out, it already resets `isSubmitting` to surface the red error pill — and the button re-enables so the writer can retry. Correctness fix in the same spirit as the prior server-side gates.

### 6.18 Blog-post-page honesty + drift-prevention polish (prior revision)
- **JSON-LD honesty sweep on `/blog/<slug>`** — the §6.14–§6.17 sweep fixed hard-coded production URLs, broken `/images/logo.png` paths, fake `SearchAction` blocks, and `2024-01-01` `Article` freshness lies across `/`, `/write`, and `/blog`. The individual blog-post page was the last surface still emitting a defective `BlogPosting` block: `publisher.logo.url` was a relative `/logo.svg` (invalid in a JSON-LD context — stricter parsers drop the field entirely), `author` was hard-coded to the organization name even though `parsePost()` already extracted a per-post `author` from frontmatter (the §6.17 feed fix had already corrected this for `/api/blog/feed.json`), and the block omitted `dateModified`, `mainEntityOfPage`, and `image` — three fields Google requires for the Article rich result. Logo URLs now resolve through `getSiteUrl()`, `author` typed as a `Person` when frontmatter provides one (Organization fallback), and the three missing fields are filled in. `/`, `/write`, `/blog`, and `/blog/<slug>` now emit consistent, honest, rich-result-eligible structured data.
- **Frontmatter `author` honored on the blog-post page** — the §6.17 feed fix corrected `/api/blog/feed.json`; two surfaces were still hard-coding the house byline. (1) The OG/Twitter metadata in `generateMetadata` emitted `authors: ['By My Own Hand']` for every post, so a LinkedIn or X preview attributed every piece to the org. (2) The on-page byline under the post header rendered the literal string "By My Own Hand". Both surfaces now resolve `post.author || 'By My Own Hand'`, so a guest-authored post (or any post whose frontmatter names an author) gets correct attribution on social previews, the byline, and the JSON-LD `author` field in one coherent set.
- **Single `visibleTags()` / `isVisibleTag()` helper in `lib/blog.ts`** — `getAllTags()` in `lib/blog.ts` filtered noise tags (`bymyownhand`, `next.js`) via a case-insensitive `FILTERED_TAGS.has(tag.toLowerCase())` check, but the blog-post page filtered the same set inline with a *case-sensitive* `['ByMyOwnHand', 'Next.js'].includes(tag)` — in two places (the post-header chip row and the related-post chip rows). The drift had a real consequence: a post tagged literally `bymyownhand` (lowercase) or `BYMYOWNHAND` would be filtered out of the global tag cloud but *not* out of the per-post chip rows, leaking the noise tag onto reader-facing surfaces. Filtering now goes through one helper that uses the case-insensitive contract. Same drift-prevention shape as the prior `getScoreLabel` / `getSiteUrl` / `buildEmbedSnippets` / `countWords` consolidations.
- **`createDocument` signature stops advertising a column it never persists** — `lib/db.ts:createDocument` accepted an `integrityScore: number` parameter that the SQL INSERT never used, because the integrity score is derived from the keystroke trace at read time on `/verify/<hash>` (the trace is the canonical record). The phantom parameter would mislead a future reader — or a future migration author — into believing the column existed. The signature now reflects what's actually stored, with a comment naming where the score is recomputed. Same honesty principle as the prior "no fabricated evidence" series.
- **`LockedEditor` uses the shared `clearDraft()` helper** — on successful submission the editor was inlining `try { window.localStorage.removeItem(DRAFT_STORAGE_KEY); } catch {}` instead of calling the `clearDraft()` helper that already exists in `lib/draft.ts`. A future change to the draft-clearing rule (e.g., bumping the storage-key version, archiving instead of deleting) had two places to drift from. Drift-prevention sibling of the prior consolidations.

### 6.17 Blog JSON-LD honesty + metrics + playback-fidelity + feed-author polish (prior revision)
- **Completed the JSON-LD honesty sweep on `/blog`** — §6.14–§6.16 fixed hard-coded production URLs, broken `/images/logo.png` paths, fake `SearchAction` blocks, and permanent-`2024-01-01` `Article` freshness lies on `/` and `/write`, but `/blog` carried the identical set of defects and was simply missed. Worse, its three `<script type="application/ld+json">` blocks were nested *inside* the `{featured && (...)}` section, so a crawl of a `/blog` with no featured post emitted no structured data at all — the same emission bug §6.14 fixed on `/write`. The blocks now render unconditionally, resolve through `getSiteUrl()`, point `Organization.logo` at the real `/logo.svg`, and drop both the fake blog-search `SearchAction` (this site has no `/blog?s=` route) and the wrong-type `Article` block (an index page isn't an article; the block also carried a doubled `"Blog | By My Own Hand | By My Own Hand"` headline). `/`, `/write`, and `/blog` now emit consistent, honest structured data.
- **`longestBurst` floors at 1 for any keystroke trace** — `calculateMetrics()` initialized `longestBurst = 0` and only ever raised it when two keystrokes landed <500ms apart. A deliberate writer whose every keystroke is spaced >500ms apart — exactly the careful, human cadence the product exists to certify — got `longestBurst = 0`, rendered as "0 chars" on the certificate and the verify panel even though they'd typed hundreds of characters. It now floors at 1 whenever any key events exist, so the metric never understates a real writing session.
- **Internal-paste events included in `/verify/<hash>` playback** — the positional playback walker (§6.9) filtered the keystroke trace to `key` and `delete` events only. Intra-editor copy/paste is explicitly *allowed* by the locked editor and recorded as `paste_internal` with a `len`; excluding it left the playback cursor short of the real content length on any document that used internal paste, so the replay ended early and then snapped to the full text. Playback now consumes `paste_internal` events and advances the cursor by their `len`. Fidelity sibling of the faithful-cased-playback fix.
- **JSON Feed honors the post's `author` frontmatter** — `parsePost()` already parses an `author` field into `BlogPost.author`, and the content corpus uses it, but `/api/blog/feed.json` hard-coded `authors: [{ name: 'By My Own Hand' }]` for every item, discarding the per-post author. The feed now emits `post.author` with the site name as a fallback — a correctness fix for Phase 4.1's opt-in feed work and any partner already ingesting the feed.

### 6.16 SEO-honesty + verify-URL drift-prevention + filename-safety polish (prior revision)
- **Drop the fake `SearchAction` from `/` and `/write` JSON-LD** — both pages were emitting a `WebSite` schema block with `potentialAction: SearchAction { target: "${siteUrl}/?s={search_term_string}" }` (a WordPress-style search URL). This site has no `/?s=` route, no search UI, and no plan to add one in Phase 1. Declaring the action couldn't enable Sitelinks Search Box (Google checks the target) and was a freshness lie of the same shape as the prior "no fabricated evidence" series (§6.10, §6.14). Both blocks now drop `potentialAction` entirely. Same honesty principle that drove the "— / No trace" fixes on `/verify/<hash>`: don't claim evidence we can't produce.
- **`/write` JSON-LD URLs honor `getSiteUrl()`** — §6.15 fixed the homepage's hard-coded `https://bymyownhand.com` URLs in JSON-LD; the matching three blocks on `/write` still had the production domain baked in. Both `Organization.url` / `Organization.logo` and `WebSite.url` now resolve through `getSiteUrl()`, so staging and local-preview pages emit their own canonical instead of pointing structured data at production. Drift-prevention parity with `/`.
- **Single `buildVerifyUrl(hash)` helper in `lib/site.ts`** — the `typeof window !== 'undefined' ? \`${window.location.origin}/verify/${hash}\` : \`${getSiteUrl()}/verify/${hash}\`` pattern was duplicated across `/success/<hash>` and `/verify/<hash>`. The next tweak — query-string tracking, a custom-domain branch (Phase 4.4), a profile-anchored variant once accounts ship (Phase 1.2) — had two places to drift from. The helper now lives once in `lib/site.ts`, mirroring the prior `getScoreLabel` / `buildEmbedSnippets` / `countWords` consolidations.
- **Safe certificate PDF filename for non-Latin titles** — `DownloadCertificate` built the download filename as `title.replace(/[^a-z0-9]/gi, '-').toLowerCase()`, which strips every non-Latin character. A title in Japanese, Cyrillic, Arabic, or rich with emoji collapsed entirely to dashes (or to an empty string), producing identical `-certificate.pdf` filenames across certifications and an unopenable file on some operating systems. The slug now trims leading/trailing dashes and falls back to the verification hash whenever the slug collapses to empty, so every certificate downloads with a distinct, valid filename — a real correctness fix for the global writer audience Phase 1 is meant to serve.

### 6.15 Homepage SEO + server-side trust + embed-fallback polish (prior revision)
- **Homepage JSON-LD no longer hard-codes the production URL or a broken logo path** — the three `<script type="application/ld+json">` blocks on `/` had `https://bymyownhand.com` baked in and pointed `Organization.logo` / `Article.image` at `https://bymyownhand.com/wp-content/uploads/2024/01/logo.png` (a path that does not exist on this Next.js site — the real logo is `/logo.svg`). The `Article` block additionally carried `datePublished: 2024-01-01` / `dateModified: 2024-01-01`, a permanent freshness lie that degrades the homepage's SEO signal. URLs now resolve through `getSiteUrl()` (so staging/local-preview emit their own canonical), the broken `wp-content` image is replaced with `/logo.svg`, and the homepage `Article` block — which was wrong both because the homepage isn't an article and because every field in it was misleading — is dropped. Same shape as the prior `/write` JSON-LD fix in §6.14.
- **Server-side recompute of `wordCount` in `POST /api/documents`** — the route already validated `countWords(session.content) >= 10` server-side (§6.8), but then persisted the *client-supplied* `session.wordCount` into `documents.word_count`. A direct API caller could mint a 12-word certificate that claimed 10,000 words in the stored record (and on the verification page, the certificate PDF, and any future profile/leaderboard surface). The value now comes from the same `countWords()` helper that gates the threshold, so the persisted count and the contract that admitted the document agree by construction. Trust-boundary fix: the server is now the canonical source for both the gate and the record.
- **Absolute `verifyUrl` SSR fallback on `/success/<hash>`** — the success page falls back to a relative `/verify/<hash>` URL when `typeof window === 'undefined'` (initial server render), while `/verify/<hash>` was already using `getSiteUrl()` for the same fallback. The mismatch means the embed-badge snippet emitted in initial HTML on `/success` carries a relative proof link until hydration replaces it. Now both pages resolve the SSR fallback through `getSiteUrl()`. Drift-prevention sibling of the prior `getSiteUrl` / `buildEmbedSnippets` / `getScoreLabel` / `countWords` consolidations.
- **`blog.ts` uses the shared `countWords()` helper** — `parsePost()` was computing the post's read-time from a bespoke `body.split(/\s+/).length` (counts an empty leading whitespace token as a word; doesn't trim). The shared `countWords()` helper exists exactly to keep word-counting consistent across surfaces and was already in use in the editor, the resume banner, the API gate, and the metrics path. Blog read-time now goes through the same contract — the same kind of consolidation as §6.13's removal of the five duplicated regexes.

### 6.14 Verify-honesty + SEO-emission + cold-success polish (prior revision)
- **No fabricated "0 Pastes Blocked" on `/verify/<hash>` for trace-less docs** — §6.10 already replaced the fabricated `integrityScore = 75` fallback with an explicit "— / No trace" cell. The `Pastes Blocked` cell on the same row was still rendering a confident `0` for the same trace-less documents (`{metrics?.blockedPastes || 0}`), painting "we ran the paste-blocking check and saw zero attempts" when in fact we have no evidence either way. The cell now mirrors the integrity-score treatment: render `metrics.blockedPastes` when a trace exists, otherwise show "— / No trace". Closes the second half of the same honesty principle in one place.
- **JSON-LD on `/write` no longer hidden behind a submission-error pill** — the four `<script type="application/ld+json">` blocks recently injected on `/write` were nested *inside* the `{error && (...)}` conditional that wraps the red error pill. The page only emitted structured data when a submission attempt had just failed — i.e., never on a normal crawl. The scripts also referenced a nonexistent `/images/logo.png` URL. They now render unconditionally as siblings of the header (with the duplicate Article block dropped because the homepage already publishes one, and the broken logo URL replaced with the real `/logo.svg`). Search engines and AI scrapers see the structured data on every load instead of only the error path.
- **Cold `/success/<hash>` redirects to `/verify/<hash>`** — opening `/success/<hash>` from a bookmark or after `sessionStorage` had been cleared used to render a placeholder card showing the user's own document with `0 words / 0s / 0 Low` stats — confusing, and worse, suggesting a fresh certification had just been recorded (which `recordCertification()` would then have written to the local streak history with bogus zeros). The page now `router.replace()`s to `/verify/<hash>` whenever `lastSession` is missing or its hash doesn't match the URL — `/verify/<hash>` already knows how to fetch from the DB or fail clearly when neither source has the document. Same shape as the other "no fabricated evidence" fixes.
- **Variance formatting parity between `/success` and `/verify`** — `/verify` rendered keystroke variance as `metrics.keystrokeVariance.toFixed(2)` (always two decimals, e.g. `0.20`); `/success` rendered the same metric as `String(session.metrics.keystrokeVariance)` (raw, e.g. `0.2`). Visually inconsistent for a writer who lands on `/success` then clicks through to `/verify`. Same metric, same formatting now. Drift-prevention sibling of the prior `getScoreLabel` / `getSiteUrl` / `buildEmbedSnippets` / `countWords` consolidations.

### 6.13 Streak-correctness + caching + drift-prevention polish (prior revision)
- **DST-safe streak day arithmetic in `lib/history.ts`** — the `summarize()` walker stepped backward through days by subtracting `24 * 60 * 60 * 1000` from the cursor's epoch-ms. Across DST transitions a calendar day is 23h or 25h, so a fixed 24h step can land on the same calendar day (skipping the boundary day) or two days back (counting a missing day as present). The streak counter would have undercounted or overcounted exactly once a year for any writer with an active streak across the spring-forward / fall-back boundaries. Day arithmetic now goes through a `setDate()`-based `addDays()` helper, which always moves by one local calendar day — the same unit `dayKey()` compares. Real correctness fix for the Phase 1.4 surface that just shipped.
- **Caching on `GET /api/documents/[hash]` for found documents** — a certified document is immutable (its hash, content, keystroke trace, and `certified_at` never change after creation), but the verify endpoint was returning every successful response with no `Cache-Control` header. Cold-visitor pageloads from a shared verify link (the embed flywheel target) and external API consumers (Phase 2.1, the just-aligned absolute `verifyUrl`) round-tripped Neon for every view. The route now sets `public, max-age=300, s-maxage=86400, stale-while-revalidate=86400` on found responses so Vercel's edge cache absorbs the load and the database serves only the first-ever fetch per hash + day. 404 responses still have no cache directive, so a revoked or yet-to-be-created hash isn't sticky.
- **Single `countWords()` / `splitWords()` helper in `lib/metrics.ts`** — the same `content.trim().split(/\s+/).filter(Boolean)` regex existed five times: the editor's live word counter (`LockedEditor`), the `Resume draft` banner's word summary (`/write`), the API submission gate (`POST /api/documents`), the `averageWordLength` calculator (`metrics.ts`), and the resume-banner display. Five copies meant the next change to the word-counting rule (whether to count em-dashes as separators, what to do with zero-width joiners, etc.) had five places to drift from — and the 10-word certification gate is exactly the kind of rule we never want to silently disagree about between the client editor and the server submission check. The regex now lives once in `countWords()`/`splitWords()`. Mirrors the prior `getScoreLabel`, `getSiteUrl`, `buildEmbedSnippets` consolidations.

---

## 7. Out of Scope (for now)

- Rich text formatting, images, embedded media.
- Real-time collaboration / multiplayer documents.
- Server-side AI-content scoring of finished text (we score the *process*, not the output).
- Mobile-native apps. (The web app is mobile-responsive but optimized for keyboard input.)
- Identity verification of the writer beyond the act of writing itself (no KYC, no biometrics).

---

## 8. Stickiness Strategy

The platform is currently a single-shot tool: write once, share once, leave. To increase return-rate and stickiness with the target audience we are investing in:

1. **A persistent author identity** — optional accounts so writers can collect their certified pieces in one shareable profile.
2. **Embeddable verification badges** — a one-line `<script>` writers paste on Substack, Ghost, personal sites — every certified piece on the open web becomes a backlink and a brand impression. *(Phase 1.3, partially live: the success page now ships a copyable Markdown badge.)*
3. **Writing streaks & habits** — gamified "7-day human-written streak" emails turn the certifier into a daily writing ritual. *(Phase 1.4, partially live: `/success/<hash>` now shows total certifications and the consecutive-day streak from `localStorage`.)*
4. **Saved drafts** — `localStorage`-backed in-progress drafts so a closed tab doesn't lose work. *(Shipped in this revision.)*
5. **Native social distribution** — one-click "Post on X" / "Share on LinkedIn" actions auto-write the proof copy so sharing happens inside the success flow. *(Shipped in this revision.)*
6. **API + integrations** — a public API for educators, hiring platforms, and CMS plugins (WordPress, Ghost, Substack) so verification happens where writers already work.
7. **Public proof feed** — an opt-in feed of recently certified pieces; signals network activity, drives discovery.

These are detailed and sequenced in [ROADMAP.md](ROADMAP.md).

---

## 9. Success Metrics

| Tier | Metric | Why |
|---|---|---|
| **Activation** | % of `/write` visits that result in a submission | Measures how often the lockdown editor converts intent into proof. |
| **Sharing** | Verify-link clicks per submitted document | Each share is a marketing event; high shares per doc = product-market fit. |
| **Retention** | Weekly returning writers (after week-1) | The single biggest gap today; addressed by streaks, accounts, drafts. |
| **Embed adoption** | Live verification badges in the wild | The flywheel: every embed is a recurring impression. |
| **Integrity health** | Distribution of integrity scores | Sanity check that the scoring isn't trivially gamed or punishingly strict. |

---

## 10. Non-Negotiable Principles

1. **No AI-generated text is acceptable on the platform.** The point of the product collapses if pasted AI text gets a high score.
2. **The editor is a writing surface, not a panopticon.** We capture timing, not webcam, not screen, not biometrics.
3. **Verification must be readable by a human in under 10 seconds.** A glance at `/verify/<hash>` should answer the question "was this human-written?" without explanation.
4. **The brand is calm, literary, premium.** Cream backgrounds, deep blue ink, slow easings. The product is not a fraud-detection tool; it is a craftsmanship signal.

---

## 11. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| **Adversarial keystroke replay** — someone scripts a "natural" typing cadence to fake a human session. | Future: model human cadence with richer features (digraph timing, error-correction patterns, mouse activity). Track and flag suspiciously regular distributions. |
| **AI dictation tools** — user dictates AI-generated text into the editor. | Server-side check that final content statistical fingerprint matches keystroke trace; future: voice-input detection. |
| **False positives punish slow writers** — careful, deliberate writers may look "robotic." | The score is descriptive, not judgmental. UI messaging emphasizes the keystroke trace itself as the proof, not the score. |
| **Database optionality drift** — `sessionStorage`-only flow breaks when users open the verify link in a new browser. | The `DATABASE_URL` path is the production canonical. Add a clear hosted-DB requirement before paid launch. |
| **Single-use product** — users certify once and never return. | Stickiness initiatives in §8 / [ROADMAP.md](ROADMAP.md). |
