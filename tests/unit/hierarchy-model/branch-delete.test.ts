import { describe, expect, it } from "vitest"
import { deleteBranchWithFallback } from "@/features/hierarchy-model/branch-delete"

describe("branch delete", () => {
  it("reroutes active canvas when active descendant is removed", () => {
    const canvases = [
      { id: "c1", workspaceId: "w1", topic: "Root", depth: 0, createdAt: "", updatedAt: "" },
      { id: "c2", workspaceId: "w1", topic: "Branch", depth: 1, parentCanvasId: "c1", createdAt: "", updatedAt: "" },
      { id: "c3", workspaceId: "w1", topic: "Leaf", depth: 2, parentCanvasId: "c2", createdAt: "", updatedAt: "" }
    ]
    const links = [
      { id: "h1", workspaceId: "w1", parentCanvasId: "c1", childCanvasId: "c2", linkType: "subtopic" as const, createdAt: "" },
      { id: "h2", workspaceId: "w1", parentCanvasId: "c2", childCanvasId: "c3", linkType: "subtopic" as const, createdAt: "" }
    ]

    const result = deleteBranchWithFallback(canvases, links, "c2", "c3")

    expect(result.canvases.map((canvas) => canvas.id)).toEqual(["c1"])
    expect(result.nextActiveCanvasId).toBe("c1")
    expect(result.removedCanvasIds.sort()).toEqual(["c2", "c3"])
  })
})
