import { nanoid } from 'nanoid';

// Generate a verification hash for a document
export function generateVerificationHash(): string {
  // Use nanoid for URL-safe unique IDs
  // Format: bmoh-xxxx-xxxx-xxxx (16 chars)
  const id = nanoid(12);
  return `bmoh-${id.slice(0, 4)}-${id.slice(4, 8)}-${id.slice(8, 12)}`;
}

// Create a content hash for integrity verification
export async function createContentHash(content: string, metadata: object): Promise<string> {
  const data = JSON.stringify({ content, metadata, timestamp: Date.now() });
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(data));
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
