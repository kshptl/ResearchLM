import type { Edge, GraphNode, NodeGroup, NodeType } from "@/features/graph-model/types"

const MAX_TEXT_EXTRACTION_LEN = 5000
const MIN_TEXT_EXTRACTION_LEN = 3

const allowedTypes: NodeType[] = ["topic", "generated", "question", "summary", "keyword", "portal"]

export function createNode(params: {
  workspaceId: string
  canvasId: string
  type: NodeType
  content: string
  x: number
  y: number
  sourceNodeId?: string
}): GraphNode {
  if (!allowedTypes.includes(params.type)) {
    throw new Error(`Unsupported node type: ${params.type}`)
  }

  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    workspaceId: params.workspaceId,
    canvasId: params.canvasId,
    type: params.type,
    content: params.content,
    position: { x: params.x, y: params.y },
    sourceNodeId: params.sourceNodeId,
    createdAt: now,
    updatedAt: now
  }
}

export function createConversationNode(params: {
  workspaceId: string
  canvasId: string
  prompt: string
  content: string
  x: number
  y: number
  sourceNodeId?: string
  providerOverride?: { provider: string; model: string }
}): GraphNode {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    workspaceId: params.workspaceId,
    canvasId: params.canvasId,
    type: "topic",
    prompt: params.prompt,
    content: params.content,
    position: { x: params.x, y: params.y },
    sourceNodeId: params.sourceNodeId,
    providerOverride: params.providerOverride,
    createdAt: now,
    updatedAt: now,
  }
}

export function updateNodeContent(node: GraphNode, content: string): GraphNode {
  return {
    ...node,
    content,
    updatedAt: new Date().toISOString()
  }
}

export function createEdge(params: {
  workspaceId: string
  canvasId: string
  fromNodeId: string
  toNodeId: string
  relationshipType?: string
}): Edge {
  if (params.fromNodeId === params.toNodeId) {
    throw new Error("Self-referential edges are not allowed")
  }

  return {
    id: crypto.randomUUID(),
    workspaceId: params.workspaceId,
    canvasId: params.canvasId,
    fromNodeId: params.fromNodeId,
    toNodeId: params.toNodeId,
    relationshipType: params.relationshipType ?? "related",
    createdAt: new Date().toISOString()
  }
}

export function removeNode(nodes: GraphNode[], edges: Edge[], nodeId: string): { nodes: GraphNode[]; edges: Edge[] } {
  return {
    nodes: nodes.filter((node) => node.id !== nodeId),
    edges: edges.filter((edge) => edge.fromNodeId !== nodeId && edge.toNodeId !== nodeId)
  }
}

export function createNodeGroup(params: {
  workspaceId: string
  canvasId: string
  nodeIds: string[]
  name?: string
  colorToken?: string
}): NodeGroup {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    workspaceId: params.workspaceId,
    canvasId: params.canvasId,
    nodeIds: [...new Set(params.nodeIds)],
    name: params.name,
    colorToken: params.colorToken,
    createdAt: now,
    updatedAt: now
  }
}

export function validateExtractionSpan(text: string): void {
  const normalizedLength = text.replace(/\s+/g, "").length
  if (normalizedLength < MIN_TEXT_EXTRACTION_LEN) {
    throw new Error(`Extraction must contain at least ${MIN_TEXT_EXTRACTION_LEN} non-whitespace characters`)
  }
  if (normalizedLength > MAX_TEXT_EXTRACTION_LEN) {
    throw new Error(`Extraction must not exceed ${MAX_TEXT_EXTRACTION_LEN} non-whitespace characters`)
  }
}

export type MutationOperation<T> = {
  label: string
  apply: (state: T) => T
}

export type MutationBatchResult<T> = {
  state: T
  labels: string[]
}

export function applyMutationBatch<T>(initial: T, operations: MutationOperation<T>[]): MutationBatchResult<T> {
  let next = initial
  const labels: string[] = []

  for (const operation of operations) {
    next = operation.apply(next)
    labels.push(operation.label)
  }

  return {
    state: next,
    labels
  }
}
