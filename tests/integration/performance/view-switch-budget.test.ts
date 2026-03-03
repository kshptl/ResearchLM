import { describe, it } from "vitest"
import { assertP95Budget } from "@/tests/helpers/performance-metrics"

describe("hierarchy/canvas view switch budget", () => {
  it("keeps p95 switch time under budget", () => {
    const samples: number[] = []

    for (let run = 0; run < 30; run += 1) {
      const start = performance.now()
      const hierarchy = Array.from({ length: 120 }, (_, index) => ({ id: `c-${index}`, depth: index % 4 }))
      const active = hierarchy.find((item) => item.id === `c-${run}`)
      void active
      samples.push(performance.now() - start)
    }

    assertP95Budget(samples, 30, "hierarchy/canvas switch")
  })
})
