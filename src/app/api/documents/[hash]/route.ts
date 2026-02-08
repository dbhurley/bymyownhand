import { NextRequest, NextResponse } from 'next/server';
import { getDocumentByHash } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ hash: string }> }
) {
  try {
    const { hash } = await params;

    if (!hash) {
      return NextResponse.json(
        { error: 'Missing verification hash' },
        { status: 400 }
      );
    }

    // Try to get from database
    if (process.env.DATABASE_URL) {
      try {
        const document = await getDocumentByHash(hash);
        if (document) {
          return NextResponse.json({
            success: true,
            document: {
              id: document.id,
              title: document.title,
              content: document.content,
              wordCount: document.word_count,
              writingTimeMs: document.writing_time_ms,
              verificationHash: document.verification_hash,
              status: document.status,
              createdAt: document.created_at,
              certifiedAt: document.certified_at,
              keystrokeData: document.keystroke_data,
            },
          });
        }
      } catch (dbError) {
        console.error('Database error:', dbError);
      }
    }

    // For MVP demo, return a mock if not found in DB
    // In production, this would return 404
    return NextResponse.json(
      { error: 'Document not found' },
      { status: 404 }
    );
  } catch (error) {
    console.error('Error fetching document:', error);
    return NextResponse.json(
      { error: 'Failed to fetch document' },
      { status: 500 }
    );
  }
}
