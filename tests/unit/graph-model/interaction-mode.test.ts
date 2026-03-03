import { describe, expect, it } from "vitest"
import { canTransitionMode, transitionMode } from "@/features/graph-model/interaction-mode"

describe("interaction mode transitions", () => {
  it("allows expected transitions", () => {
    expect(canTransitionMode("select", "pan", { hasSelection: false, isPointerDown: false })).toBe(true)
    expect(canTransitionMode("pan", "connect", { hasSelection: true, isPointerDown: false })).toBe(false)
  })

  it("blocks mode changes while pointer is down", () => {
    expect(transitionMode("select", "lasso", { hasSelection: false, isPointerDown: true })).toBe("select")
  })
})
