'use client';

import { useState } from 'react';
import { pdf } from '@react-pdf/renderer';
import QRCode from 'qrcode';
import { Certificate } from './Certificate';
import type { WritingMetrics } from '@/lib/types';
import { getCanonicalVerifyUrl } from '@/lib/site';

interface DownloadCertificateProps {
  title: string;
  wordCount: number;
  writingTimeMs: number;
  verificationHash: string;
  metrics: WritingMetrics;
  integrityScore: number;
}

export function DownloadCertificate({
  title,
  wordCount,
  writingTimeMs,
  verificationHash,
  metrics,
  integrityScore,
}: DownloadCertificateProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDownload = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      // Generate QR code
      const verifyUrl = getCanonicalVerifyUrl(verificationHash);
      const qrCodeDataUrl = await QRCode.toDataURL(verifyUrl, {
        width: 200,
        margin: 1,
        color: {
          dark: '#1e3a5f',
          light: '#ffffff',
        },
      });

      // Generate PDF
      const blob = await pdf(
        <Certificate
          title={title}
          wordCount={wordCount}
          writingTimeMs={writingTimeMs}
          verificationHash={verificationHash}
          metrics={metrics}
          integrityScore={integrityScore}
          certifiedAt={new Date()}
          qrCodeDataUrl={qrCodeDataUrl}
        />
      ).toBlob();

      // Download. Filename slug strips non-Latin characters (so titles in
      // Japanese, Cyrillic, Arabic, etc. would collapse to dashes only and
      // produce identical filenames across certifications). Fall back to the
      // verification hash whenever the slug collapses to nothing useful, so
      // every certificate gets a distinct, openable filename.
      const slug = title.replace(/[^a-z0-9]/gi, '-').replace(/^-+|-+$/g, '').toLowerCase();
      const safeSlug = slug || verificationHash;
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${safeSlug}-certificate.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error generating PDF:', error);
      // Surface the failure inline rather than via a blocking `alert()` modal —
      // a native alert is jarring and breaks the "calm, premium" brand pillar,
      // and (unlike the inline error pattern already used on /write) steals
      // focus and can't be styled. The retry path is the same button below.
      setError('Could not generate the certificate. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        onClick={handleDownload}
        disabled={isGenerating}
        className="flex items-center justify-center gap-2 px-6 py-3 bg-accent text-white rounded-lg font-medium hover:bg-accent/90 transition-colors disabled:opacity-50"
      >
        {isGenerating ? (
          <>
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Generating...
          </>
        ) : (
          <>
            <span>📄</span>
            Download Certificate
          </>
        )}
      </button>
      {error && (
        <p role="alert" className="text-xs text-red-600 text-center">
          {error}
        </p>
      )}
    </div>
  );
}
