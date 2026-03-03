import { describe, expect, it } from "vitest"
import { clampPaneWidth, updatePaneLayout } from "@/features/graph-model/workspace-store"

describe("pane layout state", () => {
  it("clamps pane widths within allowed bounds", () => {
    expect(clampPaneWidth(120)).toBe(240)
    expect(clampPaneWidth(320)).toBe(320)
    expect(clampPaneWidth(880)).toBe(480)
  })

  it("updates pane layout and preserves bounded widths", () => {
    const current = {
      leftPaneCollapsed: false,
      rightPaneCollapsed: false,
      leftPaneWidthPx: 280,
      rightPaneWidthPx: 320,
      activeInspectorTab: "details" as const
    }

    const updated = updatePaneLayout(current, {
      leftPaneWidthPx: 120,
      rightPaneWidthPx: 600,
      activeInspectorTab: "semantic"
    })

    expect(updated.leftPaneWidthPx).toBe(240)
    expect(updated.rightPaneWidthPx).toBe(480)
    expect(updated.activeInspectorTab).toBe("semantic")
  })
})
