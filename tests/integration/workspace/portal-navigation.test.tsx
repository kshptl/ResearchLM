import { describe, expect, it } from "vitest"
import { createPortalNode, portalTargetCanvasId } from "@/features/graph-model/portal-node"
import { navigateViaPortal } from "@/features/hierarchy-model/navigation"

describe("portal navigation", () => {
  it("navigates to linked child canvas from portal node", () => {
    const now = new Date().toISOString()
    const parent = { id: "c1", workspaceId: "w1", topic: "Root", depth: 0, createdAt: now, updatedAt: now }
    const child = {
      id: "c2",
      workspaceId: "w1",
      topic: "Subtopic",
      parentCanvasId: "c1",
      depth: 1,
      createdAt: now,
      updatedAt: now
    }
    const link = {
      id: "h1",
      workspaceId: "w1",
      parentCanvasId: "c1",
      childCanvasId: "c2",
      linkType: "subtopic" as const,
      createdAt: now
    }

    const portalNode = createPortalNode(link, parent, child)
    const targetCanvasId = portalTargetCanvasId(portalNode)
    const next = navigateViaPortal({ activeCanvasId: "c1" }, targetCanvasId ?? "c1")

    expect(targetCanvasId).toBe("c2")
    expect(next.activeCanvasId).toBe("c2")
    expect(next.focusedHierarchyCanvasId).toBe("c2")
  })
})
