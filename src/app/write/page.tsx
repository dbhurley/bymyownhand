'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import type { WritingSession } from '@/lib/types';

// Dynamic import for Monaco to avoid SSR issues
const LockedEditor = dynamic(() => import('@/components/LockedEditor'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full bg-cream">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-deep-blue/20 border-t-deep-blue rounded-full animate-spin" />
        <span className="text-deep-blue/50 font-medium">Preparing your writing environment...</span>
      </div>
    </div>
  ),
});

export default function WritePage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleComplete = async (session: WritingSession) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title || 'Untitled Document',
          session,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit document');
      }

      // Store session data in sessionStorage for the success page
      sessionStorage.setItem('lastSession', JSON.stringify({
        ...session,
        verificationHash: data.verificationHash,
        documentId: data.documentId,
        title: title || 'Untitled Document',
      }));

      // Redirect to success/verification page
      router.push(`/success/${data.verificationHash}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 flex flex-col bg-cream overflow-hidden">
      {/* Header */}
      <header className="flex-shrink-0 flex items-center justify-between px-4 md:px-6 py-3 md:py-4 border-b border-deep-blue/10 bg-cream/80 backdrop-blur-sm">
        <Link href="/" className="flex items-center gap-2 md:gap-3 hover:opacity-70 transition-opacity">
          <svg width="24" height="24" viewBox="0 0 32 32" fill="none" className="text-deep-blue">
            <path d="M8 28L16 4L24 28" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M10 20H22" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <span className="font-semibold text-deep-blue hidden sm:inline">By My Own Hand</span>
        </Link>
        
        <div className="flex items-center gap-4">
          {error && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 border border-red-200 rounded-lg">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-red-500">
                <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M8 4V9M8 11V12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <span className="text-sm text-red-600">{error}</span>
            </div>
          )}
          {isSubmitting && (
            <div className="flex items-center gap-2 px-4 py-2 bg-deep-blue/5 rounded-lg">
              <div className="w-4 h-4 border-2 border-deep-blue/30 border-t-deep-blue rounded-full animate-spin" />
              <span className="text-sm text-deep-blue/70">Certifying your work...</span>
            </div>
          )}
        </div>
      </header>

      {/* Editor */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <LockedEditor
          title={title}
          onTitleChange={setTitle}
          onComplete={handleComplete}
        />
      </div>
    </div>
  );
}
