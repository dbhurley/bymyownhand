import type { KeystrokeEvent, WritingMetrics } from './types';

// Single source of truth for the word-counting rule used across the editor's
// live counter, the API submission gate, the resume-banner draft summary, and
// metric calculation. Trimming + collapsing whitespace + dropping empty tokens
// is the contract; consolidating it here keeps the 10-word threshold and the
// `averageWordLength` denominator in lockstep.
export function countWords(content: string): number {
  if (!content) return 0;
  const trimmed = content.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).filter(Boolean).length;
}

export function splitWords(content: string): string[] {
  if (!content) return [];
  const trimmed = content.trim();
  if (!trimmed) return [];
  return trimmed.split(/\s+/).filter(Boolean);
}

export function calculateMetrics(events: KeystrokeEvent[], content = ''): WritingMetrics {
  // Classify the trace in a single pass rather than three separate `.filter()`
  // sweeps. The trace can be large (up to the 250k-event server cap), so walking
  // it once instead of three times keeps `/verify/<hash>` playback setup and the
  // certificate metrics cheap. Only `keyEvents` needs to be materialized as an
  // ordered array (for interval timing); deletes and blocked pastes need counts.
  const keyEvents: KeystrokeEvent[] = [];
  let deleteCount = 0;
  let blockedPastes = 0;
  for (const e of events) {
    if (e.type === 'key') keyEvents.push(e);
    else if (e.type === 'delete') deleteCount++;
    else if (e.type === 'paste_blocked') blockedPastes++;
  }

  // Calculate keystroke intervals
  const intervals: number[] = [];
  for (let i = 1; i < keyEvents.length; i++) {
    intervals.push(keyEvents[i].t - keyEvents[i - 1].t);
  }
  
  const avgKeystrokeInterval = intervals.length > 0 
    ? intervals.reduce((a, b) => a + b, 0) / intervals.length 
    : 0;
  
  // Variance calculation
  const variance = intervals.length > 0
    ? intervals.reduce((sum, val) => sum + Math.pow(val - avgKeystrokeInterval, 2), 0) / intervals.length
    : 0;
  const keystrokeVariance = Math.sqrt(variance) / (avgKeystrokeInterval || 1);
  
  // Count pauses (intervals > 2000ms)
  const pauseCount = intervals.filter(i => i > 2000).length;
  
  // Deletion rate
  const totalKeystrokes = keyEvents.length + deleteCount;
  const deletionRate = totalKeystrokes > 0
    ? deleteCount / totalKeystrokes
    : 0;
  
  // Longest burst (consecutive keystrokes < 500ms apart). Floor at 1 whenever
  // any keys were typed: a deliberate writer whose every keystroke is >500ms
  // apart still produced a "burst" of one character — reporting 0 chars there
  // (on the certificate and the verify panel) was wrong, and ironically made
  // the most careful human writers look like they typed nothing.
  let longestBurst = keyEvents.length > 0 ? 1 : 0;
  let currentBurst = 1;
  for (const interval of intervals) {
    if (interval < 500) {
      currentBurst++;
      longestBurst = Math.max(longestBurst, currentBurst);
    } else {
      currentBurst = 1;
    }
  }
  
  // Average word length, derived from the final content
  const words = splitWords(content);
  const averageWordLength = words.length > 0
    ? Math.round((words.reduce((sum, w) => sum + w.length, 0) / words.length) * 10) / 10
    : 0;

  return {
    avgKeystrokeInterval: Math.round(avgKeystrokeInterval),
    keystrokeVariance: Math.round(keystrokeVariance * 100) / 100,
    pauseCount,
    deletionRate: Math.round(deletionRate * 100) / 100,
    blockedPastes,
    longestBurst,
    averageWordLength,
  };
}

// Single source of truth for the WPM calculation. The
// `writingTimeMs > 0 ? (wordCount / writingTimeMs) * 60000 : 0` pattern was
// duplicated four times — `/success/<hash>`, `/verify/<hash>`, the certificate
// PDF, and the integrity-score branches here — with one variant rounded for
// display and one raw for the >150/>200 threshold checks. Consolidating into
// one helper keeps the math (and the divide-by-zero guard from §6.8) in lockstep
// across every surface. Drift-prevention sibling of the prior `getScoreLabel` /
// `countWords` / `buildEmbedSnippets` / `getSiteUrl` / `buildVerifyUrl`
// consolidations. Display sites round the result.
export function computeWpm(wordCount: number, writingTimeMs: number): number {
  if (writingTimeMs <= 0) return 0;
  return (wordCount / writingTimeMs) * 60000;
}

export function calculateIntegrityScore(metrics: WritingMetrics, wordCount: number, writingTimeMs: number): number {
  let score = 100;

  // Penalize if blocked pastes occurred
  if (metrics.blockedPastes > 0) {
    score -= Math.min(30, metrics.blockedPastes * 10);
  }

  // Check if typing speed is humanly plausible (40-150 WPM typical)
  const wpm = computeWpm(wordCount, writingTimeMs);
  if (wpm > 200) {
    score -= 40; // Almost certainly not human-typed
  } else if (wpm > 150) {
    score -= 20; // Suspiciously fast
  }
  
  // Natural typing has variance
  if (metrics.keystrokeVariance < 0.1) {
    score -= 15; // Too robotic/consistent
  }
  
  // Some pauses are natural for thinking
  if (metrics.pauseCount === 0 && wordCount > 100) {
    score -= 10; // Suspiciously no pauses
  }
  
  // Some deletions are natural
  if (metrics.deletionRate === 0 && wordCount > 50) {
    score -= 5; // No mistakes at all is unusual
  } else if (metrics.deletionRate > 0.3) {
    score -= 10; // Too many deletions
  }
  
  return Math.max(0, Math.min(100, score));
}

export interface ScoreLabel {
  label: string;
  color: string;
}

export function getScoreLabel(score: number): ScoreLabel {
  if (score >= 90) return { label: 'Excellent', color: 'text-success' };
  if (score >= 70) return { label: 'Good', color: 'text-accent' };
  if (score >= 50) return { label: 'Moderate', color: 'text-warning' };
  return { label: 'Low', color: 'text-red-600' };
}

// Single source of truth for deriving a session's writing-time-in-ms from the
// in-app `WritingSession` payload that lives in `sessionStorage` on /success
// and /verify. The `(endedAt || Date.now()) - startedAt` pattern was duplicated
// on both pages and silently disagrees with the server-side `writingTimeMs`
// whenever `endedAt` is missing — the `Date.now()` fallback resolves to "now,"
// which on a refreshed `/verify` tab can be hours after the session ended,
// ballooning the Duration cell and WPM. Applies the same `Number.isFinite()` /
// non-negative clamp as `formatDuration()` so a corrupt sessionStorage payload
// (or a future caller passing partial data) can never surface as a negative or
// NaN duration. Drift-prevention sibling of the prior `computeWpm()` /
// `getScoreLabel()` / `countWords()` / `buildEmbedSnippets()` consolidations.
export function getSessionWritingTime(session: {
  startedAt: number | undefined;
  endedAt?: number;
}): number {
  const startedAt = Number(session.startedAt);
  if (!Number.isFinite(startedAt) || startedAt <= 0) return 0;
  const endedAt = Number(session.endedAt);
  const end = Number.isFinite(endedAt) && endedAt > 0 ? endedAt : Date.now();
  const window = end - startedAt;
  return Number.isFinite(window) && window > 0 ? window : 0;
}

export function formatDuration(ms: number): string {
  // Clamp non-finite or negative inputs to 0. Without this, a legacy or
  // tampered record with `writingTimeMs = NaN` (or negative — a clock that
  // ran backwards between startedAt and endedAt before the §6.20 server-side
  // sanitization landed) renders as "NaNs" / "-1s" in the verify Duration cell,
  // the success page, the certificate PDF, and the toolbar timer. Match the
  // shape of the server-side `writingTimeMs` trust-boundary fix (§6.20) on the
  // display side so a single bad value can't surface anywhere.
  const safeMs = Number.isFinite(ms) && ms > 0 ? ms : 0;
  const seconds = Math.floor(safeMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
}
