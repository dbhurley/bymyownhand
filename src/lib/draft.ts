import type { KeystrokeEvent } from './types';

export const DRAFT_STORAGE_KEY = 'bmoh:draft:v1';

// A draft is only worth offering to resume if it's recent enough that the
// keystroke trace remains a coherent record of the same writing session.
export const DRAFT_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24h

export interface DraftSnapshot {
  sessionId: string;
  title: string;
  content: string;
  events: KeystrokeEvent[];
  startTime: number;
  blockedPasteCount: number;
  savedAt: number;
}

export function loadDraft(): DraftSnapshot | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;

    // Strict schema check. A corrupted or tampered localStorage value
    // previously slipped past a `parsed?.content && typeof parsed.startTime === 'number'`
    // check, leaving downstream code (LockedEditor's resume timeline rebase,
    // calculateMetrics, the autosave persist that reuses the snapshot's
    // sessionId) to crash on a missing `events` array, a non-string title,
    // or a non-numeric `savedAt` / `blockedPasteCount`. We'd rather discard a
    // bad draft and start fresh than half-restore a broken one.
    if (!isValidDraftSnapshot(parsed)) {
      window.localStorage.removeItem(DRAFT_STORAGE_KEY);
      return null;
    }
    if (Date.now() - parsed.savedAt > DRAFT_MAX_AGE_MS) {
      window.localStorage.removeItem(DRAFT_STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function isValidDraftSnapshot(value: unknown): value is DraftSnapshot {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.sessionId === 'string' &&
    typeof v.title === 'string' &&
    typeof v.content === 'string' &&
    Array.isArray(v.events) &&
    typeof v.startTime === 'number' &&
    Number.isFinite(v.startTime) &&
    typeof v.blockedPasteCount === 'number' &&
    Number.isFinite(v.blockedPasteCount) &&
    typeof v.savedAt === 'number' &&
    Number.isFinite(v.savedAt)
  );
}

export function clearDraft() {
  if (typeof window === 'undefined') return;
  try { window.localStorage.removeItem(DRAFT_STORAGE_KEY); } catch {}
}

// How long the writer has left to come back for this draft, or `null` once the
// window has closed.
//
// `DRAFT_MAX_AGE_MS` is a hard deadline enforced silently: `loadDraft()` deletes
// an expired draft on the next read and returns nothing, so a writer who left a
// substantial piece behind and came back a day later found no draft, no notice,
// and no explanation — the exact loss Phase 1.1 exists to prevent, arriving
// through the front door instead of a tab close. Both surfaces that announce a
// draft ("saved 23h ago" on `/`, the same on the `/write` resume banner) told
// the writer how old it was and nothing about how long it had left, which is
// the half that would actually get them back into the editor.
//
// Measured from `savedAt`, which the autosave refreshes on every tick — so the
// window is 24h since the writer last worked on the piece, and simply opening
// the draft again extends it.
export function formatDraftExpiry(savedAt: number): string | null {
  const remaining = DRAFT_MAX_AGE_MS - (Date.now() - savedAt);
  if (remaining <= 0) return null;
  const hours = Math.floor(remaining / (60 * 60 * 1000));
  if (hours >= 1) return `expires in ${hours}h`;
  // Floor at one minute rather than showing "expires in 0m" for the last 60
  // seconds of the window.
  const minutes = Math.max(1, Math.floor(remaining / (60 * 1000)));
  return `expires in ${minutes}m`;
}

export function formatDraftAge(savedAt: number): string {
  const seconds = Math.max(1, Math.floor((Date.now() - savedAt) / 1000));
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
