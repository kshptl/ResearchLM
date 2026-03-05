import type { Edge, GraphNode } from "@/features/graph-model/types"
import { applyPromptContextBlocks, transformPromptContextBlocksForModel } from "@/features/generation/context-block"

type UpstreamNodeContext = {
  node: GraphNode
  depth: number
}

function byCreatedAtThenId(left: GraphNode, right: GraphNode): number {
  const leftTime = Date.parse(left.createdAt)
  const rightTime = Date.parse(right.createdAt)

  if (!Number.isNaN(leftTime) && !Number.isNaN(rightTime) && leftTime !== rightTime) {
    return leftTime - rightTime
  }

  return left.id.localeCompare(right.id)
}

function collectParentsByChild(nodes: GraphNode[], edges: Edge[]): Map<string, string[]> {
  const byChild = new Map<string, string[]>()

  for (const edge of edges) {
    const existing = byChild.get(edge.toNodeId)
    if (existing) {
      if (!existing.includes(edge.fromNodeId)) {
        existing.push(edge.fromNodeId)
      }
    } else {
      byChild.set(edge.toNodeId, [edge.fromNodeId])
    }
  }

  // Backward compatibility for older nodes persisted with only sourceNodeId links.
  for (const node of nodes) {
    if (!node.sourceNodeId) {
      continue
    }
    const existing = byChild.get(node.id)
    if (existing) {
      if (!existing.includes(node.sourceNodeId)) {
        existing.push(node.sourceNodeId)
      }
    } else {
      byChild.set(node.id, [node.sourceNodeId])
    }
  }

  return byChild
}

function collectUpstreamNodes(nodes: GraphNode[], edges: Edge[], nodeId: string): UpstreamNodeContext[] {
  const byId = new Map(nodes.map((node) => [node.id, node]))
  const parentsByChild = collectParentsByChild(nodes, edges)
  const queue: Array<{ id: string; depth: number }> = []

  for (const parentId of parentsByChild.get(nodeId) ?? []) {
    queue.push({ id: parentId, depth: 1 })
  }

  const visited = new Set<string>()
  const collected: UpstreamNodeContext[] = []

  while (queue.length > 0) {
    const next = queue.shift()!
    if (visited.has(next.id)) {
      continue
    }
    visited.add(next.id)

    const node = byId.get(next.id)
    if (!node) {
      continue
    }

    collected.push({ node, depth: next.depth })

    const parents = (parentsByChild.get(next.id) ?? [])
      .map((id) => byId.get(id))
      .filter((candidate): candidate is GraphNode => Boolean(candidate))
      .sort(byCreatedAtThenId)

    for (const parent of parents) {
      if (!visited.has(parent.id)) {
        queue.push({ id: parent.id, depth: next.depth + 1 })
      }
    }
  }

  return collected.sort((left, right) => {
    if (left.depth !== right.depth) {
      return right.depth - left.depth
    }
    return byCreatedAtThenId(left.node, right.node)
  })
}

export function buildConversationContext(nodes: GraphNode[], edges: Edge[], nodeId: string): string {
  const upstreamNodes = collectUpstreamNodes(nodes, edges, nodeId)

  if (upstreamNodes.length === 0) {
    return ""
  }

  return upstreamNodes
    .map(({ node }) => {
      const parts: string[] = []
      if (node.prompt) {
        parts.push(
          `User: ${transformPromptContextBlocksForModel(
            applyPromptContextBlocks(node.prompt, node.promptContextBlocks),
          )}`,
        )
      }
      if (node.content) {
        parts.push(`Assistant: ${node.content}`)
      }
      return parts.join("\n")
    })
    .filter((part) => part.length > 0)
    .join("\n\n")
}

export function composePromptWithConversationContext(
  nodes: GraphNode[],
  edges: Edge[],
  nodeId: string,
  prompt: string,
  promptContextBlocks?: string[]
): string {
  const normalizedPrompt = transformPromptContextBlocksForModel(
    applyPromptContextBlocks(prompt, promptContextBlocks),
  )
  const context = buildConversationContext(nodes, edges, nodeId)
  if (!context) {
    return normalizedPrompt
  }
  return `${context}\n\nUser: ${normalizedPrompt}`
}
