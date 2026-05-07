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
          // A certified document is immutable — its hash, content, and
          // keystroke trace never change after `certified_at`. Advertise a
          // long-lived cache so cold-visitor verify pageloads (the embed
          // flywheel target) and external API consumers (Phase 2.1) don't
          // re-hit Neon for each view. `s-maxage` lets Vercel's edge cache
          // it; `stale-while-revalidate` keeps it fresh without blocking.
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
          }, {
            headers: {
              'Cache-Control': 'public, max-age=300, s-maxage=86400, stale-while-revalidate=86400',
            },
          });
        }
      } catch (dbError) {
        console.error('Database error:', dbError);
      }
    }

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
