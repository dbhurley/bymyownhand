import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { generateVerificationHash } from '@/lib/hash';
import { createDocument } from '@/lib/db';
import { getSiteUrl } from '@/lib/site';
import { countWords } from '@/lib/metrics';
import type { WritingSession } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, session } = body as { title: string; session: WritingSession };

    if (!title || !session || !session.content) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Mirror the editor's 10-word submission gate so the API can't be used
    // to mint certificates around documents that never met the threshold.
    // Recompute the count server-side rather than trusting the client-supplied
    // `session.wordCount` — a direct API caller could otherwise certify a
    // 12-word doc while claiming 10,000 words in the persisted record.
    const serverWordCount = countWords(session.content);
    if (serverWordCount < 10) {
      return NextResponse.json(
        { error: 'Document must contain at least 10 words to be certified' },
        { status: 400 }
      );
    }

    if (!Array.isArray(session.events) || session.events.length === 0) {
      return NextResponse.json(
        { error: 'Keystroke trace is required for certification' },
        { status: 400 }
      );
    }

    const docId = nanoid();
    const verificationHash = generateVerificationHash();
    const writingTimeMs = (session.endedAt || Date.now()) - session.startedAt;

    // For MVP without database, store in memory or return hash directly
    // In production, this would save to Neon
    const document = {
      id: docId,
      title,
      content: session.content,
      wordCount: serverWordCount,
      writingTimeMs,
      verificationHash,
      keystrokeData: {
        events: session.events,
        metrics: session.metrics,
      },
      integrityScore: session.integrityScore || 0,
    };

    // Try to save to database if configured
    if (process.env.DATABASE_URL) {
      try {
        await createDocument(document);
      } catch (dbError) {
        console.error('Database error:', dbError);
        // Continue without database for MVP
      }
    }

    // Return an absolute verifyUrl so external API consumers (Phase 2.1) can
    // share the proof link as-is without needing to know the host. The web
    // client (which already lives on the same origin) handles either form.
    return NextResponse.json({
      success: true,
      documentId: docId,
      verificationHash,
      verifyUrl: `${getSiteUrl()}/verify/${verificationHash}`,
    });
  } catch (error) {
    console.error('Error creating document:', error);
    return NextResponse.json(
      { error: 'Failed to create document' },
      { status: 500 }
    );
  }
}
