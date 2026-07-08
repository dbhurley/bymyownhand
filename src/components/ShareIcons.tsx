// Single source of truth for the X and LinkedIn brand marks on the "Share this
// proof" / "Share your proof" rows of `/success/<hash>` and `/verify/<hash>`.
// Both pages inlined the identical `<svg>` path data, so a brand-mark change
// (the same kind of update the Twitter→X migration already forced once — see
// the `buildTweetUrl` host fix) had two copies to keep in lockstep. The icons
// are decorative next to their visible "Post on X" / "LinkedIn" labels, so both
// carry `aria-hidden`. Drift-prevention sibling of the prior `MetricItem` /
// `WritingAnalysis` presentational-component extractions.

export function XIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M12.6 1.5h2.3L9.7 7.4l5.9 7.1h-4.6L7.5 9.7l-4 4.8H1.2L7 7.7 1.2 1.5h4.7L9 5.7l3.6-4.2zM11.8 13.2h1.3L4.7 2.7H3.3l8.5 10.5z" />
    </svg>
  );
}

export function LinkedInIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M3.5 1.6a1.4 1.4 0 100 2.8 1.4 1.4 0 000-2.8zM2.2 5.4h2.6V14H2.2V5.4zM6.4 5.4h2.5v1.2h.04c.35-.66 1.21-1.36 2.49-1.36 2.66 0 3.15 1.75 3.15 4.03V14h-2.6V9.78c0-1.01-.02-2.31-1.41-2.31-1.41 0-1.62 1.1-1.62 2.24V14H6.4V5.4z" />
    </svg>
  );
}
