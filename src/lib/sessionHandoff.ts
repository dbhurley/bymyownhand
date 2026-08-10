import { isValidVerificationHash } from './hash';
import { countWords, isValidKeystrokeEvent } from './metrics';
import {
  MAX_DOCUMENT_TITLE_LENGTH,
  type WritingMetrics,
  type WritingSession,
} from './types';

const SESSION_HANDOFF_KEY = 'lastSession';

export interface SessionHandoff extends WritingSession {
  verificationHash: string;
  documentId: string;
  title: string;
  endedAt: number;
  metrics: WritingMetrics;
  integrityScore: number;
}

function isNonNegativeInteger(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 0;
}

function isValidWritingMetrics(value: unknown): value is WritingMetrics {
  if (!value || typeof value !== 'object') return false;
  const metrics = value as Record<string, unknown>;
  return (
    Number.isFinite(metrics.avgKeystrokeInterval) &&
    Number.isFinite(metrics.keystrokeVariance) &&
    (metrics.keystrokeVariance as number) >= 0 &&
    isNonNegativeInteger(metrics.pauseCount) &&
    Number.isFinite(metrics.deletionRate) &&
    (metrics.deletionRate as number) >= 0 &&
    (metrics.deletionRate as number) <= 1 &&
    isNonNegativeInteger(metrics.blockedPastes) &&
    isNonNegativeInteger(metrics.longestBurst) &&
    Number.isFinite(metrics.averageWordLength) &&
    (metrics.averageWordLength as number) >= 0
  );
}

// sessionStorage is only a handoff cache, but it is still an external trust
// boundary. Both `/success` and `/verify` render nearly every field in this
// payload, and their former validators disagreed: success checked only the hash,
// while verify checked the hash, content, and start time. A partial value could
// therefore strand the writer on success or reach playback with malformed
// events/metrics. Keep the complete contract here so both routes accept exactly
// the same app-minted payload.
export function isValidSessionHandoff(value: unknown): value is SessionHandoff {
  if (!value || typeof value !== 'object') return false;
  const session = value as Record<string, unknown>;
  if (
    typeof session.id !== 'string' ||
    !session.id ||
    typeof session.documentId !== 'string' ||
    !session.documentId ||
    typeof session.verificationHash !== 'string' ||
    !isValidVerificationHash(session.verificationHash) ||
    typeof session.title !== 'string' ||
    !session.title ||
    session.title.length > MAX_DOCUMENT_TITLE_LENGTH ||
    typeof session.content !== 'string' ||
    !session.content ||
    !Number.isFinite(session.startedAt) ||
    (session.startedAt as number) <= 0 ||
    !Number.isFinite(session.endedAt) ||
    (session.endedAt as number) < (session.startedAt as number) ||
    !isNonNegativeInteger(session.wordCount) ||
    session.wordCount !== countWords(session.content as string) ||
    !Number.isFinite(session.integrityScore) ||
    (session.integrityScore as number) < 0 ||
    (session.integrityScore as number) > 100 ||
    !Array.isArray(session.events) ||
    session.events.length === 0 ||
    !session.events.every(isValidKeystrokeEvent) ||
    !isValidWritingMetrics(session.metrics)
  ) {
    return false;
  }
  return true;
}

// Storage access itself can throw when browser privacy settings disable it; a
// try/catch around JSON.parse alone does not cover that case. Return null for
// every unavailable/corrupt/mismatched handoff and let callers use their normal
// durable `/verify` path.
export function readSessionHandoff(expectedHash: string): SessionHandoff | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(SESSION_HANDOFF_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isValidSessionHandoff(parsed) && parsed.verificationHash === expectedHash
      ? parsed
      : null;
  } catch {
    return null;
  }
}

export function writeSessionHandoff(handoff: SessionHandoff): boolean {
  if (typeof window === 'undefined' || !isValidSessionHandoff(handoff)) return false;
  try {
    window.sessionStorage.setItem(SESSION_HANDOFF_KEY, JSON.stringify(handoff));
    return true;
  } catch {
    return false;
  }
}
