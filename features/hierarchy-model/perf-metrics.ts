export interface HierarchyTransitionMetric {
  transitionId: string
  startedAt: number
  finishedAt: number
  durationMs: number
}

export function measureHierarchyTransition(transitionId: string, startedAt: number, finishedAt: number): HierarchyTransitionMetric {
  return {
    transitionId,
    startedAt,
    finishedAt,
    durationMs: Math.max(0, finishedAt - startedAt)
  }
}

export function p95TransitionMs(metrics: HierarchyTransitionMetric[]): number {
  if (metrics.length === 0) {
    return 0
  }
  const sorted = [...metrics].map((metric) => metric.durationMs).sort((a, b) => a - b)
  const index = Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1)
  return sorted[index]
}
