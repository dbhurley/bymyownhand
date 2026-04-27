import type { Metadata } from "next";
import { Bricolage_Grotesque, Geist_Mono } from "next/font/google";
import "./globals.css";

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://bymyownhand.com";

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
  },
  twitter: {
    card: "summary_large_image",
    title: "By My Own Hand",
    description: "Prove your writing is authentically human — keystroke by keystroke.",
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
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body
        className={`${bricolage.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
