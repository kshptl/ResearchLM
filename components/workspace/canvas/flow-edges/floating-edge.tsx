import React from "react"
import {
  BaseEdge,
  Position,
  getBezierPath,
  useInternalNode,
  type EdgeProps,
  type InternalNode,
} from "@xyflow/react"

type XY = { x: number; y: number }

type EdgeParams = {
  sourceX: number
  sourceY: number
  targetX: number
  targetY: number
  sourcePosition: Position
  targetPosition: Position
}

function getMeasuredSize(node: InternalNode): { width: number; height: number } {
  const width = node.measured.width ?? node.width ?? node.initialWidth ?? 1
  const height = node.measured.height ?? node.height ?? node.initialHeight ?? 1
  return {
    width: Math.max(1, width),
    height: Math.max(1, height),
  }
}

function getNodeIntersection(fromNode: InternalNode, toNode: InternalNode): XY {
  const fromSize = getMeasuredSize(fromNode)
  const toSize = getMeasuredSize(toNode)

  const fromCenterX = fromNode.internals.positionAbsolute.x + fromSize.width / 2
  const fromCenterY = fromNode.internals.positionAbsolute.y + fromSize.height / 2
  const toCenterX = toNode.internals.positionAbsolute.x + toSize.width / 2
  const toCenterY = toNode.internals.positionAbsolute.y + toSize.height / 2

  const halfWidth = fromSize.width / 2
  const halfHeight = fromSize.height / 2
  const safeHalfWidth = Math.max(1, halfWidth)
  const safeHalfHeight = Math.max(1, halfHeight)

  const xx1 = (toCenterX - fromCenterX) / (2 * safeHalfWidth) - (toCenterY - fromCenterY) / (2 * safeHalfHeight)
  const yy1 = (toCenterX - fromCenterX) / (2 * safeHalfWidth) + (toCenterY - fromCenterY) / (2 * safeHalfHeight)
  const denominator = Math.abs(xx1) + Math.abs(yy1)
  const a = denominator === 0 ? 0 : 1 / denominator
  const xx3 = a * xx1
  const yy3 = a * yy1

  return {
    x: halfWidth * (xx3 + yy3) + fromCenterX,
    y: halfHeight * (-xx3 + yy3) + fromCenterY,
  }
}

function getEdgePosition(node: InternalNode, intersection: XY): Position {
  const size = getMeasuredSize(node)
  const nodeX = Math.round(node.internals.positionAbsolute.x)
  const nodeY = Math.round(node.internals.positionAbsolute.y)
  const x = Math.round(intersection.x)
  const y = Math.round(intersection.y)

  if (x <= nodeX + 1) {
    return Position.Left
  }
  if (x >= nodeX + size.width - 1) {
    return Position.Right
  }
  if (y <= nodeY + 1) {
    return Position.Top
  }
  if (y >= nodeY + size.height - 1) {
    return Position.Bottom
  }
  return Position.Top
}

function getEdgeParams(sourceNode: InternalNode, targetNode: InternalNode): EdgeParams {
  const sourceIntersection = getNodeIntersection(sourceNode, targetNode)
  const targetIntersection = getNodeIntersection(targetNode, sourceNode)

  return {
    sourceX: sourceIntersection.x,
    sourceY: sourceIntersection.y,
    targetX: targetIntersection.x,
    targetY: targetIntersection.y,
    sourcePosition: getEdgePosition(sourceNode, sourceIntersection),
    targetPosition: getEdgePosition(targetNode, targetIntersection),
  }
}

export function FloatingEdge({
  id,
  source,
  target,
  markerEnd,
  markerStart,
  style,
}: EdgeProps): React.ReactElement | null {
  const sourceNode = useInternalNode(source)
  const targetNode = useInternalNode(target)

  if (!sourceNode || !targetNode) {
    return null
  }

  const { sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition } = getEdgeParams(sourceNode, targetNode)

  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  })

  return <BaseEdge id={id} path={edgePath} markerEnd={markerEnd} markerStart={markerStart} style={style} />
}
