# By My Own Hand — Roadmap

> **Last updated:** 2026-05-06
> Companion to [PRD.md](PRD.md). Items are grouped by phase, not by date — phase boundaries shift with traction signals.

The North Star: **make the act of writing — verifiably and beautifully human — a daily ritual that writers proudly share.**

---

## Phase 0 — Foundation (shipped)

- ✅ Locked Monaco editor with paste/drag-drop blocking and keystroke capture
- ✅ Keystroke metrics + 0–100 integrity score
- ✅ Verification page with keystroke playback at 3× speed
- ✅ Shareable `bmoh-xxxx-xxxx-xxxx` proof links
- ✅ PDF certificate download
- ✅ Optional Neon Postgres persistence (graceful in-memory fallback)
- ✅ 44+ blog posts on identity, AI, content provenance
- ✅ JSON Feed, llms.txt, humans.txt, Open Graph + Twitter card metadata, canonical URL

### Reliability & polish (prior revision)
- ✅ Fixed WPM scoring bug — `>200 WPM` rule was unreachable; reordered branches and guarded divide-by-zero
- ✅ Removed duplicated integrity-scoring logic in the verify page; now sourced from `lib/metrics.ts`
- ✅ Footer copyright year is now dynamic
- ✅ Added `metadataBase`, `alternates.canonical`, `twitter` card, `keywords`, and `robots` directives so shared verification links and the marketing site render rich previews on social

### Stickiness foundations (prior revision)
- ✅ **Draft auto-save** — `localStorage` snapshot every 3s and on `beforeunload`; Resume banner on `/write` for drafts <24h old; resuming preserves the keystroke trace so integrity scoring stays coherent
- ✅ **Share + embed surface** — Post-on-X / Share-on-LinkedIn buttons on `/success`, plus a copyable Markdown badge snippet (first surface for Phase 1.3 before `embed.js` ships)
- ✅ **Real `averageWordLength` metric** — computed from certified content instead of the previous hard-coded `5`; removed dead `lastContentRef` in `LockedEditor`

### Reliability + config polish (prior revision)
- ✅ **WPM divide-by-zero guard in the PDF certificate** — `Certificate.tsx` was still computing `wordCount / writingTimeMs` unguarded; now matches the prior fix in `lib/metrics.ts`
- ✅ **Site URL via `NEXT_PUBLIC_SITE_URL`** — Certificate verify links and the QR code in `DownloadCertificate` now honor the documented env var instead of hard-coding the production domain
- ✅ **Server-side 10-word + keystroke-trace gate** in `POST /api/documents` so a direct API call can no longer mint certificates for empty or trace-less documents
- ✅ **Shared `getScoreLabel()` helper** in `lib/metrics.ts` — collapses two identical copies in `success/[hash]` and `verify/[hash]` into one source of truth (parallels the prior dedupe of `calculateIntegrityScore`)

### Stickiness + fidelity polish (prior revision)
- ✅ **Share + embed surface on `/verify/<hash>`** — Phase 1.5 ☐ item now shipped: cold visitors can copy the proof link, post to X/LinkedIn, or copy the Markdown embed badge directly from the verification page. Removes the second-order friction blocking the embed flywheel.
- ✅ **Faithful-cased keystroke playback** — playback in `/verify/<hash>` used to reconstruct text from raw key codes, so cased letters always rendered lowercase until the final snap. Playback is now driven positionally from the certified content while keystroke timing still controls the typing/deletion rhythm.
- ✅ **`getSiteUrl()` helper in `lib/site.ts`** — collapses four duplicated copies of the `NEXT_PUBLIC_SITE_URL` env-var fallback into one source of truth, and fixes the last hard-coded `bymyownhand.com/logo.svg` URL in the success-page embed badge so staging-generated badges no longer point their logo at production.

### Discovery + embed-format polish (prior revision)
- ✅ **Generated `/sitemap.xml` + `/robots.txt`** — `public/robots.txt` had been pointing at a sitemap URL that 404'd, blocking search-engine discovery of the 44+ blog posts. Both are now `app/sitemap.ts` / `app/robots.ts` routes resolved through `getSiteUrl()`, and the sitemap enumerates `/`, `/write`, `/blog`, and every blog post with `lastModified` derived from the post date.
- ✅ **HTML embed snippet alongside Markdown** — Phase 1.3 step: both `/success` and `/verify/<hash>` now offer a Markdown ↔ HTML toggle for the embed badge, expanding the set of platforms (WordPress, raw-HTML CMSes, email signatures) where writers can plant a "Verified Human" backlink.
- ✅ **`averageWordLength` surfaced in writing-analysis panels** — the metric was already computed but never displayed; it now shows on both `/success` and `/verify` so the panel reflects every metric we capture.
- ✅ **No fabricated integrity score for trace-less docs** — `/verify/<hash>` used to default to `integrityScore = 75` when keystroke metrics were missing, painting a confident "Good" cell for documents with no evidence. It now renders an explicit "— / No trace" cell instead.

### Performance + API + embed-validity polish (prior revision)
- ✅ **Memoized `getAllPosts()`** — `lib/blog.ts` now caches the parsed post list in module scope, so sitemap, JSON Feed, blog index, post pages, related-posts, categories, and tags all share one filesystem read + markdown-parse pass per server lifetime instead of per-call. Materially cuts cold-start work for `/blog`, `/blog/<slug>`, and `/sitemap.xml`.
- ✅ **`POST /api/documents` returns an absolute `verifyUrl`** — the response previously emitted `/verify/<hash>` (relative). External API consumers (Phase 2.1) need a full URL; the in-app web client constructs its own from `window.location.origin`, so this change costs the client nothing and gets the response shape aligned with the documented public-API contract before that phase ships.
- ✅ **Valid `height` on the HTML embed badge** — replaced the invalid `<img height="auto" />` (HTML attribute requires a non-negative integer; stricter CMS sanitizers strip the attribute entirely) with a numeric `height="107"` derived from the logo's intrinsic `363×324` aspect ratio at `width="120"`. The HTML embed flow now passes validators on the platforms it's meant to land on (WordPress, raw-HTML CMSes, email signatures).
- ✅ **Sitemap `/blog` `lastModified` tracks the latest post date** — the blog index was advertising `now` to crawlers on every request, which is a freshness lie that wastes crawl budget. The entry now anchors to the most-recent post's date so the index gets re-fetched only when actual content changes.

### Habit-loop + drift-prevention polish (this revision)
- ✅ **Local-first writing streak on `/success/<hash>`** — first surface for Phase 1.4 (Writing streaks) before optional accounts ship. New `lib/history.ts` records each certification to `localStorage` and computes the consecutive-day streak; the success page renders a *"N certified pieces · K-day streak"* pill under the confirmation header. Recording is idempotent on hash, so a revisit never double-counts. Same staged-rollout shape as Phase 1.3 (Markdown badge first → `embed.js` later): start the habit-formation feedback loop today, migrate to a server-synced shape when accounts land in Phase 1.2.
- ✅ **Shared `buildEmbedSnippets(verifyUrl)` helper in `lib/embed.ts`** — the markdown + HTML embed snippets and the aspect-ratio comment lived inline in both `success/[hash]` and `verify/[hash]`. The snippet generator now lives in one helper (parallels the prior `getScoreLabel` / `getSiteUrl` consolidations), so a tweak — alt-text wording, query-string tracking, v2 logo URL — only has to land once. Drift-prevention before the `embed.js` and `iframe` variants land.
- ✅ **Defensive blog-date handling in sitemap + JSON Feed** — posts with a missing or unparseable `date` used to leak into the sitemap with `lastModified=now` (the freshness lie this prior revision had just fixed for `/blog`) and into the JSON Feed with a literal `"T00:00:00Z"` `date_published` (which most feed validators reject). Both routes now skip such entries rather than emit a misleading one — protecting discovery surface against a future post landing without a frontmatter date.

---

## Phase 1 — Stickiness Foundations (in flight)

The current product is single-shot. Phase 1 turns each certified piece into a reason to come back tomorrow.

### 1.1 Drafts that survive the tab closing — ✅ shipped
- ✅ Auto-save in-progress drafts to `localStorage` with full keystroke trace.
- ✅ Resume banner on `/write` when an unfinished session exists.
- ☐ Persist drafts to the DB once optional accounts ship (1.2).
- *Why it matters:* Today, an accidental tab-close erases work. That single event kills retention.

### 1.2 Author profiles (optional accounts)
- Email-only sign-in (magic link). No passwords, no OAuth surface area.
- `/u/<handle>` public page listing every certified piece, with their integrity scores and a streak count.
- Wire up the existing `users` table (already in schema, currently unused).
- *Why it matters:* Converts one-time visitors into named writers with a portfolio they can link to.

### 1.3 Embeddable "Verified Human" badge — partial
- ✅ Markdown badge snippet on `/success` and `/verify/<hash>` (copy-and-paste into Substack, Ghost, Notion, READMEs).
- ✅ HTML badge snippet alongside Markdown (toggle on `/success` + `/verify`) — covers WordPress, raw-HTML CMSes, and email signatures that strip Markdown.
- ☐ One-line `<script src="https://bymyownhand.com/embed.js" data-hash="bmoh-..." />` snippet that renders a small trust badge linking to the verification page.
- ☐ `iframe` variant for hosts that strip script tags.
- *Why it matters:* Every embed is a backlink, a recurring brand impression, and a network effect — the badge in the wild becomes the marketing surface.

### 1.4 Writing streaks — partial
- ✅ Local-first total + consecutive-day streak surfaced on `/success/<hash>` via `lib/history.ts` (`localStorage`-backed, idempotent on hash). First surface before accounts; migrates to a server-synced record once 1.2 lands.
- ☐ Streak counter on the profile (`N consecutive days with a certified piece`).
- ☐ Optional weekly digest email: "You wrote 4 pieces this week, 92 avg integrity score."
- *Why it matters:* Habit formation. Converts a tool into a daily ritual.

### 1.5 Verification page UX upgrades — partial
- ✅ "Post on X" / "Share on LinkedIn" buttons live on the `/success` confirmation page with auto-generated proof copy.
- ✅ Share + embed surface mirrored on `/verify/<hash>` — copy-link, Post on X, LinkedIn, and Markdown embed badge are now available directly to cold visitors.
- ☐ A static OG image for `/verify/<hash>` that renders the title + integrity score + word count, so social shares look polished.
- ☐ "How we verified this" expandable explainer (educates first-time visitors who arrived via a shared link).

---

## Phase 2 — Distribution

### 2.1 Public API (read + write)
- `POST /api/v1/sessions` to ingest external keystroke recordings (for partners building their own editor).
- `GET /api/v1/verify/<hash>` for programmatic verification.
- Token-scoped API keys per author profile.

### 2.2 CMS integrations
- **WordPress plugin** — adds a "Compose in By My Own Hand" button to the editor; the certified hash is stored in post meta and rendered as a badge on the front-end.
- **Ghost & Substack** — publish a copyable snippet that injects the badge.
- **Notion** — public page badge via the embed.

### 2.3 Browser extension
- Right-click any text field on the open web → "Compose this in By My Own Hand" → opens the locked editor and pastes the result back when certified.

### 2.4 Education partner program
- A free tier for instructors with classroom dashboards: per-student session list, configurable minimums (word count, time on task).
- Integrity score is *advisory*, never punitive — surfaces the playback so instructors can review the writing process themselves.

---

## Phase 3 — Hardening the Proof

### 3.1 Tamper-evident hashing
- Sign each certified document with a server-held key.
- Surface a public verification endpoint: given the document content + keystroke trace, recompute the signature and confirm it matches.

### 3.2 Adversarial-replay defense
- Track digraph timings (the rhythm between specific letter pairs) — much harder to script convincingly than average WPM.
- Flag suspiciously regular distributions (low entropy across multiple sessions from the same account).
- Optional opt-in mouse-movement and focus-event capture for stronger signals (clearly disclosed; off by default).

### 3.3 Voice-input / dictation detection
- Detect bursts of perfectly-spelled multi-word inserts inconsistent with character-by-character keystrokes.
- Allow voice-input as an explicit *mode* (with clear labeling on the certificate) rather than silently allowing it to inflate scores.

### 3.4 Optional content-fingerprint check
- Server-side comparison: does the final content reconstruct from the keystroke trace? Mismatches indicate something post-edited the buffer outside our capture path.

---

## Phase 4 — Network & Discovery

### 4.1 Public feed (opt-in)
- "Recently certified" page showing public submissions from authors who opt in. RSS + JSON Feed.

### 4.2 Categories & tags on submissions
- Authors can tag certified pieces (`essay`, `cover-letter`, `journalism`, `fiction`).
- Tag-based browsing on profiles and on the public feed.

### 4.3 "Verified human" leaderboards
- Most active certifiers this week, by category.
- Lightweight, opt-in, *not* gamified to encourage low-quality writing — the leaderboard ranks consistency, not volume.

### 4.4 Custom verification domains
- For publications: `verify.theirpublication.com` resolves to a co-branded verify page so their proof links live on their own domain.

---

## Phase 5 — Monetization (only after Phase 1–2 traction)

| Tier | Audience | Includes |
|---|---|---|
| **Free** | Casual writers | Unlimited single-document certifications, public profile, badge embed. |
| **Writer Pro** | Daily writers | Custom profile domain, private documents, no branding on certificates, advanced analytics on writing habits. |
| **Education** | Instructors & schools | Classroom dashboards, bulk seats, SSO, FERPA-aligned data handling. |
| **API / Enterprise** | CMS partners, hiring platforms | API quota, custom verification domain, SLA, white-label. |

---

## Cross-cutting investments (always-on)

- **Performance**: editor first-paint <1s on a cold mobile load.
- **Accessibility**: full keyboard navigation, screen-reader-friendly playback transcript.
- **Privacy**: SOC2 alignment, clear data-deletion controls, no third-party trackers on `/write` or `/verify/*`.
- **Documentation**: a `/docs` site with API reference, embed examples, and best-practice guides for educators and publishers.

---

## What we are deliberately *not* doing

- Real-time collaboration / multiplayer documents (we're a single-author craftsmanship tool).
- AI content scoring of arbitrary uploaded text (we score the *process*, not the output — uploaded text has no process to score).
- Mobile-native apps before the web app's writing experience is best-in-class.
- Identity verification beyond the act of writing itself — no KYC, no biometrics, no webcam.
