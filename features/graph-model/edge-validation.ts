import type { Edge } from "@/features/graph-model/types"

type GraphConnectionInput = {
  sourceId?: string | null
  targetId?: string | null
  edges: Edge[]
}

type ConnectionLike = {
  source?: string | null
  target?: string | null
}

export function hasExactEdge(edges: Edge[], sourceId: string, targetId: string): boolean {
  return edges.some((edge) => edge.fromNodeId === sourceId && edge.toNodeId === targetId)
}

export function isValidGraphConnection({ sourceId, targetId, edges }: GraphConnectionInput): boolean {
  if (!sourceId || !targetId) {
    return false
  }

  if (sourceId === targetId) {
    return false
  }

  return !hasExactEdge(edges, sourceId, targetId)
}

export function isValidReactFlowConnection(connection: ConnectionLike, edges: Edge[]): boolean {
  return isValidGraphConnection({
    sourceId: connection.source,
    targetId: connection.target,
    edges,
  })
}
