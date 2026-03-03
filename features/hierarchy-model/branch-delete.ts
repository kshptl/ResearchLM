import type { Canvas, HierarchyLink } from "@/features/graph-model/types"

export function collectDescendants(links: HierarchyLink[], rootId: string): Set<string> {
  const collected = new Set<string>([rootId])
  let changed = true

  while (changed) {
    changed = false
    for (const link of links) {
      if (collected.has(link.parentCanvasId) && !collected.has(link.childCanvasId)) {
        collected.add(link.childCanvasId)
        changed = true
      }
    }
  }

  return collected
}

export function deleteBranch(canvases: Canvas[], links: HierarchyLink[], rootId: string) {
  const removeIds = collectDescendants(links, rootId)
  return {
    canvases: canvases.filter((canvas) => !removeIds.has(canvas.id)),
    links: links.filter((link) => !removeIds.has(link.parentCanvasId) && !removeIds.has(link.childCanvasId))
  }
}

function parentCanvasIdFor(links: HierarchyLink[], canvasId: string): string | undefined {
  return links.find((link) => link.childCanvasId === canvasId)?.parentCanvasId
}

function nearestSurvivingAncestor(
  links: HierarchyLink[],
  removedIds: Set<string>,
  canvasId: string
): string | undefined {
  let current = parentCanvasIdFor(links, canvasId)
  while (current) {
    if (!removedIds.has(current)) {
      return current
    }
    current = parentCanvasIdFor(links, current)
  }
  return undefined
}

export function deleteBranchWithFallback(
  canvases: Canvas[],
  links: HierarchyLink[],
  rootId: string,
  activeCanvasId: string
): {
  canvases: Canvas[]
  links: HierarchyLink[]
  nextActiveCanvasId: string | undefined
  removedCanvasIds: string[]
} {
  const removed = collectDescendants(links, rootId)
  const remainingCanvases = canvases.filter((canvas) => !removed.has(canvas.id))
  const remainingLinks = links.filter((link) => !removed.has(link.parentCanvasId) && !removed.has(link.childCanvasId))

  let nextActiveCanvasId = activeCanvasId
  if (removed.has(activeCanvasId)) {
    nextActiveCanvasId =
      nearestSurvivingAncestor(links, removed, activeCanvasId) ??
      nearestSurvivingAncestor(links, removed, rootId) ??
      remainingCanvases[0]?.id
  }

  return {
    canvases: remainingCanvases,
    links: remainingLinks,
    nextActiveCanvasId,
    removedCanvasIds: [...removed]
  }
}
