import type { Node as RFNode, Edge as RFEdge } from "@xyflow/react"
import { MarkerType } from "@xyflow/react"
import type { Edge, GraphNode, SemanticLevel } from "@/features/graph-model/types"

export type ResearchlmNodeData = {
  graphNode: GraphNode
  semanticLevel: SemanticLevel
  semanticMode: "auto" | "manual"
  onAddChild?: (nodeId: string) => void
  onRegenerate?: (nodeId: string) => void
  onDeleteNode?: (nodeId: string) => void
  onSetColor?: (nodeId: string, colorToken?: string) => void
  onPromptEditStart?: (nodeId: string) => void
  onPromptSubmit?: (nodeId: string, prompt: string) => void
  onResize?: (nodeId: string, width: number, height: number, isFinal?: boolean) => void
  isStreaming?: boolean
  isEditing?: boolean
  isFocused?: boolean
}

/**
 * Convert one domain node into the shape React Flow expects.
 * Think of this as a translator between "our app data" and "canvas UI data".
 */
export function toRFNode(
  graphNode: GraphNode,
  options: {
    semanticLevel: SemanticLevel
    semanticMode: "auto" | "manual"
    selected: boolean
    onAddChild?: (nodeId: string) => void
    onRegenerate?: (nodeId: string) => void
    onDeleteNode?: (nodeId: string) => void
    onSetColor?: (nodeId: string, colorToken?: string) => void
    onPromptEditStart?: (nodeId: string) => void
    onPromptSubmit?: (nodeId: string, prompt: string) => void
    onResize?: (nodeId: string, width: number, height: number, isFinal?: boolean) => void
    isStreaming?: boolean
    isEditing?: boolean
    isFocused?: boolean
  }
): RFNode<ResearchlmNodeData> {
  return {
    id: graphNode.id,
    type: graphNode.type,
    position: { x: graphNode.position.x, y: graphNode.position.y },
    selected: options.selected,
    // Keep measured + style in sync so React Flow doesn't hide resized nodes.
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
      onRegenerate: options.onRegenerate,
      onDeleteNode: options.onDeleteNode,
      onSetColor: options.onSetColor,
      onPromptEditStart: options.onPromptEditStart,
      onPromptSubmit: options.onPromptSubmit,
      onResize: options.onResize,
      isStreaming: options.isStreaming,
      isEditing: options.isEditing,
      isFocused: options.isFocused,
    },
  }
}

export function toRFEdge(edge: Edge): RFEdge {
  return {
    id: edge.id,
    source: edge.fromNodeId,
    target: edge.toNodeId,
    type: "floating",
    markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16 },
    style: { strokeWidth: 1.5 },
  }
}

/**
 * Convert every domain node to a React Flow node in one pass.
 * We also attach callback handlers and quick lookup flags (selected/editing/streaming).
 */
export function toRFNodes(
  nodes: GraphNode[],
  options: {
    semanticLevel: SemanticLevel
    semanticMode: "auto" | "manual"
    selectedIds: string[]
    onAddChild?: (nodeId: string) => void
    onRegenerate?: (nodeId: string) => void
    onDeleteNode?: (nodeId: string) => void
    onSetColor?: (nodeId: string, colorToken?: string) => void
    onPromptEditStart?: (nodeId: string) => void
    onPromptSubmit?: (nodeId: string, prompt: string) => void
    onResize?: (nodeId: string, width: number, height: number, isFinal?: boolean) => void
    streamingNodeIds?: Set<string>
    editingNodeId?: string | null
    focusedNodeId?: string | null
  }
): RFNode<ResearchlmNodeData>[] {
  // Set lookup is constant-time, so selection checks stay fast even with many nodes.
  const selectedIds = new Set(options.selectedIds)
  return nodes.map((node) =>
    toRFNode(node, {
      semanticLevel: options.semanticLevel,
      semanticMode: options.semanticMode,
      selected: selectedIds.has(node.id),
      onAddChild: options.onAddChild,
      onRegenerate: options.onRegenerate,
      onDeleteNode: options.onDeleteNode,
      onSetColor: options.onSetColor,
      onPromptEditStart: options.onPromptEditStart,
      onPromptSubmit: options.onPromptSubmit,
      onResize: options.onResize,
      isStreaming: options.streamingNodeIds?.has(node.id),
      isEditing: options.editingNodeId === node.id,
      isFocused: options.focusedNodeId === node.id,
    })
  )
}

export function toRFEdges(edges: Edge[]): RFEdge[] {
  return edges.map(toRFEdge)
}

/**
 * Copy a new XY position from React Flow back into our domain node model.
 * `updatedAt` changes so autosave can detect that the user moved the node.
 */
export function applyPositionToDomain(graphNode: GraphNode, position: { x: number; y: number }): GraphNode {
  return {
    ...graphNode,
    position: { x: position.x, y: position.y },
    updatedAt: new Date().toISOString(),
  }
}
