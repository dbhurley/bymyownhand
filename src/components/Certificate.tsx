'use client';

import { Document, Page, Text, View, StyleSheet, Font, Image } from '@react-pdf/renderer';
import type { WritingMetrics } from '@/lib/types';
import { formatDuration } from '@/lib/metrics';

// Register fonts
Font.register({
  family: 'Inter',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiJ-Ek-_EeA.woff2' },
    { src: 'https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuGKYAZ9hiJ-Ek-_EeA.woff2', fontWeight: 600 },
    { src: 'https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuFuYAZ9hiJ-Ek-_EeA.woff2', fontWeight: 700 },
  ]
});

const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#f5f0e8',
    padding: 50,
    fontFamily: 'Inter',
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
  qrPlaceholder: {
    width: 80,
    height: 80,
    backgroundColor: '#1e3a5f',
    borderRadius: 4,
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
  const verifyUrl = `https://bymyownhand.com/verify/${verificationHash}`;
  const wpm = Math.round((wordCount / writingTimeMs) * 60000);

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
              <Image src={qrCodeDataUrl} style={{ width: 80, height: 80 }} />
            </View>
          )}
        </View>

        <Text style={styles.timestamp}>
          Certified on {certifiedAt.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>
      </Page>
    </Document>
  );
}
