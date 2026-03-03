import { describe, expect, it } from "vitest"
import { reconcileCrossTabMutations } from "@/features/persistence/cross-tab-sync"

describe("cross-tab conflict ordering", () => {
  it("applies deterministic tie-break for same timestamp", () => {
    const sharedTimestamp = "2026-03-03T02:00:00.000Z"
    const existing = [
      {
        id: "m0",
        workspaceId: "w1",
        entityType: "canvas",
        entityId: "c1",
        updatedAt: sharedTimestamp,
        tabId: "tab-a",
        payload: { topic: "Root A" }
      }
    ]

    const incoming = [
      {
        id: "m1",
        workspaceId: "w1",
        entityType: "canvas",
        entityId: "c1",
        updatedAt: sharedTimestamp,
        tabId: "tab-b",
        payload: { topic: "Root B" }
      }
    ]

    const result = reconcileCrossTabMutations(existing, incoming)
    const applied = result.entities.get("canvas:c1")

    expect(applied?.tabId).toBe("tab-b")
    expect(result.conflicts).toHaveLength(1)
    expect(result.conflicts[0].resolution).toBe("remote")
  })

  it("preserves referential integrity by rejecting updates with missing references", () => {
    const result = reconcileCrossTabMutations([], [
      {
        id: "m1",
        workspaceId: "w1",
        entityType: "node",
        entityId: "n1",
        updatedAt: "2026-03-03T02:00:01.000Z",
        tabId: "tab-a",
        payload: { canvasId: "c-missing" },
        references: ["canvas:c-missing"]
      }
    ])

    expect(result.entities.has("node:n1")).toBe(false)
    expect(result.conflicts).toHaveLength(1)
    expect(result.conflicts[0].summary).toContain("missing references")
  })
})
