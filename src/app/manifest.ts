import type { MetadataRoute } from 'next';

// Web App Manifest. The root layout already ships the PWA meta tags
// (`apple-mobile-web-app-capable`, `mobile-web-app-capable`), the icon set
// (`/icon-192x192.png`, `/icon-512x512.png`, `/apple-touch-icon.png`), and the
// `viewport-fit=cover` edge-to-edge layout — everything an installable PWA
// needs *except* the manifest that ties them together. Without it the site
// isn't installable (Chrome/Edge show no "Install app" affordance), and a
// mobile browser has no app name, theme, or background color to render an
// add-to-home-screen entry or a splash screen. The `feed.json` route already
// referred to "the PWA manifest" as if it existed; this makes that real.
//
// Next.js auto-mounts this at `/manifest.webmanifest` and injects the
// `<link rel="manifest">` tag, resolving icons against `metadataBase`.
// Colors mirror the CSS theme in `globals.css` (--deep-blue / --cream).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'By My Own Hand',
    // Home-screen labels truncate past ~12 chars; use the brand shorthand
    // already baked into the verification-hash prefix (`bmoh-…`).
    short_name: 'BMOH',
    description:
      'Certify your writing was created by your own hands. Block AI, capture keystrokes, prove authenticity.',
    start_url: '/',
    display: 'standalone',
    background_color: '#f5f0e8', // --cream
    theme_color: '#1e3a5f', // --deep-blue
    icons: [
      { src: '/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
  };
}
