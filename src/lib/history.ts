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
  best: number; // longest run of consecutive certifying days ever (personal best)
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
    return parsed.filter(isValidRecord);
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
    (r.integrityScore as number) <= 100
  );
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
  if (!isValidRecord(record)) return summarize(history);
  if (!history.some(r => r.hash === record.hash)) {
    history.push(record);
    writeHistory(history);
  }
  return summarize(history);
}

export function getStreakSummary(): StreakSummary {
  return summarize(readHistory());
}

function summarize(history: CertificationRecord[]): StreakSummary {
  const total = history.length;
  if (total === 0) return { total: 0, streak: 0, best: 0 };

  const days = new Set(history.map(r => dayKey(r.certifiedAt)));
  const best = longestRun(history);
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
    return { total, streak: 0, best };
  }

  let streak = 0;
  while (days.has(dayKey(cursor.getTime()))) {
    streak++;
    cursor = addDays(cursor, -1);
  }
  return { total, streak, best };
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
