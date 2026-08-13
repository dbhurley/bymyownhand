// Local-first writing history. First surface for Phase 1.4 (Writing streaks)
// before optional accounts ship — a writer's certified pieces are recorded in
// localStorage so we can show "Nth certified piece • k-day streak" on
// `/success/<hash>` immediately, without a backend. When accounts arrive in
// Phase 1.2 the same shape will sync server-side; until then this is enough
// to start the habit-formation feedback loop.

import { isValidVerificationHash } from './hash';
import { MAX_DOCUMENT_TITLE_LENGTH } from './types';

const HISTORY_STORAGE_KEY = 'bmoh:history:v1';
const HISTORY_CHANGED_EVENT = 'bmoh:history-changed';
const MAX_ENTRIES = 500;

export interface CertificationRecord {
  hash: string;
  certifiedAt: number; // ms epoch
  wordCount: number;
  integrityScore: number;
  // Optional so records written before the recall list shipped stay valid —
  // they simply render by hash. Never rely on it being present.
  title?: string;
}

export interface StreakSummary {
  total: number;
  streak: number; // consecutive days ending today (or yesterday, if user hasn't certified today)
  best: number; // longest run of consecutive certifying days ever (personal best)
  thisWeek: number; // certifications since local Monday 00:00
  thisWeekWords: number; // words certified in that same local week
  // Whether the run already includes today. A streak anchored on *yesterday* is
  // still active right now but ends at midnight — the one moment in the habit
  // loop where telling the writer changes the outcome. Without this the streak
  // reads identically whether it is banked or expiring.
  certifiedToday: boolean;
}

function readHistory(): CertificationRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Treat the localStorage payload as untrusted: a NaN/Infinity/negative
    // numeric can leak past a `typeof x === 'number'` check and poison
    // `summarize()` (a NaN certifiedAt yields a `NaN-NaN-NaN` dayKey that
    // matches nothing; a negative one becomes a real 1969 Date that adds a
    // phantom day to the streak set). `isValidRecord()` is the single predicate
    // shared with the write boundary below — same trust-boundary shape as the
    // strict draft-snapshot check in `lib/draft.ts` and the server-side
    // `wordCount` / `title` / `writingTimeMs` gates.
    // Normalize the persisted collection as well as each row. `writeHistory()`
    // caps app-authored data and `recordCertification()` is idempotent, but a
    // manually edited payload or a future device-sync merge can still contain
    // duplicate hashes, more than MAX_ENTRIES records, and legacy titles that
    // predate the shared title cap. Those values used to inflate the total,
    // render duplicate React keys in the proof list, and let an arbitrarily
    // large title reach the recall UI. A verification hash identifies one
    // certification, so keep its earliest valid record, normalize the optional
    // display title, sort chronologically, and enforce the same cap on reads
    // that writes already enforce.
    const byHash = new Map<string, CertificationRecord>();
    for (const value of parsed) {
      if (!isValidRecord(value)) continue;
      const record = { ...value, title: normalizeTitle(value.title) };
      const existing = byHash.get(record.hash);
      if (!existing || record.certifiedAt < existing.certifiedAt) {
        byHash.set(record.hash, record);
      }
    }
    return Array.from(byHash.values())
      .sort((a, b) => a.certifiedAt - b.certifiedAt)
      .slice(-MAX_ENTRIES);
  } catch {
    return [];
  }
}

// Single source of truth for what a well-formed CertificationRecord looks like,
// enforced at both trust boundaries: the `readHistory()` filter (untrusted
// localStorage payload) and the `recordCertification()` write (an untrusted or
// future caller). `Number.isFinite()` already rejects non-number values, so it
// doubles as the type guard for the numeric fields. Drift-prevention sibling of
// the prior `getScoreLabel` / `countWords` / `buildEmbedSnippets` consolidations.
function isValidRecord(value: unknown): value is CertificationRecord {
  if (!value || typeof value !== 'object') return false;
  const r = value as Record<string, unknown>;
  return (
    typeof r.hash === 'string' &&
    isValidVerificationHash(r.hash) &&
    Number.isFinite(r.certifiedAt) &&
    (r.certifiedAt as number) > 0 &&
    Number.isFinite(r.wordCount) &&
    (r.wordCount as number) >= 0 &&
    Number.isFinite(r.integrityScore) &&
    (r.integrityScore as number) >= 0 &&
    (r.integrityScore as number) <= 100 &&
    // Optional, but must be a string when present: a non-string title would
    // reach the recall list's `.trim()` and throw inside the render.
    (r.title === undefined || typeof r.title === 'string')
  );
}

function normalizeTitle(title: string | undefined): string | undefined {
  const normalized = title?.trim().slice(0, MAX_DOCUMENT_TITLE_LENGTH);
  return normalized || undefined;
}

function writeHistory(history: CertificationRecord[]) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history.slice(-MAX_ENTRIES)));
    // `storage` only fires in *other* tabs. Emit a same-tab event as well so
    // every mounted return surface can use one subscription contract.
    window.dispatchEvent(new Event(HISTORY_CHANGED_EVENT));
  } catch {
    // Quota exceeded or storage disabled — silently skip.
  }
}

// Keep local-first proof recall, weekly progress, and streak feedback current
// when another tab certifies a piece. The original no-op subscriptions froze
// each surface at mount time even though localStorage is shared across tabs.
export function subscribeToHistory(onStoreChange: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const onStorage = (event: StorageEvent) => {
    if (event.key === HISTORY_STORAGE_KEY) onStoreChange();
  };
  window.addEventListener('storage', onStorage);
  window.addEventListener(HISTORY_CHANGED_EVENT, onStoreChange);
  return () => {
    window.removeEventListener('storage', onStorage);
    window.removeEventListener(HISTORY_CHANGED_EVENT, onStoreChange);
  };
}

// Idempotent: recording the same hash twice (e.g. a re-visit to /success)
// won't double-count. The record is also sanitized at the entry point — the
// caller is the `/success/<hash>` page, which falls back to `0` for missing
// numerics via `|| 0`, but a future caller (or a corrupt sessionStorage
// payload) could pass NaN / Infinity / negative values that would round-trip
// through `writeHistory` and re-emerge through `readHistory`'s filter. Same
// trust-boundary principle as the strict draft-snapshot check.
export function recordCertification(record: CertificationRecord): StreakSummary {
  const history = readHistory();
  if (!isValidRecord(record)) return summarize(history);
  if (!history.some(r => r.hash === record.hash)) {
    history.push({ ...record, title: normalizeTitle(record.title) });
    // Summarize the same capped collection that actually landed in storage.
    // At entry 501 the previous code persisted only the newest 500 but returned
    // `total: 501`, so the success pill and "showing N of M" copy overstated
    // the writer's recoverable proof history until the next page load.
    const persistedHistory = history.slice(-MAX_ENTRIES);
    writeHistory(persistedHistory);
    return summarize(persistedHistory);
  }
  return summarize(history);
}

export function getStreakSummary(): StreakSummary {
  return summarize(readHistory());
}

// The writer's own certified pieces, newest first. Without accounts (Phase 1.2)
// a verification URL is recoverable only if the writer kept it — close the tab
// without copying the link and the proof is effectively lost, even though the
// document is certified and the local record of it is right here. This is the
// same staged-rollout shape as the streak pill: recall the pieces from the
// local-first record today, sync them to a real `/u/<handle>` portfolio when
// accounts land. `excludeHash` lets a caller drop the piece it is already
// showing (the just-certified one on `/success/<hash>`).
export function getRecentCertifications(limit = 5, excludeHash?: string): CertificationRecord[] {
  return readHistory()
    .filter(r => r.hash !== excludeHash)
    // `readHistory()` returns insertion order, which is *usually* chronological
    // — but a device whose clock was corrected backwards, or a future
    // server-synced merge, can break that. Sort on the recorded timestamp so
    // "newest first" is true by construction rather than by assumption.
    .sort((a, b) => b.certifiedAt - a.certifiedAt)
    .slice(0, Math.max(0, limit));
}

function summarize(history: CertificationRecord[]): StreakSummary {
  const total = history.length;
  if (total === 0) {
    return {
      total: 0,
      streak: 0,
      best: 0,
      thisWeek: 0,
      thisWeekWords: 0,
      certifiedToday: false,
    };
  }

  const days = new Set(history.map(r => dayKey(r.certifiedAt)));
  const best = longestRun(history);
  const today = startOfDay(new Date());
  const now = Date.now();
  const weekStart = startOfWeek(today).getTime();
  let thisWeek = 0;
  let thisWeekWords = 0;
  for (const record of history) {
    // Ignore future timestamps in the progress rollup without deleting the
    // proof from recall: a corrected device clock should not lose the link,
    // but it should not award future writing to the current week either.
    if (record.certifiedAt >= weekStart && record.certifiedAt <= now) {
      thisWeek++;
      thisWeekWords += record.wordCount;
    }
  }
  // Allow today OR yesterday as the anchor: someone who certified yesterday
  // but not yet today still has an active streak as of right now.
  const yesterday = addDays(today, -1);
  const certifiedToday = days.has(dayKey(today.getTime()));

  let cursor: Date;
  if (certifiedToday) {
    cursor = today;
  } else if (days.has(dayKey(yesterday.getTime()))) {
    cursor = yesterday;
  } else {
    return { total, streak: 0, best, thisWeek, thisWeekWords, certifiedToday };
  }

  let streak = 0;
  while (days.has(dayKey(cursor.getTime()))) {
    streak++;
    cursor = addDays(cursor, -1);
  }
  return { total, streak, best, thisWeek, thisWeekWords, certifiedToday };
}

// Longest run of consecutive calendar days the writer ever certified on — the
// personal best the /success pill recognizes ("longest streak yet"). The
// current `streak` only counts the run ending today/yesterday, so a writer who
// broke a long streak and started a new one had no memory of the record; the
// habit loop is stronger when it can celebrate beating a personal best. Walk
// the unique certifying days in chronological order and measure the longest
// consecutive span, using addDays() for the same DST-safe day arithmetic the
// active-streak scan relies on (a fixed 24h offset would miscount across a
// 23h/25h DST boundary). Deduped to day granularity, so multiple pieces on one
// day count once.
function longestRun(history: CertificationRecord[]): number {
  const dayStarts = Array.from(
    new Set(history.map(r => startOfDay(new Date(r.certifiedAt)).getTime()))
  ).sort((a, b) => a - b);

  let best = 0;
  let run = 0;
  let prev: number | null = null;
  for (const ts of dayStarts) {
    if (prev !== null && dayKey(addDays(new Date(prev), 1).getTime()) === dayKey(ts)) {
      run++;
    } else {
      run = 1;
    }
    prev = ts;
    if (run > best) best = run;
  }
  return best;
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function startOfWeek(d: Date): Date {
  const start = startOfDay(d);
  // Monday-based local week, matching the writer's calendar rather than a
  // fixed UTC boundary that can move Sunday-night work into the next week.
  const daysSinceMonday = (start.getDay() + 6) % 7;
  return addDays(start, -daysSinceMonday);
}

// Day arithmetic via Date.setDate() instead of subtracting 24*60*60*1000.
// Across DST transitions a calendar day is 23h or 25h; subtracting a fixed
// 24h offset can land on the same calendar day (skipping the boundary day)
// or two days back, miscounting the streak. setDate() always moves by one
// calendar day in the local timezone, which is what dayKey() compares.
function addDays(d: Date, delta: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + delta);
  return out;
}

function dayKey(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}
