'use client';

import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import type { WritingMetrics } from '@/lib/types';
import { computeWpm, formatDuration } from '@/lib/metrics';
import { getCanonicalVerifyUrl } from '@/lib/site';

// The certificate renders in PDF's built-in standard fonts (Helvetica for the
// body, Courier for the hash) rather than a registered web font.
//
// It used to `Font.register()` three Inter weights by URL from
// `fonts.gstatic.com`, which broke the download outright for a plausible class
// of documents: those Google-hosted files are *subset* woff2s, and rendering an
// em dash (U+2014) through them throws `Offset is outside the bounds of the
// DataView` inside the font pipeline — so a writer whose title reads
// "Notes — Draft 2" pressed Download Certificate and got
// "Could not generate the certificate. Please try again." with no retry that
// could ever succeed. Reproduced against these exact three URLs with the
// installed @react-pdf/renderer: plain ASCII, en dash, ellipsis, curly quotes,
// and accented Latin all render; the em dash fails every time. Writers use em
// dashes.
//
// Registering them also made the one durable, portable artifact we hand a
// writer depend on a third-party CDN *at download time* — so the certificate
// failed offline, behind a content blocker that filters `fonts.gstatic.com`, or
// on a network that can't reach Google, and every download made a request to a
// third party from a page about proving one's own work. The standard-14 fonts
// are embedded in every PDF reader: no fetch, no failure mode, and the same
// glyph coverage the subsets actually provided (WinAnsi Latin).

const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#f5f0e8',
    padding: 50,
    fontFamily: 'Helvetica',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 30,
    paddingBottom: 20,
    borderBottom: '2px solid #1e3a5f',
  },
  logo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoText: {
    fontSize: 18,
    fontWeight: 700,
    color: '#1e3a5f',
  },
  badge: {
    backgroundColor: '#059669',
    color: 'white',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    fontSize: 10,
    fontWeight: 600,
  },
  title: {
    fontSize: 32,
    fontWeight: 700,
    color: '#1e3a5f',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#1e3a5f',
    opacity: 0.7,
    textAlign: 'center',
    marginBottom: 40,
  },
  certifyText: {
    fontSize: 12,
    color: '#1e3a5f',
    opacity: 0.6,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: 16,
  },
  documentTitle: {
    fontSize: 24,
    fontWeight: 600,
    color: '#1e3a5f',
    textAlign: 'center',
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 40,
    paddingVertical: 20,
    backgroundColor: 'white',
    borderRadius: 12,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: 700,
    color: '#1e3a5f',
  },
  statLabel: {
    fontSize: 10,
    color: '#1e3a5f',
    opacity: 0.6,
    marginTop: 4,
  },
  metricsSection: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 30,
  },
  metricsTitle: {
    fontSize: 14,
    fontWeight: 600,
    color: '#1e3a5f',
    marginBottom: 16,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  metricItem: {
    width: '30%',
    marginBottom: 12,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: 600,
    color: '#1e3a5f',
  },
  metricLabel: {
    fontSize: 9,
    color: '#1e3a5f',
    opacity: 0.6,
  },
  footer: {
    marginTop: 'auto',
    paddingTop: 20,
    borderTop: '1px solid #1e3a5f33',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  verifySection: {
    flex: 1,
  },
  verifyLabel: {
    fontSize: 9,
    color: '#1e3a5f',
    opacity: 0.6,
    marginBottom: 4,
  },
  verifyHash: {
    fontSize: 12,
    fontFamily: 'Courier',
    color: '#1e3a5f',
  },
  verifyUrl: {
    fontSize: 10,
    color: '#2563eb',
    marginTop: 4,
  },
  qrSection: {
    alignItems: 'center',
  },
  timestamp: {
    fontSize: 9,
    color: '#1e3a5f',
    opacity: 0.5,
    textAlign: 'center',
    marginTop: 20,
  },
});

interface CertificateProps {
  title: string;
  wordCount: number;
  writingTimeMs: number;
  verificationHash: string;
  metrics: WritingMetrics;
  integrityScore: number;
  certifiedAt: Date;
  qrCodeDataUrl?: string;
}

export function Certificate({
  title,
  wordCount,
  writingTimeMs,
  verificationHash,
  metrics,
  integrityScore,
  certifiedAt,
  qrCodeDataUrl,
}: CertificateProps) {
  const verifyUrl = getCanonicalVerifyUrl(verificationHash);
  const wpm = Math.round(computeWpm(wordCount, writingTimeMs));

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logo}>
            <Text style={styles.logoText}>✍️ By My Own Hand</Text>
          </View>
          <Text style={styles.badge}>VERIFIED</Text>
        </View>

        {/* Certificate title */}
        <Text style={styles.title}>Certificate of Authenticity</Text>
        <Text style={styles.subtitle}>This document has been verified as authentically human-written</Text>

        {/* Document info */}
        <Text style={styles.certifyText}>This is to certify that</Text>
        <Text style={styles.documentTitle}>&ldquo;{title}&rdquo;</Text>

        {/* Stats */}
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{wordCount}</Text>
            <Text style={styles.statLabel}>WORDS</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{formatDuration(writingTimeMs)}</Text>
            <Text style={styles.statLabel}>DURATION</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{integrityScore}/100</Text>
            <Text style={styles.statLabel}>AUTHENTICITY</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{wpm}</Text>
            <Text style={styles.statLabel}>WPM</Text>
          </View>
        </View>

        {/* Metrics */}
        <View style={styles.metricsSection}>
          <Text style={styles.metricsTitle}>Writing Analysis</Text>
          <View style={styles.metricsGrid}>
            <View style={styles.metricItem}>
              <Text style={styles.metricValue}>{metrics.avgKeystrokeInterval}ms</Text>
              <Text style={styles.metricLabel}>Avg Keystroke</Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={styles.metricValue}>{metrics.keystrokeVariance.toFixed(2)}</Text>
              <Text style={styles.metricLabel}>Variance</Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={styles.metricValue}>{metrics.pauseCount}</Text>
              <Text style={styles.metricLabel}>Pauses</Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={styles.metricValue}>{(metrics.deletionRate * 100).toFixed(1)}%</Text>
              <Text style={styles.metricLabel}>Deletions</Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={styles.metricValue}>{metrics.longestBurst}</Text>
              <Text style={styles.metricLabel}>Longest Burst</Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={styles.metricValue}>{metrics.blockedPastes}</Text>
              <Text style={styles.metricLabel}>Pastes Blocked</Text>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.verifySection}>
            <Text style={styles.verifyLabel}>Verification Hash</Text>
            <Text style={styles.verifyHash}>{verificationHash}</Text>
            <Text style={styles.verifyUrl}>{verifyUrl}</Text>
          </View>
          {qrCodeDataUrl && (
            <View style={styles.qrSection}>
              {/* This is @react-pdf/renderer's `Image`, which draws into the PDF
                  and has no `alt` concept — the jsx-a11y/alt-text rule (written
                  for DOM <img>) is a false positive here. The QR only encodes
                  the verification URL, which is already printed as text in the
                  footer beside it, so it carries no information a reader loses. */}
              {/* eslint-disable-next-line jsx-a11y/alt-text */}
              <Image src={qrCodeDataUrl} style={{ width: 80, height: 80 }} />
            </View>
          )}
        </View>

        <Text style={styles.timestamp}>
          {/* `certifiedAt` is the moment the PDF is generated (download time),
              not the true certification timestamp, so the certificate
              deliberately renders date-granularity only. The previous call
              also passed `hour`/`minute` options to `toLocaleDateString`, which
              silently ignores them (they belong to `toLocaleString`) — dead
              options that advertised a time-precision this line neither renders
              nor should claim. Dropped in the §6.24 surface-honesty spirit. */}
          Certified on {certifiedAt.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </Text>
      </Page>
    </Document>
  );
}
