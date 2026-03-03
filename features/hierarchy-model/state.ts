import type { Canvas, HierarchyLink } from "@/features/graph-model/types"

export interface HierarchyState {
  canvases: Canvas[]
  links: HierarchyLink[]
}

export type SubtopicCandidateLifecycle = "presented" | "selected" | "dismissed" | "pending"

export interface GeneratedSubtopicCandidate {
  id: string
  workspaceId: string
  parentCanvasId: string
  label: string
  lifecycle: SubtopicCandidateLifecycle
  sourceNodeId?: string
  createdAt: string
  updatedAt: string
}

export function createChildCanvas(parent: Canvas, topic: string): Canvas {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    workspaceId: parent.workspaceId,
    topic,
    parentCanvasId: parent.id,
    depth: parent.depth + 1,
    createdAt: now,
    updatedAt: now
  }
}

export function createHierarchyLink(parentCanvasId: string, childCanvasId: string, workspaceId: string): HierarchyLink {
  return {
    id: crypto.randomUUID(),
    workspaceId,
    parentCanvasId,
    childCanvasId,
    linkType: "subtopic",
    createdAt: new Date().toISOString()
  }
}

export function wouldCreateCycle(links: HierarchyLink[], parentCanvasId: string, childCanvasId: string): boolean {
  if (parentCanvasId === childCanvasId) {
    return true
  }

  const adjacency = new Map<string, string[]>()
  for (const link of links) {
    const list = adjacency.get(link.parentCanvasId) ?? []
    list.push(link.childCanvasId)
    adjacency.set(link.parentCanvasId, list)
  }

  adjacency.set(parentCanvasId, [...(adjacency.get(parentCanvasId) ?? []), childCanvasId])

  const seen = new Set<string>()
  const stack: string[] = [childCanvasId]

  while (stack.length) {
    const current = stack.pop()!
    if (current === parentCanvasId) {
      return true
    }
    if (seen.has(current)) {
      continue
    }
    seen.add(current)
    for (const next of adjacency.get(current) ?? []) {
      stack.push(next)
    }
  }

  return false
}

export function linkExists(links: HierarchyLink[], parentCanvasId: string, childCanvasId: string): boolean {
  return links.some((link) => link.parentCanvasId === parentCanvasId && link.childCanvasId === childCanvasId)
}

export function upsertHierarchyLink(links: HierarchyLink[], link: HierarchyLink): HierarchyLink[] {
  if (linkExists(links, link.parentCanvasId, link.childCanvasId)) {
    return links
  }
  if (wouldCreateCycle(links, link.parentCanvasId, link.childCanvasId)) {
    return links
  }
  return [...links, link]
}

export function childCanvasIds(links: HierarchyLink[], parentCanvasId: string): string[] {
  return links.filter((link) => link.parentCanvasId === parentCanvasId).map((link) => link.childCanvasId)
}

export function buildCanvasTree(canvases: Canvas[], links: HierarchyLink[], rootCanvasId: string): Canvas[] {
  const map = new Map(canvases.map((canvas) => [canvas.id, canvas]))
  const ordered: Canvas[] = []
  const queue: string[] = [rootCanvasId]
  const seen = new Set<string>()

  while (queue.length) {
    const id = queue.shift()!
    if (seen.has(id)) {
      continue
    }
    seen.add(id)
    const canvas = map.get(id)
    if (canvas) {
      ordered.push(canvas)
      const children = childCanvasIds(links, id)
      for (const childId of children) {
        queue.push(childId)
      }
    }
  }

  for (const canvas of canvases) {
    if (!seen.has(canvas.id)) {
      ordered.push(canvas)
    }
  }

  return ordered
}

export function upsertSubtopicCandidate(
  candidates: GeneratedSubtopicCandidate[],
  candidate: GeneratedSubtopicCandidate
): GeneratedSubtopicCandidate[] {
  const found = candidates.find((item) => item.id === candidate.id)
  if (!found) {
    return [...candidates, candidate]
  }
  return candidates.map((item) => (item.id === candidate.id ? { ...found, ...candidate } : item))
}

export function setSubtopicCandidateLifecycle(
  candidates: GeneratedSubtopicCandidate[],
  candidateId: string,
  lifecycle: SubtopicCandidateLifecycle
): GeneratedSubtopicCandidate[] {
  return candidates.map((candidate) =>
    candidate.id === candidateId
      ? {
          ...candidate,
          lifecycle,
          updatedAt: new Date().toISOString()
        }
      : candidate
  )
}

export function candidatesForCanvas(
  candidates: GeneratedSubtopicCandidate[],
  parentCanvasId: string
): GeneratedSubtopicCandidate[] {
  return candidates.filter((candidate) => candidate.parentCanvasId === parentCanvasId)
}
