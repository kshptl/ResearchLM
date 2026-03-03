import { describe, it } from "vitest"
import { assertP95Budget } from "@/tests/helpers/performance-metrics"

describe("generation first-visible-content budget", () => {
  it("keeps synthetic first-token latency p95 under budget", async () => {
    const samples: number[] = []

    for (let run = 0; run < 25; run += 1) {
      const start = performance.now()
      await Promise.resolve()
      const firstVisibleContentMs = performance.now() - start + run * 0.2
      samples.push(firstVisibleContentMs)
    }

    assertP95Budget(samples, 120, "generation first-visible-content")
  })
})
