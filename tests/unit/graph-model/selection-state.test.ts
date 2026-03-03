import { describe, expect, it } from "vitest"
import { applyLassoSelection, createSelectionState, toggleNodeSelection } from "@/features/graph-model/selection-state"

describe("selection state", () => {
  it("toggles node selection membership", () => {
    const start = createSelectionState()
    const withNode = toggleNodeSelection(start, "n1")
    const withoutNode = toggleNodeSelection(withNode, "n1")

    expect(withNode.nodeIds).toEqual(["n1"])
    expect(withoutNode.nodeIds).toEqual([])
  })

  it("applies lasso bounds to select in-range nodes", () => {
    const start = createSelectionState()
    const next = applyLassoSelection(
      start,
      [
        {
          id: "n1",
          workspaceId: "w1",
          canvasId: "c1",
          type: "topic",
          content: "A",
          position: { x: 20, y: 20 },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: "n2",
          workspaceId: "w1",
          canvasId: "c1",
          type: "topic",
          content: "B",
          position: { x: 220, y: 220 },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ],
      { x: 0, y: 0, width: 100, height: 100 }
    )

    expect(next.nodeIds).toEqual(["n1"])
  })
})
