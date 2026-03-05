import { describe, expect, it } from "vitest"
import {
  collectForcePositions,
  createForceLayoutSimulation,
  pinForceNode,
  releaseForceNode,
  reheatSimulation,
  updateForceNodePosition,
} from "@/features/graph-model/force-layout"
import type { Edge, GraphNode } from "@/features/graph-model/types"

function node(id: string, x: number, y: number): GraphNode {
  return {
    id,
    workspaceId: "w1",
    canvasId: "c1",
    type: "topic",
    prompt: id,
    content: "",
    position: { x, y },
    dimensions: { width: 240, height: 160 },
    createdAt: "2026-03-04T00:00:00.000Z",
    updatedAt: "2026-03-04T00:00:00.000Z",
  }
}

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

describe("force layout", () => {
  it("produces finite positions and supports drag pin/release", () => {
    const nodes = [node("a", 0, 0), node("b", 500, 200), node("c", -300, 200)]
    const edges = [edge("a", "b"), edge("a", "c")]

    const { simulation, nodeLookup } = createForceLayoutSimulation(nodes, edges)

    simulation.tick(12)

    const positions = collectForcePositions(nodeLookup)
    expect(positions).toHaveProperty("size")
    expect(positions.size).toBe(3)
    expect(Number.isFinite(positions.get("a")?.x)).toBe(true)
    expect(Number.isFinite(positions.get("b")?.y)).toBe(true)

    updateForceNodePosition(nodeLookup, "a", 123, 456)
    pinForceNode(nodeLookup, "a", 123, 456)

    const pinnedNode = nodeLookup.get("a")
    expect(pinnedNode?.fx).toBe(123)
    expect(pinnedNode?.fy).toBe(456)

    releaseForceNode(nodeLookup, "a")
    expect(pinnedNode?.fx).toBeNull()
    expect(pinnedNode?.fy).toBeNull()

    reheatSimulation(simulation, 0.4)
    simulation.stop()
  })
})
