import type { NodeTypes } from "@xyflow/react"
import { SensecapeNode } from "@/components/workspace/canvas/flow-nodes/sensecape-node"

export const nodeTypes: NodeTypes = {
  topic: SensecapeNode,
  generated: SensecapeNode,
  question: SensecapeNode,
  summary: SensecapeNode,
  keyword: SensecapeNode,
  portal: SensecapeNode,
}
