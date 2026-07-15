import type { Metadata } from "next";
import { Bricolage_Grotesque, Geist_Mono } from "next/font/google";
import "./globals.css";
import { getSiteUrl } from "@/lib/site";
import { ogShareImages, twitterShareImages } from "@/lib/share";

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "By My Own Hand | Prove Your Writing is Human",
    template: "%s | By My Own Hand",
  },
  description: "Certify your writing was created by your own hands. Block AI, capture keystrokes, prove authenticity.",
  applicationName: "By My Own Hand",
  keywords: [
    "human writing",
    "AI detection",
    "writing authenticity",
    "keystroke verification",
    "proof of human",
    "content provenance",
  ],
  alternates: { canonical: "/" },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/logo.svg", type: "image/svg+xml" },
      { url: "/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "By My Own Hand",
    description: "Prove your writing is authentically human — keystroke by keystroke.",
    url: siteUrl,
    siteName: "By My Own Hand",
    type: "website",
    locale: "en_US",
    // A default share image so social previews render a card instead of a bare
    // link. The Twitter card was already declared `summary_large_image` but no
    // image was ever set anywhere, so every share of the marketing site, the
    // editor, and verification links degraded to a text-only preview — a miss
    // for sharing, which the PRD lists as a core success metric (each share is
    // a marketing event). Resolved relative to `metadataBase` above.
    images: ogShareImages("By My Own Hand"),
  },
  twitter: {
    card: "summary_large_image",
    title: "By My Own Hand",
    description: "Prove your writing is authentically human — keystroke by keystroke.",
    images: twitterShareImages("By My Own Hand"),
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Do NOT pin `maximum-scale=1` / `user-scalable=no` — disabling
            pinch-zoom is a WCAG 2.1 SC 1.4.4 (Resize Text) / 1.4.10 (Reflow)
            failure that locks out low-vision readers, and it's flagged by the
            Lighthouse accessibility audit. Our audience reads long-form prose
            on `/verify`, the blog, and the editor, so zoom matters. Keep
            `viewport-fit=cover` for the PWA edge-to-edge layout; let users
            scale. Accessibility is an always-on cross-cutting investment in
            the roadmap, alongside the §6.29 verification-link `aria-label`. */}
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        {/* Brand deep-blue (--deep-blue) for the mobile browser chrome / PWA
            title bar, matching the `theme_color` in app/manifest.ts. Without
            it the address-bar tints to a default, off-brand color on Android
            Chrome and the installed-PWA title bar. The site is light-only
            (cream surface), so a single theme-color is correct — no per-scheme
            variants needed. */}
        <meta name="theme-color" content="#1e3a5f" />
        {/* JSON Feed auto-discovery. The §6.37 fix set the spec-correct
            `application/feed+json` media type on the feed route *so that*
            content-type-sniffing feed readers recognize it as subscribable —
            but a reader can only sniff a feed it can find, and there was no
            `<link rel="alternate">` advertising it anywhere in the document
            head. Declaring it here (raw in <head> rather than via Metadata's
            `alternates.types`, so it survives on the blog routes that override
            `alternates` for their per-page canonical URLs, §6.35) completes the
            autodiscovery path: a reader's "subscribe" on any page now finds the
            blog feed. Discovery-surface sibling of the §6.37 media-type fix. */}
        <link rel="alternate" type="application/feed+json" title="By My Own Hand Blog" href="/api/blog/feed.json" />
      </head>
      <body
        className={`${bricolage.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
