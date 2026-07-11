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
    ];
  },
};

export default nextConfig;
