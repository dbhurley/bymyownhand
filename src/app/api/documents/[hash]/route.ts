import { NextRequest, NextResponse } from 'next/server';
import { getDocumentByHash } from '@/lib/db';
import { isValidVerificationHash } from '@/lib/hash';

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

    // Reject obviously-invalid hash strings before touching Neon. The route
    // used to issue a `SELECT * FROM documents WHERE verification_hash = $1`
    // for any input, so a misbehaving client (or a crawler hitting random
    // /verify/<garbage> URLs) could spend the database's roundtrip budget on
    // inputs that can't have been minted by `generateVerificationHash()`.
    // Same trust-boundary shape as the prior server-side `wordCount`, `title`,
    // `writingTimeMs`, and trace-size gates.
    if (!isValidVerificationHash(hash)) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // Try to get from database
    if (process.env.DATABASE_URL) {
      let document;
      try {
        document = await getDocumentByHash(hash);
      } catch (dbError) {
        // A database failure is not a missing document, and it must not be
        // reported as one. This block used to `console.error` and fall through
        // to the `404 Document not found` below, which `/verify/<hash>` renders
        // as "This verification link is invalid or the document has been
        // removed" — so a dropped Neon connection, an exhausted pool, or a few
        // seconds of maintenance told every reader of a real, certified proof
        // that the proof did not exist. That is the worst thing this surface can
        // say: `/verify/<hash>` is the cold-visitor entry point the embed
        // flywheel drives traffic to, the claim it makes *is* the product, and a
        // badge in the wild has no way to know it briefly linked to a page
        // denying its own document. The writer has already shared the link and
        // never finds out.
        //
        // `503` names what actually happened — the document may be perfectly
        // fine, the service could not answer right now. `retryable` lets the
        // client tell it from a genuine `404` without parsing prose, and
        // `no-store` keeps a transient failure out of any shared cache: the
        // success response below is deliberately cached for a day, and caching
        // *this* would outlive the outage that produced it.
        console.error('Database error:', dbError);
        return NextResponse.json(
          { error: 'Verification is temporarily unavailable', retryable: true },
          { status: 503, headers: { 'Cache-Control': 'no-store' } }
        );
      }

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
