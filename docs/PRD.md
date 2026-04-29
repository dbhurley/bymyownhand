# By My Own Hand — Product Requirements Document

> **Last updated:** 2026-04-29
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

### 6.8 Reliability + config polish (this revision)
- **WPM divide-by-zero in `Certificate.tsx`** — the PDF certificate's WPM stat could render as `Infinity`/`NaN` for sub-millisecond writing windows; now guarded the same way as the in-app metrics path.
- **Honor `NEXT_PUBLIC_SITE_URL` everywhere** — certificate verify links, the embedded QR code, and the on-page share copy now resolve through the documented env var instead of a hard-coded production domain. Staging, custom domains, and locally-served previews all produce correct proof links.
- **Server-side certification gate** — `/api/documents` now rejects submissions with fewer than 10 words *or* an empty keystroke trace. The 10-word minimum was previously enforced only in the client editor, so a direct POST could mint a hash for an empty document.
- **Shared `getScoreLabel()` helper** — the duplicated label/colour mapping in `success/[hash]` and `verify/[hash]` is now exported from `lib/metrics.ts`, so changes to score thresholds propagate everywhere at once (mirrors the prior dedupe of the integrity-score calculation).

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
3. **Writing streaks & habits** — gamified "7-day human-written streak" emails turn the certifier into a daily writing ritual.
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
