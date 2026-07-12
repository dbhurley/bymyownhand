import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  trailingSlash: false,

  // Site-wide response headers. The PRD's privacy pillar is explicit — we
  // capture "timing only, never your screen, webcam, or biometrics" — and the
  // cross-cutting Privacy investment names SOC2 alignment and "no third-party
  // trackers on /write or /verify/*". These headers make that stance
  // enforceable at the platform layer rather than only stated in copy:
  //
  //  - `Permissions-Policy: camera=(), microphone=(), geolocation=()`
  //    hard-denies the exact sensor APIs the privacy promise disclaims, so no
  //    script (ours or an injected one) can even prompt for them. On-brand and
  //    zero-risk: the editor, PDF flow, and playback use none of these.
  //  - `X-Content-Type-Options: nosniff` stops MIME-sniffing — relevant for
  //    the JSON Feed and the `/api/documents/*` JSON responses, which should be
  //    interpreted as their declared type, not sniffed into something
  //    executable.
  //  - `Referrer-Policy: strict-origin-when-cross-origin` keeps full proof-page
  //    URLs (e.g. a `/verify/<hash>`) from leaking their path in the `Referer`
  //    header to third-party destinations a shared link is opened toward.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
      // Clickjacking protection for the interactive surfaces only. `/write` (the
      // locked editor) and `/success/*` (the post-certification page) are never
      // meant to be embedded in a third-party frame — a framed editor is a
      // classic clickjacking vector (an attacker overlays it to capture or
      // misdirect the writer's input), and neither page is part of the embed
      // flywheel. `frame-ancestors 'self'` (modern CSP directive) plus the
      // legacy `X-Frame-Options: SAMEORIGIN` fallback deny cross-origin framing
      // while still allowing our own origin. Deliberately scoped, NOT site-wide:
      // `/verify/<hash>`, the blog, and the marketing pages stay framable so the
      // Phase 1.3 `iframe` embed-badge variant remains possible. On-theme with
      // the Privacy/SOC2 cross-cutting investment and the existing header block.
      {
        source: "/write",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'self'" },
        ],
      },
      {
        source: "/success/:path*",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'self'" },
        ],
      },
    ];
  },
};

export default nextConfig;
