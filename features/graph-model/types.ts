export type SemanticLevel = "all" | "lines" | "summary" | "keywords"

export type NodeType = "topic" | "question" | "generated" | "summary" | "keyword" | "portal"

export interface Workspace {
  id: string
  title: string
  rootCanvasId: string
  activeCanvasId: string
  version: number
  providerPreferences?: {
    provider: string
    model: string
  }
  semanticDefaults?: {
    mode: "auto" | "manual"
    manualLevel?: SemanticLevel
  }
  createdAt: string
  updatedAt: string
}

export interface Canvas {
  id: string
  workspaceId: string
  topic: string
  parentCanvasId?: string
  depth: number
  createdAt: string
  updatedAt: string
}

export interface GraphNode {
  id: string
  workspaceId: string
  canvasId: string
  type: NodeType
  prompt?: string
  content: string
  semanticRepresentations?: Partial<Record<SemanticLevel, string>>
  position: { x: number; y: number }
  dimensions?: { width: number; height: number }
  colorToken?: string
  providerOverride?: { provider: string; model: string }
  groupId?: string
  sourceNodeId?: string
  createdAt: string
  updatedAt: string
}

export interface Edge {
  id: string
  workspaceId: string
  canvasId: string
  fromNodeId: string
  toNodeId: string
  relationshipType: string
  createdAt: string
  updatedAt?: string
}

export type Connection = Edge

export interface NodeGroup {
  id: string
  workspaceId: string
  canvasId: string
  name?: string
  nodeIds: string[]
  colorToken?: string
  createdAt: string
  updatedAt: string
}

export interface HierarchyLink {
  id: string
  workspaceId: string
  parentCanvasId: string
  childCanvasId: string
  linkType: "broad-topic" | "subtopic" | "sibling-grouping"
  createdAt: string
}
