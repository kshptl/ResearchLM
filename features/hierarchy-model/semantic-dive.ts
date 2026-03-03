import type { Canvas, GraphNode, HierarchyLink } from "@/features/graph-model/types"
import { createChildCanvas, createHierarchyLink, linkExists, upsertHierarchyLink } from "@/features/hierarchy-model/state"

export interface SemanticDiveResult {
  canvas: Canvas
  link: HierarchyLink
  reusedCanvas: boolean
}

type SemanticDiveInput = {
  node: GraphNode
  currentCanvas: Canvas
  canvases: Canvas[]
  links: HierarchyLink[]
  reuseExistingByTopic?: boolean
}

function normalizeTopic(value: string): string {
  return value.trim().toLowerCase()
}

export function runSemanticDive({
  node,
  currentCanvas,
  canvases,
  links,
  reuseExistingByTopic = true
}: SemanticDiveInput): { result: SemanticDiveResult; links: HierarchyLink[] } {
  const normalized = normalizeTopic(node.content)
  const reusedCanvas = reuseExistingByTopic
    ? canvases.find(
        (canvas) =>
          canvas.parentCanvasId === currentCanvas.id &&
          normalizeTopic(canvas.topic) === normalized &&
          canvas.workspaceId === currentCanvas.workspaceId
      )
    : undefined

  const canvas = reusedCanvas ?? createChildCanvas(currentCanvas, node.content)
  const existingLink = links.find(
    (link) => link.parentCanvasId === currentCanvas.id && link.childCanvasId === canvas.id && link.linkType === "subtopic"
  )

  const link =
    existingLink ??
    createHierarchyLink(currentCanvas.id, canvas.id, currentCanvas.workspaceId)

  const nextLinks = linkExists(links, link.parentCanvasId, link.childCanvasId) ? links : upsertHierarchyLink(links, link)

  return {
    result: {
      canvas,
      link,
      reusedCanvas: Boolean(reusedCanvas)
    },
    links: nextLinks
  }
}

export function semanticDiveFromNode(node: GraphNode, currentCanvas: Canvas): { canvas: Canvas; link: HierarchyLink } {
  const { result } = runSemanticDive({
    node,
    currentCanvas,
    canvases: [],
    links: [],
    reuseExistingByTopic: false
  })

  return { canvas: result.canvas, link: result.link }
}
