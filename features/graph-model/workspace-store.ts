import type { Canvas, Edge, GraphNode, NodeGroup, Workspace } from "@/features/graph-model/types"

export type PaneLayoutState = {
  leftPaneCollapsed: boolean
  rightPaneCollapsed: boolean
  leftPaneWidthPx: number
  rightPaneWidthPx: number
  activeInspectorTab: "details" | "generation" | "semantic"
}

export type PersistedWorkspaceSlice = {
  workspace: Workspace
  canvases: Record<string, Canvas>
  nodes: Record<string, GraphNode>
  edges: Record<string, Edge>
  nodeGroups: Record<string, NodeGroup>
  paneLayout: PaneLayoutState
}

export type EphemeralWorkspaceSlice = {
  activeCanvasId: string
  selectedNodeIds: string[]
  selectedEdgeIds: string[]
  interactionMode: "select" | "pan" | "connect" | "lasso"
  lassoBounds: { x: number; y: number; width: number; height: number } | null
}

export type InspectorDraftSlice = {
  activeNodeId: string | null
  draftContent: string
  draftUpdatedAt: string | null
}

export type WorkspaceStoreState = {
  persisted: PersistedWorkspaceSlice
  ephemeral: EphemeralWorkspaceSlice
  inspectorDraft: InspectorDraftSlice
}

const MIN_PANE_WIDTH = 240
const MAX_PANE_WIDTH = 480

export function clampPaneWidth(value: number): number {
  return Math.max(MIN_PANE_WIDTH, Math.min(MAX_PANE_WIDTH, Math.round(value)))
}

export function updatePaneLayout(
  current: PaneLayoutState,
  updates: Partial<PaneLayoutState>
): PaneLayoutState {
  return {
    ...current,
    ...updates,
    leftPaneWidthPx:
      updates.leftPaneWidthPx === undefined ? current.leftPaneWidthPx : clampPaneWidth(updates.leftPaneWidthPx),
    rightPaneWidthPx:
      updates.rightPaneWidthPx === undefined
        ? current.rightPaneWidthPx
        : clampPaneWidth(updates.rightPaneWidthPx)
  }
}

export function createWorkspaceStoreState(workspace: Workspace): WorkspaceStoreState {
  const now = new Date().toISOString()
  return {
    persisted: {
      workspace,
      canvases: {},
      nodes: {},
      edges: {},
      nodeGroups: {},
      paneLayout: {
        leftPaneCollapsed: false,
        rightPaneCollapsed: false,
        leftPaneWidthPx: 280,
        rightPaneWidthPx: 320,
        activeInspectorTab: "details"
      }
    },
    ephemeral: {
      activeCanvasId: workspace.activeCanvasId,
      selectedNodeIds: [],
      selectedEdgeIds: [],
      interactionMode: "select",
      lassoBounds: null
    },
    inspectorDraft: {
      activeNodeId: null,
      draftContent: "",
      draftUpdatedAt: now
    }
  }
}

export function setInspectorDraft(
  current: InspectorDraftSlice,
  updates: Pick<InspectorDraftSlice, "activeNodeId" | "draftContent">
): InspectorDraftSlice {
  return {
    ...current,
    ...updates,
    draftUpdatedAt: new Date().toISOString()
  }
}
