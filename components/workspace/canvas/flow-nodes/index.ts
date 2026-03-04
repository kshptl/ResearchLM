import type { NodeTypes } from "@xyflow/react"
import { ResearchlmNode } from "@/components/workspace/canvas/flow-nodes/researchlm-node"

export const nodeTypes: NodeTypes = {
  topic: ResearchlmNode,
  generated: ResearchlmNode,
  question: ResearchlmNode,
  summary: ResearchlmNode,
  keyword: ResearchlmNode,
  portal: ResearchlmNode,
}
