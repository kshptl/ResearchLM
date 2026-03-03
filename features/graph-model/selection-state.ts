import type { GraphNode } from "@/features/graph-model/types"

export type LassoBounds = {
  x: number
  y: number
  width: number
  height: number
}

export type SelectionState = {
  nodeIds: string[]
  edgeIds: string[]
  lassoBounds: LassoBounds | null
}

export function createSelectionState(): SelectionState {
  return {
    nodeIds: [],
    edgeIds: [],
    lassoBounds: null
  }
}

export function toggleNodeSelection(state: SelectionState, nodeId: string): SelectionState {
  const hasNode = state.nodeIds.includes(nodeId)
  return {
    ...state,
    nodeIds: hasNode ? state.nodeIds.filter((id) => id !== nodeId) : [...state.nodeIds, nodeId]
  }
}

export function setLassoBounds(state: SelectionState, bounds: LassoBounds | null): SelectionState {
  return {
    ...state,
    lassoBounds: bounds
  }
}

export function applyLassoSelection(state: SelectionState, nodes: GraphNode[], bounds: LassoBounds): SelectionState {
  const right = bounds.x + bounds.width
  const bottom = bounds.y + bounds.height

  const selected = nodes
    .filter((node) => {
      const x = node.position.x
      const y = node.position.y
      return x >= bounds.x && x <= right && y >= bounds.y && y <= bottom
    })
    .map((node) => node.id)

  return {
    ...state,
    nodeIds: selected,
    lassoBounds: bounds
  }
}
