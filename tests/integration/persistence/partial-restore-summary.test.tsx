import { describe, expect, it } from "vitest"
import { summarizeBackupRestore } from "@/features/persistence/workspace-backup"

describe("partial restore summary", () => {
  it("marks restore as partial when restored counts are below expected", () => {
    const now = new Date().toISOString()
    const backup = {
      version: 1,
      exportedAt: now,
      workspace: {
        id: "w1",
        title: "Workspace",
        rootCanvasId: "c1",
        activeCanvasId: "c1",
        version: 1,
        createdAt: now,
        updatedAt: now
      },
      canvases: [
        { id: "c1", workspaceId: "w1", topic: "Root", depth: 0, createdAt: now, updatedAt: now },
        { id: "c2", workspaceId: "w1", topic: "Child", depth: 1, parentCanvasId: "c1", createdAt: now, updatedAt: now }
      ],
      nodes: [{ id: "n1", workspaceId: "w1", canvasId: "c1", type: "topic" as const, content: "Root", position: { x: 0, y: 0 }, createdAt: now, updatedAt: now }],
      connections: [],
      hierarchyLinks: [{ id: "h1", workspaceId: "w1", parentCanvasId: "c1", childCanvasId: "c2", linkType: "subtopic" as const, createdAt: now }]
    }

    const summary = summarizeBackupRestore(backup, {
      canvases: 1,
      nodes: 1,
      connections: 0,
      hierarchyLinks: 1
    })

    expect(summary.partial).toBe(true)
    expect(summary.message).toContain("partial")
    expect(summary.expectedCounts.canvases).toBe(2)
    expect(summary.restoredCounts.canvases).toBe(1)
  })
})
