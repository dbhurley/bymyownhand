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
        <div className="w-10 h-10 border-2 border-deep-blue/15 border-t-deep-blue/60 rounded-full animate-spin" />
        <span className="text-deep-blue/40 text-sm">Preparing your writing environment...</span>
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
      <header className="flex-shrink-0 flex items-center justify-between px-5 md:px-8 py-3 md:py-4 border-b border-deep-blue/[0.06]">
        <Link href="/" className="flex items-center gap-2.5 hover:opacity-70 transition-opacity">
          <img src="/logo.svg" alt="By My Own Hand" width="22" height="20" className="block" />
          <span className="font-semibold text-deep-blue text-sm hidden sm:inline">By My Own Hand</span>
        </Link>

        <div className="flex items-center gap-4">
          {error && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 border border-red-100 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
              <span className="text-xs text-red-600">{error}</span>
            </div>
          )}
          {isSubmitting && (
            <div className="flex items-center gap-2">
              <div className="w-3.5 h-3.5 border-2 border-deep-blue/20 border-t-deep-blue/60 rounded-full animate-spin" />
              <span className="text-xs text-deep-blue/50">Certifying...</span>
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
