# CLAUDE.md — By My Own Hand

## Project Summary

By My Own Hand is a writing authenticity certification platform. Users write in a locked-down editor that captures every keystroke with precise timing data, blocks external paste, and analyzes typing patterns to produce a human-authenticity score. Upon submission, the document receives a unique verification hash and a shareable proof link. The platform proves that a piece of writing was composed by a human, keystroke by keystroke, in an era of AI-generated content.

- **Website**: [bymyownhand.com](https://bymyownhand.com)
- **Tagline**: "Your words deserve proof."

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16.1.6 (App Router) |
| Language | TypeScript 5 (strict mode) |
| React | 19.2.3 |
| Styling | Tailwind CSS 4 |
| Code Editor | Monaco Editor via `@monaco-editor/react` 4.7.0 |
| Database | Neon Postgres via `@neondatabase/serverless` 1.0.2 (optional) |
| PDF Generation | `@react-pdf/renderer` 4.3.2 |
| PDF Viewing | `react-pdf` 10.3.0 |
| QR Codes | `qrcode` 1.5.4 |
| IDs | `nanoid` 5.1.6 + `uuid` 13.0.0 |
| Content | gray-matter + marked (blog posts) |
| Fonts | Bricolage Grotesque (body), Geist Mono (monospace) |
| Deployment | Vercel |

---

## Project Structure

```
src/
  app/
    api/
      documents/route.ts           # POST: create certified document
      documents/[hash]/route.ts    # GET: retrieve document by verification hash
      blog/feed.json/route.ts      # GET: JSON Feed for blog
    blog/
      page.tsx                     # Blog listing with categories, tags, featured post
      [slug]/page.tsx              # Individual blog post with related posts
      layout.tsx                   # Blog layout wrapper
    write/page.tsx                 # Writing editor page
    verify/[hash]/page.tsx         # Document verification + keystroke playback
    success/[hash]/page.tsx        # Post-submission success page
    page.tsx                       # Marketing landing page
    layout.tsx                     # Root layout (fonts, metadata, PWA meta tags)
    globals.css                    # Tailwind + custom theme (cream/deep-blue palette)
  components/
    LockedEditor.tsx               # Monaco-based locked editor with keystroke capture
    Certificate.tsx                # PDF certificate renderer (@react-pdf)
    DownloadCertificate.tsx        # Certificate download button
  lib/
    types.ts                       # Core types: KeystrokeEvent, WritingMetrics, WritingSession, Document
    db.ts                          # Neon database client + schema initialization + helpers
    hash.ts                        # Verification hash generation (nanoid) + SHA-256 content hash
    metrics.ts                     # Keystroke metric calculation + integrity scoring
    blog.ts                        # Blog post loader with categories, tags, related posts
blog/                              # 44+ markdown blog posts (date-prefixed)
public/
  logo.svg                         # Brand logo (hand/pen icon)
  favicon.ico, icon-*.png          # Favicons and PWA icons
  apple-touch-icon.png             # iOS icon
```

---

## Development Commands

```bash
pnpm install    # Install dependencies
pnpm dev        # Start Next.js dev server (port 3000)
pnpm build      # Production build
pnpm start      # Start production server
pnpm lint       # ESLint
```

---

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Neon Postgres connection string (optional; app works without it for MVP demo) |
| `NEXT_PUBLIC_SITE_URL` | Canonical site URL for JSON Feed and OG tags (default: `https://bymyownhand.com`) |

---

## Database

PostgreSQL on Neon, but optional. The app gracefully degrades without a database connection (documents are not persisted, but the verification flow still works via `sessionStorage`).

### Schema (initialized in `src/lib/db.ts`)

| Table | Columns | Purpose |
|-------|---------|---------|
| `users` | id, email, session_token, created_at | User accounts (not yet used) |
| `documents` | id, user_id, title, content, word_count, writing_time_ms, verification_hash, status, created_at, certified_at, keystroke_data (JSONB) | Certified writing documents |
| `writing_sessions` | id, document_id, started_at, ended_at, keystroke_data (JSONB), integrity_score, created_at | Raw session recordings |

### Indexes

- `idx_documents_hash` on `documents(verification_hash)` -- primary lookup
- `idx_documents_user` on `documents(user_id)` -- user document listing

---

## API Routes

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/documents` | Create a certified document. Accepts `{ title, session: WritingSession }`. Generates verification hash, calculates metrics, persists to DB if configured. Returns `{ documentId, verificationHash, verifyUrl }`. |
| GET | `/api/documents/[hash]` | Retrieve a document by verification hash. Returns full document with keystroke data. Returns 404 if not found. |
| GET | `/api/blog/feed.json` | JSON Feed (v1.1) of all blog posts. Cached for 1 hour. |

---

## Authentication

No authentication is currently implemented. The `users` table exists in the schema but is not used. Documents are created anonymously.

---

## Key Business Logic

### Locked Editor (`src/components/LockedEditor.tsx`)

The core writing experience, built on Monaco Editor:
- **Paste blocking**: Intercepts Cmd+V/Ctrl+V; blocks external clipboard content; allows internal copy/cut/paste within the editor
- **Drag-drop blocking**: Prevents file/text drops
- **Keystroke recording**: Every key event is recorded with timestamp (ms from session start), type (key/delete/paste_blocked/paste_internal), key code, and cursor position
- **Real-time metrics**: Word count, elapsed time, blocked paste count displayed in toolbar
- **Minimum threshold**: 10 words required before submission is enabled
- **Session packaging**: On submit, calculates metrics and integrity score, packages as `WritingSession`

### Keystroke Metrics (`src/lib/metrics.ts`)

`calculateMetrics()` computes from raw keystroke events:
- **avgKeystrokeInterval**: Mean time between keystrokes (ms)
- **keystrokeVariance**: Coefficient of variation (normalized standard deviation)
- **pauseCount**: Number of intervals > 2 seconds (thinking pauses)
- **deletionRate**: Deletions / total keystrokes
- **blockedPastes**: Count of external paste attempts
- **longestBurst**: Longest uninterrupted streak of keystrokes < 500ms apart

### Integrity Score (`src/lib/metrics.ts`)

`calculateIntegrityScore()` produces a 0-100 score:
- Starts at 100
- -10 per blocked paste (max -30)
- -20 if WPM > 150, -40 if WPM > 200
- -15 if keystroke variance < 0.1 (too robotic)
- -10 if no pauses and word count > 100
- -5 if no deletions and word count > 50
- -10 if deletion rate > 30%

### Verification Hash (`src/lib/hash.ts`)

Format: `bmoh-xxxx-xxxx-xxxx` (nanoid-based, 12 characters split into 3 groups of 4)

### Verification Page (`src/app/verify/[hash]/page.tsx`)

Displays:
- Document title, word count, writing duration, integrity score, blocked paste count
- **Writing playback**: Replays the writing process keystroke-by-keystroke with animation (events replayed at 3x speed, max 200ms delay between events)
- Detailed metrics: avg keystroke interval, variance, thinking pauses, deletion rate, longest burst, WPM
- Verification hash display

### Blog System (`src/lib/blog.ts`)

- 44+ markdown blog posts in `blog/` directory
- Posts parsed with gray-matter (frontmatter) and marked (HTML)
- 5 category classifications: Identity & Authentication, AI & Human Oversight, Security & Compliance, Technology & Innovation, Strategy & Industry
- Category assignment via keyword matching against tags and titles
- Related posts algorithm: tag overlap scoring (exact match: 3 points, partial match: 1 point)
- JSON Feed at `/api/blog/feed.json`

---

## Current State / Known Issues

- The database is optional; works without persistence for MVP demo (uses `sessionStorage` for the verification flow)
- No user accounts or authentication implemented yet
- The `users` table schema exists but is unused
- Certificate PDF generation components exist (`Certificate.tsx`, `DownloadCertificate.tsx`) but the QR code and PDF features may not be fully wired up
- Blog has 44+ posts focused on document verification, identity, AI security, and authentication topics
- README.md is the default create-next-app template (not updated)
- No vercel.json configuration file
- The write flow stores session data in `sessionStorage` to bridge the redirect from `/write` to `/success/[hash]`
- PWA meta tags are configured (`apple-mobile-web-app-capable`, viewport with `user-scalable=no`)

---

## Git Remote

- **Repository**: `git@github.com:dbhurley/bymyownhand.git`

---

## Deployment

- **Hosting**: Vercel
- **Domain**: bymyownhand.com
- **Database**: Neon Postgres (optional; app works without it)

---

## Claude Code Guidelines

Behavioral guidelines to reduce common LLM coding mistakes. Bias toward caution over speed.

### Think Before Coding
- State assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them — do not pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what is confusing. Ask.

### Simplicity First
- No features beyond what was asked.
- No abstractions for single-use code.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

### Surgical Changes
- Do not "improve" adjacent code, comments, or formatting.
- Do not refactor things that are not broken.
- Match existing style, even if you would do it differently.
- Every changed line should trace directly to the user's request.

### Goal-Driven Execution
- Transform tasks into verifiable goals with success criteria.
- For multi-step tasks, state a brief plan with verification checkpoints.
- Strong success criteria enable independent work. Weak criteria require constant clarification.
