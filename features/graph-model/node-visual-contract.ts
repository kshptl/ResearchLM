import type { NodeType } from "@/features/graph-model/types"

export type NodeVisualSpec = {
  icon: string
  tokenClass: string
  typeLabel: string
}

export const NODE_VISUAL_SPECS: Record<NodeType, NodeVisualSpec> = {
  topic: { icon: "◉", tokenClass: "node-token-topic", typeLabel: "Topic" },
  generated: { icon: "✦", tokenClass: "node-token-generated", typeLabel: "Generated" },
  question: { icon: "?", tokenClass: "node-token-question", typeLabel: "Question" },
  summary: { icon: "≡", tokenClass: "node-token-summary", typeLabel: "Summary" },
  keyword: { icon: "#", tokenClass: "node-token-keyword", typeLabel: "Keyword" },
  portal: { icon: "↗", tokenClass: "node-token-portal", typeLabel: "Portal" }
}

export function getNodeVisualSpec(type: NodeType): NodeVisualSpec {
  return NODE_VISUAL_SPECS[type]
}

export function validateNodeVisualContract(): boolean {
  return (Object.keys(NODE_VISUAL_SPECS) as NodeType[]).every((type) => {
    const spec = NODE_VISUAL_SPECS[type]
    return spec.icon.length > 0 && spec.tokenClass.length > 0 && spec.typeLabel.length > 0
  })
}
