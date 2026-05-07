'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import type { WritingSession } from '@/lib/types';
import { clearDraft, formatDraftAge, loadDraft, type DraftSnapshot } from '@/lib/draft';
import { countWords } from '@/lib/metrics';

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

type DraftDecision = 'pending' | 'resume' | 'fresh';

export default function WritePage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftSnapshot | null>(null);
  const [decision, setDecision] = useState<DraftDecision>('pending');

  useEffect(() => {
    const existing = loadDraft();
    if (existing) {
      setDraft(existing);
      setTitle(existing.title);
    } else {
      setDecision('fresh');
    }
  }, []);

  const handleResume = () => setDecision('resume');
  const handleDiscard = () => {
    clearDraft();
    setDraft(null);
    setTitle('');
    setDecision('fresh');
  };

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
            
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: `{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "By My Own Hand",
  "url": "https://bymyownhand.com",
  "logo": "https://bymyownhand.com/images/logo.png" 
}` }}
      />
            
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: `{
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "By My Own Hand",
  "url": "https://bymyownhand.com",
  "potentialAction": {
    "@type": "SearchAction",
    "target": "https://bymyownhand.com/?s={search_term_string}",
    "query-input": "required name=search_term_string"
  }
}` }}
      />
            
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: `{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "Prove Your Writing is Human",
  "description": "Certify your writing was created by your own hands. Block AI, capture keystrokes, prove authenticity...",
  "image": "https://bymyownhand.com/images/logo.png",
  "datePublished": "2024-01-01T00:00:00+00:00",
  "dateModified": "2024-01-01T00:00:00+00:00",
  "author": {
    "@type": "Organization",
    "name": "By My Own Hand"
  },
  "publisher": {
    "@type": "Organization",
    "name": "By My Own Hand",
    "logo": {
      "@type": "ImageObject",
      "url": "https://bymyownhand.com/images/logo.png"
    }
  }
}` }}
      />
            
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: `{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [{
    "@type": "Question",
    "name": "Why is it important to prove my writing is human?",
    "acceptedAnswer": {
      "@type": "Answer",
      "text": "It helps to maintain authenticity and originality in a world increasingly influenced by AI-generated content."
    }
  },{
    "@type": "Question",
    "name": "How does By My Own Hand help prove my writing is human?",
    "acceptedAnswer": {
      "@type": "Answer",
      "text": "By capturing keystrokes and analyzing writing patterns, By My Own Hand provides evidence that your writing is genuinely your own."
    }
  }]
}` }}
      />
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
        {decision === 'pending' && draft ? (
          <ResumeBanner
            draft={draft}
            onResume={handleResume}
            onDiscard={handleDiscard}
          />
        ) : decision !== 'pending' ? (
          <LockedEditor
            title={title}
            onTitleChange={setTitle}
            onComplete={handleComplete}
            initialDraft={decision === 'resume' ? draft : null}
          />
        ) : null}
      </div>
    </div>
  );
}

function ResumeBanner({
  draft,
  onResume,
  onDiscard,
}: {
  draft: DraftSnapshot;
  onResume: () => void;
  onDiscard: () => void;
}) {
  const wordCount = countWords(draft.content);
  return (
    <div className="h-full flex items-center justify-center px-6 bg-cream">
      <div className="max-w-md w-full bg-white rounded-2xl border border-deep-blue/[0.08] p-6 md:p-8 shadow-sm">
        <p className="text-xs font-semibold text-deep-blue/30 uppercase tracking-[0.2em] mb-3">
          Unfinished draft
        </p>
        <h2 className="text-2xl font-bold text-deep-blue mb-2 tracking-tight">
          Resume where you left off?
        </h2>
        <p className="text-deep-blue/50 mb-6 leading-relaxed">
          We saved <span className="font-semibold text-deep-blue/70">{draft.title || 'an untitled draft'}</span>
          {' '}({wordCount} word{wordCount === 1 ? '' : 's'}, {formatDraftAge(draft.savedAt)}).
          Resuming preserves your full keystroke trace.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={onResume}
            className="flex-1 px-5 py-3 bg-deep-blue text-cream rounded-full font-medium text-sm hover:bg-deep-blue/90 transition-colors"
          >
            Resume draft
          </button>
          <button
            onClick={onDiscard}
            className="flex-1 px-5 py-3 border border-deep-blue/15 text-deep-blue rounded-full font-medium text-sm hover:bg-deep-blue/5 transition-colors"
          >
            Start fresh
          </button>
        </div>
      </div>
    </div>
  );
}
