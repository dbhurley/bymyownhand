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
    const parsed = JSON.parse(raw) as DraftSnapshot;
    if (!parsed?.content || typeof parsed.startTime !== 'number') return null;
    if (Date.now() - parsed.savedAt > DRAFT_MAX_AGE_MS) {
      window.localStorage.removeItem(DRAFT_STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearDraft() {
  if (typeof window === 'undefined') return;
  try { window.localStorage.removeItem(DRAFT_STORAGE_KEY); } catch {}
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
