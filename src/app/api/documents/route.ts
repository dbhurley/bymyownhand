import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { generateVerificationHash } from '@/lib/hash';
import { createDocument } from '@/lib/db';
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

    const docId = nanoid();
    const verificationHash = generateVerificationHash();
    const writingTimeMs = (session.endedAt || Date.now()) - session.startedAt;

    // For MVP without database, store in memory or return hash directly
    // In production, this would save to Neon
    const document = {
      id: docId,
      title,
      content: session.content,
      wordCount: session.wordCount,
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

    return NextResponse.json({
      success: true,
      documentId: docId,
      verificationHash,
      verifyUrl: `/verify/${verificationHash}`,
    });
  } catch (error) {
    console.error('Error creating document:', error);
    return NextResponse.json(
      { error: 'Failed to create document' },
      { status: 500 }
    );
  }
}
