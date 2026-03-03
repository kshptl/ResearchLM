import type { GraphNode } from "@/features/graph-model/types"
import { validateExtractionSpan } from "@/features/graph-model/mutations"

export function extractTextToNode(source: GraphNode, selection: string): GraphNode {
  const cleaned = selection.trim()
  if (!cleaned) {
    throw new Error("Cannot create node from empty text selection")
  }

  validateExtractionSpan(cleaned)

  const timestamp = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    workspaceId: source.workspaceId,
    canvasId: source.canvasId,
    type: "topic",
    content: cleaned,
    position: {
      x: source.position.x + 48,
      y: source.position.y + 48
    },
    sourceNodeId: source.id,
    createdAt: timestamp,
    updatedAt: timestamp
  }
}
