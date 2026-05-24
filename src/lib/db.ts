import { neon, NeonQueryFunction } from '@neondatabase/serverless';
import { isValidVerificationHash } from './hash';

// Lazy initialization - only connect when DATABASE_URL is available
let _sql: NeonQueryFunction<false, false> | null = null;

function getSql() {
  if (!process.env.DATABASE_URL) {
    return null;
  }
  if (!_sql) {
    _sql = neon(process.env.DATABASE_URL);
  }
  return _sql;
}

export { getSql as sql };

// Initialize database schema
export async function initializeDatabase() {
  const sql = getSql();
  if (!sql) {
    console.warn('No DATABASE_URL configured, skipping database initialization');
    return;
  }

  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE,
      session_token TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES users(id),
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      word_count INTEGER NOT NULL,
      writing_time_ms BIGINT NOT NULL,
      verification_hash TEXT UNIQUE NOT NULL,
      status TEXT DEFAULT 'draft',
      created_at TIMESTAMP DEFAULT NOW(),
      certified_at TIMESTAMP,
      keystroke_data JSONB
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS writing_sessions (
      id TEXT PRIMARY KEY,
      document_id TEXT REFERENCES documents(id),
      started_at BIGINT NOT NULL,
      ended_at BIGINT,
      keystroke_data JSONB,
      integrity_score INTEGER,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_documents_hash ON documents(verification_hash)
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_documents_user ON documents(user_id)
  `;
}

// Helper to get document by hash
export async function getDocumentByHash(hash: string) {
  const sql = getSql();
  if (!sql) return null;

  // Defense-in-depth at the data-access boundary: reject inputs that can't
  // have been minted by generateVerificationHash() before spending a Neon
  // roundtrip. GET /api/documents/[hash] already gates this at the route, but
  // this helper is a reusable library function and the documented Phase 2.1
  // public API (GET /api/v1/verify/<hash>) will be a second caller — enforcing
  // the same `isValidVerificationHash()` contract once at the query site keeps
  // every caller honest. Same trust-boundary principle the route applies.
  if (!isValidVerificationHash(hash)) return null;

  const results = await sql`
    SELECT * FROM documents WHERE verification_hash = ${hash}
  `;
  return results[0] || null;
}

// Helper to create document. Note: the integrity score is derived from the
// keystroke trace at read time (see lib/metrics.calculateIntegrityScore + the
// /verify/<hash> page), not persisted to its own column — the trace is the
// canonical record. The signature used to accept an `integrityScore` field
// that the INSERT never used, which would mislead a future reader into
// thinking the column existed.
export async function createDocument(doc: {
  id: string;
  title: string;
  content: string;
  wordCount: number;
  writingTimeMs: number;
  verificationHash: string;
  keystrokeData: object;
}) {
  const sql = getSql();
  if (!sql) {
    console.warn('No DATABASE_URL configured, document not persisted');
    return doc;
  }

  await sql`
    INSERT INTO documents (
      id, title, content, word_count, writing_time_ms, 
      verification_hash, status, keystroke_data, certified_at
    ) VALUES (
      ${doc.id}, ${doc.title}, ${doc.content}, ${doc.wordCount},
      ${doc.writingTimeMs}, ${doc.verificationHash}, 'certified',
      ${JSON.stringify(doc.keystrokeData)}, NOW()
    )
  `;
  
  return doc;
}
