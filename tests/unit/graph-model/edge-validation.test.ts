import { describe, expect, it } from "vitest"
import { hasExactEdge, isValidGraphConnection, isValidReactFlowConnection } from "@/features/graph-model/edge-validation"
import type { Edge } from "@/features/graph-model/types"

function edge(fromNodeId: string, toNodeId: string): Edge {
  return {
    id: `${fromNodeId}-${toNodeId}`,
    workspaceId: "w1",
    canvasId: "c1",
    fromNodeId,
    toNodeId,
    relationshipType: "related",
    createdAt: "2026-03-04T00:00:00.000Z",
  }
}

describe("edge validation", () => {
  it("allows one source to connect to many targets", () => {
    const edges = [edge("a", "b")]

    expect(
      isValidGraphConnection({
        sourceId: "a",
        targetId: "c",
        edges,
      })
    ).toBe(true)
  })

  it("allows many sources to connect to one target", () => {
    const edges = [edge("a", "c")]

    expect(
      isValidGraphConnection({
        sourceId: "b",
        targetId: "c",
        edges,
      })
    ).toBe(true)
  })

  it("blocks exact duplicate source-target links", () => {
    const edges = [edge("a", "b")]

    expect(hasExactEdge(edges, "a", "b")).toBe(true)
    expect(
      isValidReactFlowConnection(
        {
          source: "a",
          target: "b",
        },
        edges
      )
    ).toBe(false)
  })

  it("blocks self connections", () => {
    expect(
      isValidGraphConnection({
        sourceId: "a",
        targetId: "a",
        edges: [],
      })
    ).toBe(false)
  })
})
