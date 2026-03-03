import { describe, expect, it } from "vitest"
import { assertMonotonicSequence, encodeSseEvent } from "@/lib/sse/events"

describe("sse events contract", () => {
  it("encodes normalized SSE event frames", () => {
    const encoded = encodeSseEvent({
      type: "delta",
      data: { requestId: "req-1", sequence: 2, text: "hello" }
    })
    expect(encoded).toContain("event: delta")
    expect(encoded).toContain('"sequence":2')
  })

  it("enforces monotonic sequence progression", () => {
    expect(assertMonotonicSequence(null, 1)).toBe(1)
    expect(assertMonotonicSequence(1, 2)).toBe(2)
    expect(() => assertMonotonicSequence(2, 2)).toThrow(/monotonic/i)
  })
})
