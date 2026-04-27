# By My Own Hand — Roadmap

> **Last updated:** 2026-04-27
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

### Reliability & polish (this revision)
- ✅ Fixed WPM scoring bug — `>200 WPM` rule was unreachable; reordered branches and guarded divide-by-zero
- ✅ Removed duplicated integrity-scoring logic in the verify page; now sourced from `lib/metrics.ts`
- ✅ Footer copyright year is now dynamic
- ✅ Added `metadataBase`, `alternates.canonical`, `twitter` card, `keywords`, and `robots` directives so shared verification links and the marketing site render rich previews on social

---

## Phase 1 — Stickiness Foundations (next)

The current product is single-shot. Phase 1 turns each certified piece into a reason to come back tomorrow.

### 1.1 Drafts that survive the tab closing
- Auto-save in-progress drafts to `localStorage` (and to the DB if signed in).
- Resume banner on `/write` when an unfinished session exists.
- *Why it matters:* Today, an accidental tab-close erases work. That single event kills retention.

### 1.2 Author profiles (optional accounts)
- Email-only sign-in (magic link). No passwords, no OAuth surface area.
- `/u/<handle>` public page listing every certified piece, with their integrity scores and a streak count.
- Wire up the existing `users` table (already in schema, currently unused).
- *Why it matters:* Converts one-time visitors into named writers with a portfolio they can link to.

### 1.3 Embeddable "Verified Human" badge
- One-line `<script src="https://bymyownhand.com/embed.js" data-hash="bmoh-..." />` snippet that renders a small trust badge linking to the verification page.
- Optional `iframe` and Markdown variants for Substack/Ghost/Notion.
- *Why it matters:* Every embed is a backlink, a recurring brand impression, and a network effect — the badge in the wild becomes the marketing surface.

### 1.4 Writing streaks
- Streak counter on the profile (`N consecutive days with a certified piece`).
- Optional weekly digest email: "You wrote 4 pieces this week, 92 avg integrity score."
- *Why it matters:* Habit formation. Converts a tool into a daily ritual.

### 1.5 Verification page UX upgrades
- "Tweet this proof" / "Copy LinkedIn snippet" share buttons with auto-generated copy.
- A static OG image for `/verify/<hash>` that renders the title + integrity score + word count, so social shares look polished.
- "How we verified this" expandable explainer (educates first-time visitors who arrived via a shared link).

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
