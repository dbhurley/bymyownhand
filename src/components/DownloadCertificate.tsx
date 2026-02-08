'use client';

import { useState } from 'react';
import { pdf } from '@react-pdf/renderer';
import QRCode from 'qrcode';
import { Certificate } from './Certificate';
import type { WritingMetrics } from '@/lib/types';

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

  const handleDownload = async () => {
    setIsGenerating(true);
    
    try {
      // Generate QR code
      const verifyUrl = `https://bymyownhand.com/verify/${verificationHash}`;
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

      // Download
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-certificate.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate certificate. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
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
  );
}
