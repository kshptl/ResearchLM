export interface NavigationState {
  activeCanvasId: string
  focusedHierarchyCanvasId?: string
}

export function setActiveCanvas(state: NavigationState, canvasId: string): NavigationState {
  return { ...state, activeCanvasId: canvasId, focusedHierarchyCanvasId: canvasId }
}

export function synchronizeHierarchySelection(state: NavigationState, selectedCanvasId: string): NavigationState {
  if (state.activeCanvasId === selectedCanvasId && state.focusedHierarchyCanvasId === selectedCanvasId) {
    return state
  }

  return {
    ...state,
    activeCanvasId: selectedCanvasId,
    focusedHierarchyCanvasId: selectedCanvasId
  }
}

export function navigateViaPortal(state: NavigationState, targetCanvasId: string): NavigationState {
  return {
    ...state,
    activeCanvasId: targetCanvasId,
    focusedHierarchyCanvasId: targetCanvasId
  }
}
