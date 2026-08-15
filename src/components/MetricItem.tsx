// Single source of truth for a labeled writing-analysis metric. The identical
// markup lived inline as a local `MetricItem` in `/verify/<hash>` and a local
// `Metric` in `/success/<hash>` — two copies that had already drifted once in
// the past (the §6.20 WPM-parity fix had to realign the two analysis panels).
// Consolidating the leaf component means a future tweak to the label/value
// typography lands once for both panels. Drift-prevention sibling of the prior
// getScoreLabel / getSiteUrl / buildEmbedSnippets / computeWpm consolidations.

export function MetricItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-xs text-deep-blue/35 uppercase tracking-wider block mb-1">{label}</span>
      <p className="text-xl font-semibold text-deep-blue">{value}</p>
    </div>
  );
}
