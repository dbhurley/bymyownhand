import { nanoid } from 'nanoid';

// Generate a verification hash for a document
export function generateVerificationHash(): string {
  // Use nanoid for URL-safe unique IDs
  // Format: bmoh-xxxx-xxxx-xxxx (16 chars)
  const id = nanoid(12);
  return `bmoh-${id.slice(0, 4)}-${id.slice(4, 8)}-${id.slice(8, 12)}`;
}
