import { describe, expect, it } from "vitest"
import { deleteBranch } from "@/features/hierarchy-model/branch-delete"
import { buildCanvasTree, upsertHierarchyLink, wouldCreateCycle } from "@/features/hierarchy-model/state"

describe("hierarchy rules", () => {
  it("detects a cycle", () => {
    const cycle = wouldCreateCycle(
      [
        {
          id: "h1",
          workspaceId: "w1",
          parentCanvasId: "c1",
          childCanvasId: "c2",
          linkType: "subtopic",
          createdAt: new Date().toISOString()
        }
      ],
      "c2",
      "c1"
    )
    expect(cycle).toBe(true)
  })

  it("deletes descendants", () => {
    const result = deleteBranch(
      [
        { id: "c1", workspaceId: "w1", topic: "A", depth: 0, createdAt: "", updatedAt: "" },
        { id: "c2", workspaceId: "w1", topic: "B", parentCanvasId: "c1", depth: 1, createdAt: "", updatedAt: "" }
      ],
      [
        {
          id: "h1",
          workspaceId: "w1",
          parentCanvasId: "c1",
          childCanvasId: "c2",
          linkType: "subtopic",
          createdAt: ""
        }
      ],
      "c1"
    )

    expect(result.canvases).toHaveLength(0)
  })

  it("prevents duplicate and cyclic links", () => {
    const baseLink = {
      id: "h1",
      workspaceId: "w1",
      parentCanvasId: "c1",
      childCanvasId: "c2",
      linkType: "subtopic" as const,
      createdAt: ""
    }

    const withDuplicate = upsertHierarchyLink([baseLink], { ...baseLink, id: "h2" })
    const withCycle = upsertHierarchyLink([baseLink], {
      id: "h3",
      workspaceId: "w1",
      parentCanvasId: "c2",
      childCanvasId: "c1",
      linkType: "subtopic",
      createdAt: ""
    })

    expect(withDuplicate).toHaveLength(1)
    expect(withCycle).toHaveLength(1)
  })

  it("builds an ordered tree traversal from root", () => {
    const canvases = [
      { id: "c1", workspaceId: "w1", topic: "Root", depth: 0, createdAt: "", updatedAt: "" },
      { id: "c2", workspaceId: "w1", topic: "Child", depth: 1, parentCanvasId: "c1", createdAt: "", updatedAt: "" },
      { id: "c3", workspaceId: "w1", topic: "Leaf", depth: 2, parentCanvasId: "c2", createdAt: "", updatedAt: "" }
    ]
    const links = [
      { id: "h1", workspaceId: "w1", parentCanvasId: "c1", childCanvasId: "c2", linkType: "subtopic" as const, createdAt: "" },
      { id: "h2", workspaceId: "w1", parentCanvasId: "c2", childCanvasId: "c3", linkType: "subtopic" as const, createdAt: "" }
    ]

    const ordered = buildCanvasTree(canvases, links, "c1")
    expect(ordered.map((canvas) => canvas.id)).toEqual(["c1", "c2", "c3"])
  })
})
