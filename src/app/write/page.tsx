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
      <div className="text-deep-blue/50">Loading editor...</div>
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
      <header className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-deep-blue/10">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-xl">✍️</span>
          <span className="font-semibold text-deep-blue">By My Own Hand</span>
        </Link>
        
        <div className="flex items-center gap-4">
          {error && (
            <span className="text-sm text-red-600">{error}</span>
          )}
          {isSubmitting && (
            <span className="text-sm text-deep-blue/60">Submitting...</span>
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
