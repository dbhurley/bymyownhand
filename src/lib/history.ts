// Local-first writing history. First surface for Phase 1.4 (Writing streaks)
// before optional accounts ship — a writer's certified pieces are recorded in
// localStorage so we can show "Nth certified piece • k-day streak" on
// `/success/<hash>` immediately, without a backend. When accounts arrive in
// Phase 1.2 the same shape will sync server-side; until then this is enough
// to start the habit-formation feedback loop.

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
    return parsed.filter((r): r is CertificationRecord =>
      typeof r?.hash === 'string' &&
      typeof r?.certifiedAt === 'number' &&
      typeof r?.wordCount === 'number' &&
      typeof r?.integrityScore === 'number'
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
// won't double-count.
export function recordCertification(record: CertificationRecord): StreakSummary {
  const history = readHistory();
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
  if (total === 0) return { total: 0, streak: 0 };

  const days = new Set(history.map(r => dayKey(r.certifiedAt)));
  const today = new Date();
  // Allow today OR yesterday as the anchor: someone who certified yesterday
  // but not yet today still has an active streak as of right now.
  const todayKey = dayKey(today.getTime());
  const yesterdayKey = dayKey(today.getTime() - 24 * 60 * 60 * 1000);

  let cursor: Date;
  if (days.has(todayKey)) {
    cursor = startOfDay(today);
  } else if (days.has(yesterdayKey)) {
    cursor = startOfDay(new Date(today.getTime() - 24 * 60 * 60 * 1000));
  } else {
    return { total, streak: 0 };
  }

  let streak = 0;
  while (days.has(dayKey(cursor.getTime()))) {
    streak++;
    cursor = new Date(cursor.getTime() - 24 * 60 * 60 * 1000);
  }
  return { total, streak };
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function dayKey(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}
