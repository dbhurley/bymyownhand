import { MetricItem } from './MetricItem';
import type { WritingMetrics } from '@/lib/types';

// The "Writing Analysis" panel, rendered identically on /success/<hash> and
// /verify/<hash>. The seven metric cells (their labels, ordering, and value
// formatting) were duplicated verbatim on both pages and had already drifted
// once: the §6.20 WPM-parity fix had to realign the two panels after they
// diverged, and the §6.30 MetricItem extraction consolidated the leaf cell.
// This consolidates the whole panel, so a future metric/label/format change
// lands in one place. Each page keeps its own outer margin wrapper, which is
// the only thing that legitimately differs between the two surfaces.
// Drift-prevention sibling of the prior `getScoreLabel` / `getSiteUrl` /
// `buildEmbedSnippets` / `computeWpm` / `MetricItem` consolidations.
export function WritingAnalysis({ metrics, wpm }: { metrics: WritingMetrics; wpm: number }) {
  return (
    <>
      <p className="text-xs font-semibold text-deep-blue/30 uppercase tracking-[0.2em] mb-6">Writing Analysis</p>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
        <MetricItem label="Avg Keystroke" value={`${metrics.avgKeystrokeInterval}ms`} />
        <MetricItem label="Variance" value={metrics.keystrokeVariance.toFixed(2)} />
        <MetricItem label="Thinking Pauses" value={String(metrics.pauseCount)} />
        <MetricItem label="Deletion Rate" value={`${(metrics.deletionRate * 100).toFixed(1)}%`} />
        <MetricItem label="Longest Burst" value={`${metrics.longestBurst} chars`} />
        <MetricItem label="Avg Word Length" value={`${metrics.averageWordLength} chars`} />
        <MetricItem label="WPM" value={String(wpm)} />
      </div>
    </>
  );
}
