import type { Node as RFNode, Edge as RFEdge } from "@xyflow/react"
import { MarkerType } from "@xyflow/react"
import type { Edge, GraphNode, SemanticLevel } from "@/features/graph-model/types"

export type SensecapeNodeData = {
  graphNode: GraphNode
  semanticLevel: SemanticLevel
  semanticMode: "auto" | "manual"
  onAddChild?: (nodeId: string) => void
  onPromptSubmit?: (nodeId: string, prompt: string) => void
  onResize?: (nodeId: string, width: number, height: number, isFinal?: boolean) => void
  isStreaming?: boolean
  isEditing?: boolean
}

export function toRFNode(
  graphNode: GraphNode,
  options: {
    semanticLevel: SemanticLevel
    semanticMode: "auto" | "manual"
    selected: boolean
    onAddChild?: (nodeId: string) => void
    onPromptSubmit?: (nodeId: string, prompt: string) => void
    onResize?: (nodeId: string, width: number, height: number, isFinal?: boolean) => void
    isStreaming?: boolean
    isEditing?: boolean
  }
): RFNode<SensecapeNodeData> {
  return {
    id: graphNode.id,
    type: graphNode.type,
    position: { x: graphNode.position.x, y: graphNode.position.y },
    selected: options.selected,
    // Set both measured AND style dimensions to avoid visibility:hidden
    // measured tells React Flow the node has been measured, style sets actual size
    ...(graphNode.dimensions
      ? {
          measured: { width: graphNode.dimensions.width, height: graphNode.dimensions.height },
          style: { width: graphNode.dimensions.width, height: graphNode.dimensions.height },
        }
      : {}),
    data: {
      graphNode,
      semanticLevel: options.semanticLevel,
      semanticMode: options.semanticMode,
      onAddChild: options.onAddChild,
      onPromptSubmit: options.onPromptSubmit,
      onResize: options.onResize,
      isStreaming: options.isStreaming,
      isEditing: options.isEditing,
    },
  }
}

export function toRFEdge(edge: Edge): RFEdge {
  return {
    id: edge.id,
    source: edge.fromNodeId,
    target: edge.toNodeId,
    type: "smoothstep",
    markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16 },
    style: { strokeWidth: 1.5 },
  }
}

export function toRFNodes(
  nodes: GraphNode[],
  options: {
    semanticLevel: SemanticLevel
    semanticMode: "auto" | "manual"
    selectedIds: string[]
    onAddChild?: (nodeId: string) => void
    onPromptSubmit?: (nodeId: string, prompt: string) => void
    onResize?: (nodeId: string, width: number, height: number, isFinal?: boolean) => void
    streamingNodeIds?: Set<string>
    editingNodeId?: string | null
  }
): RFNode<SensecapeNodeData>[] {
  return nodes.map((node) =>
    toRFNode(node, {
      semanticLevel: options.semanticLevel,
      semanticMode: options.semanticMode,
      selected: options.selectedIds.includes(node.id),
      onAddChild: options.onAddChild,
      onPromptSubmit: options.onPromptSubmit,
      onResize: options.onResize,
      isStreaming: options.streamingNodeIds?.has(node.id),
      isEditing: options.editingNodeId === node.id,
    })
  )
}

export function toRFEdges(edges: Edge[]): RFEdge[] {
  return edges.map(toRFEdge)
}

export function applyPositionToDomain(graphNode: GraphNode, position: { x: number; y: number }): GraphNode {
  return {
    ...graphNode,
    position: { x: position.x, y: position.y },
    updatedAt: new Date().toISOString(),
  }
}
