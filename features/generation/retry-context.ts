export type RetryContextSnapshot = {
  selectedNodeIds: string[]
  selectedEdgeIds: string[]
  inspectorActiveNodeId: string | null
  inspectorDraft: string
  capturedAt: string
}

export function captureRetryContext(input: {
  selectedNodeIds: string[]
  selectedEdgeIds: string[]
  inspectorActiveNodeId: string | null
  inspectorDraft: string
}): RetryContextSnapshot {
  return {
    selectedNodeIds: [...input.selectedNodeIds],
    selectedEdgeIds: [...input.selectedEdgeIds],
    inspectorActiveNodeId: input.inspectorActiveNodeId,
    inspectorDraft: input.inspectorDraft,
    capturedAt: new Date().toISOString()
  }
}

export function restoreRetryContext(
  snapshot: RetryContextSnapshot,
  current: {
    selectedNodeIds: string[]
    selectedEdgeIds: string[]
    inspectorActiveNodeId: string | null
    inspectorDraft: string
  }
) {
  return {
    ...current,
    selectedNodeIds: [...snapshot.selectedNodeIds],
    selectedEdgeIds: [...snapshot.selectedEdgeIds],
    inspectorActiveNodeId: snapshot.inspectorActiveNodeId,
    inspectorDraft: snapshot.inspectorDraft
  }
}
