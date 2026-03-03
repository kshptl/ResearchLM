import { describe, expect, it } from "vitest"
import { runSemanticDive } from "@/features/hierarchy-model/semantic-dive"

describe("semantic dive", () => {
  it("creates a child canvas and link", () => {
    const now = new Date().toISOString()
    const currentCanvas = {
      id: "c1",
      workspaceId: "w1",
      topic: "Root",
      depth: 0,
      createdAt: now,
      updatedAt: now
    }
    const node = {
      id: "n1",
      workspaceId: "w1",
      canvasId: "c1",
      type: "topic" as const,
      content: "Transport",
      position: { x: 0, y: 0 },
      createdAt: now,
      updatedAt: now
    }

    const { result, links } = runSemanticDive({ node, currentCanvas, canvases: [currentCanvas], links: [] })
    expect(result.canvas.parentCanvasId).toBe("c1")
    expect(result.reusedCanvas).toBe(false)
    expect(links).toHaveLength(1)
  })

  it("reuses existing child canvas by topic and avoids duplicate link", () => {
    const now = new Date().toISOString()
    const root = { id: "c1", workspaceId: "w1", topic: "Root", depth: 0, createdAt: now, updatedAt: now }
    const child = {
      id: "c2",
      workspaceId: "w1",
      topic: "Transport",
      parentCanvasId: "c1",
      depth: 1,
      createdAt: now,
      updatedAt: now
    }
    const existingLink = {
      id: "h1",
      workspaceId: "w1",
      parentCanvasId: "c1",
      childCanvasId: "c2",
      linkType: "subtopic" as const,
      createdAt: now
    }
    const node = {
      id: "n1",
      workspaceId: "w1",
      canvasId: "c1",
      type: "topic" as const,
      content: " transport ",
      position: { x: 0, y: 0 },
      createdAt: now,
      updatedAt: now
    }

    const { result, links } = runSemanticDive({
      node,
      currentCanvas: root,
      canvases: [root, child],
      links: [existingLink]
    })

    expect(result.reusedCanvas).toBe(true)
    expect(result.canvas.id).toBe("c2")
    expect(links).toHaveLength(1)
    expect(links[0].id).toBe("h1")
  })
})
