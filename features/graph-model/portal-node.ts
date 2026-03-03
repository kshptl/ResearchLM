import type { Canvas, GraphNode, HierarchyLink } from "@/features/graph-model/types"

export function createPortalNode(link: HierarchyLink, parentCanvas: Canvas, childCanvas: Canvas): GraphNode {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    workspaceId: parentCanvas.workspaceId,
    canvasId: parentCanvas.id,
    type: "portal",
    content: `Open ${childCanvas.topic}`,
    position: { x: 0, y: 0 },
    sourceNodeId: link.childCanvasId,
    createdAt: now,
    updatedAt: now
  }
}

export function portalTargetCanvasId(node: GraphNode): string | undefined {
  if (node.type !== "portal") {
    return undefined
  }
  return node.sourceNodeId
}
