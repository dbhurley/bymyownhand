// Local-first writing history. First surface for Phase 1.4 (Writing streaks)
// before optional accounts ship — a writer's certified pieces are recorded in
// localStorage so we can show "Nth certified piece • k-day streak" on
// `/success/<hash>` immediately, without a backend. When accounts arrive in
// Phase 1.2 the same shape will sync server-side; until then this is enough
// to start the habit-formation feedback loop.

import { isValidVerificationHash } from './hash';

const HISTORY_STORAGE_KEY = 'bmoh:history:v1';
const MAX_ENTRIES = 500;

export interface CertificationRecord {
  hash: string;
  certifiedAt: number; // ms epoch
  wordCount: number;
  integrityScore: number;
}

export interface StreakSummary {
  total: number;
  streak: number; // consecutive days ending today (or yesterday, if user hasn't certified today)
}

function readHistory(): CertificationRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // `typeof x === 'number'` accepts NaN, Infinity, and negative values — any
    // of which can leak past the filter and poison `summarize()`: a NaN
    // certifiedAt produces a `NaN-NaN-NaN` dayKey that doesn't match anything,
    // but a negative one becomes a real Date in 1969 that contributes a
    // phantom day to the streak set. Treat the localStorage payload as
    // untrusted and require finite, non-negative numerics — same trust-boundary
    // shape as the strict draft-snapshot check in `lib/draft.ts` and the
    // server-side `wordCount` / `title` / `writingTimeMs` gates.
    return parsed.filter((r): r is CertificationRecord =>
      typeof r?.hash === 'string' &&
      isValidVerificationHash(r.hash) &&
      typeof r?.certifiedAt === 'number' &&
      Number.isFinite(r.certifiedAt) &&
      r.certifiedAt > 0 &&
      typeof r?.wordCount === 'number' &&
      Number.isFinite(r.wordCount) &&
      r.wordCount >= 0 &&
      typeof r?.integrityScore === 'number' &&
      Number.isFinite(r.integrityScore) &&
      r.integrityScore >= 0 &&
      r.integrityScore <= 100
    );
  } catch {
    return [];
  }
}

function writeHistory(history: CertificationRecord[]) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history.slice(-MAX_ENTRIES)));
  } catch {
    // Quota exceeded or storage disabled — silently skip.
  }
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
  if (!isRecordSafe(record)) return summarize(history);
  if (!history.some(r => r.hash === record.hash)) {
    history.push(record);
    writeHistory(history);
  }
  return summarize(history);
}

function isRecordSafe(record: CertificationRecord): boolean {
  return (
    isValidVerificationHash(record.hash) &&
    Number.isFinite(record.certifiedAt) &&
    record.certifiedAt > 0 &&
    Number.isFinite(record.wordCount) &&
    record.wordCount >= 0 &&
    Number.isFinite(record.integrityScore) &&
    record.integrityScore >= 0 &&
    record.integrityScore <= 100
  );
}

export function getStreakSummary(): StreakSummary {
  return summarize(readHistory());
}

function summarize(history: CertificationRecord[]): StreakSummary {
  const total = history.length;
  if (total === 0) return { total: 0, streak: 0 };

  const days = new Set(history.map(r => dayKey(r.certifiedAt)));
  const today = startOfDay(new Date());
  // Allow today OR yesterday as the anchor: someone who certified yesterday
  // but not yet today still has an active streak as of right now.
  const yesterday = addDays(today, -1);

  let cursor: Date;
  if (days.has(dayKey(today.getTime()))) {
    cursor = today;
  } else if (days.has(dayKey(yesterday.getTime()))) {
    cursor = yesterday;
  } else {
    return { total, streak: 0 };
  }

  let streak = 0;
  while (days.has(dayKey(cursor.getTime()))) {
    streak++;
    cursor = addDays(cursor, -1);
  }
  return { total, streak };
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
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
