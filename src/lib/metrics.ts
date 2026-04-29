import type { KeystrokeEvent, WritingMetrics } from './types';

export function calculateMetrics(events: KeystrokeEvent[], content = ''): WritingMetrics {
  const keyEvents = events.filter(e => e.type === 'key');
  const deleteEvents = events.filter(e => e.type === 'delete');
  const blockedPastes = events.filter(e => e.type === 'paste_blocked').length;
  
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
  const totalKeystrokes = keyEvents.length + deleteEvents.length;
  const deletionRate = totalKeystrokes > 0 
    ? deleteEvents.length / totalKeystrokes 
    : 0;
  
  // Longest burst (consecutive keystrokes < 500ms apart)
  let longestBurst = 0;
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
  const words = content.trim().split(/\s+/).filter(Boolean);
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

export function calculateIntegrityScore(metrics: WritingMetrics, wordCount: number, writingTimeMs: number): number {
  let score = 100;
  
  // Penalize if blocked pastes occurred
  if (metrics.blockedPastes > 0) {
    score -= Math.min(30, metrics.blockedPastes * 10);
  }
  
  // Check if typing speed is humanly plausible (40-150 WPM typical)
  const wpm = writingTimeMs > 0 ? (wordCount / writingTimeMs) * 60000 : 0;
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

export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
}
