export type TimingSample = {
  label: string
  durationMs: number
}

export function percentile(samples: number[], p: number): number {
  if (samples.length === 0) {
    return 0
  }

  const sorted = [...samples].sort((a, b) => a - b)
  const rank = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1))
  return sorted[rank]
}

export function p95(samples: number[]): number {
  return percentile(samples, 95)
}

export function assertP95Budget(samples: number[], maxMs: number, label: string): void {
  const value = p95(samples)
  if (value > maxMs) {
    throw new Error(`${label} p95 ${value.toFixed(2)}ms exceeded budget ${maxMs}ms`)
  }
}

export function collectDurations(samples: TimingSample[]): number[] {
  return samples.map((sample) => sample.durationMs)
}
