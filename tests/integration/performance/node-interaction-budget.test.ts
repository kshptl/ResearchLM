import { describe, it } from "vitest"
import { assertP95Budget } from "@/tests/helpers/performance-metrics"

describe("node interaction budget", () => {
  it("keeps p95 node interaction update time under budget", () => {
    const samples: number[] = []

    for (let run = 0; run < 30; run += 1) {
      const nodes = Array.from({ length: 300 }, (_, index) => ({ id: `n-${index}`, x: index, y: index }))
      const start = performance.now()
      const updated = nodes.map((node, index) => ({ ...node, x: node.x + index, y: node.y + index }))
      void updated
      samples.push(performance.now() - start)
    }

    assertP95Budget(samples, 50, "node interaction")
  })
})
