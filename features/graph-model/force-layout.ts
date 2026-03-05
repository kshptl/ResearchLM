import {
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  type Simulation,
  type SimulationLinkDatum,
  type SimulationNodeDatum,
} from "d3-force"
import type { Edge, GraphNode } from "@/features/graph-model/types"

const DEFAULT_NODE_WIDTH = 300
const DEFAULT_NODE_HEIGHT = 220
const POSITION_CLAMP = 20_000

export type ForceLayoutNode = SimulationNodeDatum & {
  id: string
  width: number
  height: number
}

export type ForceLayoutLink = SimulationLinkDatum<ForceLayoutNode> & {
  source: string | ForceLayoutNode
  target: string | ForceLayoutNode
}

export type ForceLayoutSimulation = Simulation<ForceLayoutNode, ForceLayoutLink>

function toForceNode(node: GraphNode): ForceLayoutNode {
  const width = Math.max(120, node.dimensions?.width ?? DEFAULT_NODE_WIDTH)
  const height = Math.max(80, node.dimensions?.height ?? DEFAULT_NODE_HEIGHT)

  return {
    id: node.id,
    x: node.position.x,
    y: node.position.y,
    width,
    height,
  }
}

function graphCenter(nodes: GraphNode[]): { x: number; y: number } {
  if (nodes.length === 0) {
    return { x: 0, y: 0 }
  }

  const totals = nodes.reduce(
    (acc, node) => ({
      x: acc.x + node.position.x,
      y: acc.y + node.position.y,
    }),
    { x: 0, y: 0 }
  )

  return {
    x: totals.x / nodes.length,
    y: totals.y / nodes.length,
  }
}

export function createForceLayoutSimulation(nodes: GraphNode[], edges: Edge[]): {
  simulation: ForceLayoutSimulation
  nodeLookup: Map<string, ForceLayoutNode>
} {
  const forceNodes = nodes.map(toForceNode)
  const nodeLookup = new Map(forceNodes.map((node) => [node.id, node]))

  const forceLinks: ForceLayoutLink[] = edges
    .filter((edge) => edge.fromNodeId !== edge.toNodeId)
    .filter((edge) => nodeLookup.has(edge.fromNodeId) && nodeLookup.has(edge.toNodeId))
    .map((edge) => ({
      source: edge.fromNodeId,
      target: edge.toNodeId,
    }))

  const center = graphCenter(nodes)

  const simulation = forceSimulation(forceNodes)
    .force("charge", forceManyBody<ForceLayoutNode>().strength(-620))
    .force(
      "collision",
      forceCollide<ForceLayoutNode>()
        .radius((node) => Math.max(node.width, node.height) / 2 + 52)
        .strength(0.85)
    )
    .force("center", forceCenter(center.x, center.y))
    .alpha(0.9)
    .alphaMin(0.02)
    .alphaDecay(0.05)
    .velocityDecay(0.34)

  if (forceLinks.length > 0) {
    simulation.force(
      "link",
      forceLink<ForceLayoutNode, ForceLayoutLink>(forceLinks)
        .id((node) => node.id)
        .distance(260)
        .strength(0.16)
    )
  }

  return { simulation, nodeLookup }
}

export function pinForceNode(nodeLookup: Map<string, ForceLayoutNode>, nodeId: string, x: number, y: number): void {
  const node = nodeLookup.get(nodeId)
  if (!node) {
    return
  }
  node.x = x
  node.y = y
  node.fx = x
  node.fy = y
}

export function releaseForceNode(nodeLookup: Map<string, ForceLayoutNode>, nodeId: string): void {
  const node = nodeLookup.get(nodeId)
  if (!node) {
    return
  }
  node.fx = null
  node.fy = null
}

export function updateForceNodePosition(nodeLookup: Map<string, ForceLayoutNode>, nodeId: string, x: number, y: number): void {
  const node = nodeLookup.get(nodeId)
  if (!node) {
    return
  }
  node.x = x
  node.y = y
}

export function collectForcePositions(nodeLookup: Map<string, ForceLayoutNode>): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>()

  for (const [nodeId, node] of nodeLookup.entries()) {
    const x = typeof node.x === "number" && Number.isFinite(node.x) ? node.x : 0
    const y = typeof node.y === "number" && Number.isFinite(node.y) ? node.y : 0

    positions.set(nodeId, {
      x: Math.max(-POSITION_CLAMP, Math.min(POSITION_CLAMP, x)),
      y: Math.max(-POSITION_CLAMP, Math.min(POSITION_CLAMP, y)),
    })
  }

  return positions
}

export function reheatSimulation(simulation: ForceLayoutSimulation | null, alpha = 0.38): void {
  if (!simulation) {
    return
  }
  simulation.alpha(Math.max(simulation.alpha(), alpha))
  simulation.restart()
}
