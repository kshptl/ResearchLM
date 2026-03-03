import type { Canvas, Connection, GraphNode, Workspace } from "@/features/graph-model/types"

export type WorkspaceFixture = {
  workspace: Workspace
  canvases: Canvas[]
  nodes: GraphNode[]
  edges: Connection[]
}

export function createWorkspaceFixture(seed: string = "baseline"): WorkspaceFixture {
  const now = new Date("2026-03-02T10:00:00.000Z").toISOString()
  const workspaceId = `ws-${seed}`
  const rootCanvasId = `canvas-${seed}-root`
  const childCanvasId = `canvas-${seed}-child`

  const workspace: Workspace = {
    id: workspaceId,
    title: "Sensecape Fixture Workspace",
    rootCanvasId,
    activeCanvasId: rootCanvasId,
    version: 1,
    semanticDefaults: {
      mode: "auto"
    },
    createdAt: now,
    updatedAt: now
  }

  const canvases: Canvas[] = [
    {
      id: rootCanvasId,
      workspaceId,
      topic: "Root",
      depth: 0,
      createdAt: now,
      updatedAt: now
    },
    {
      id: childCanvasId,
      workspaceId,
      topic: "Subtopic",
      parentCanvasId: rootCanvasId,
      depth: 1,
      createdAt: now,
      updatedAt: now
    }
  ]

  const nodes: GraphNode[] = [
    {
      id: `node-${seed}-topic`,
      workspaceId,
      canvasId: rootCanvasId,
      type: "topic",
      content: "Complex systems",
      position: { x: 24, y: 24 },
      createdAt: now,
      updatedAt: now
    },
    {
      id: `node-${seed}-generated`,
      workspaceId,
      canvasId: rootCanvasId,
      type: "generated",
      content: "Generated content about complex systems.",
      position: { x: 240, y: 48 },
      sourceNodeId: `node-${seed}-topic`,
      createdAt: now,
      updatedAt: now
    }
  ]

  const edges: Connection[] = [
    {
      id: `edge-${seed}-1`,
      workspaceId,
      canvasId: rootCanvasId,
      fromNodeId: `node-${seed}-topic`,
      toNodeId: `node-${seed}-generated`,
      relationshipType: "expands",
      createdAt: now
    }
  ]

  return {
    workspace,
    canvases,
    nodes,
    edges
  }
}
