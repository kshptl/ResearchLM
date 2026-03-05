import "@/tests/helpers/mock-react-flow"
import React from "react"
import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { ResearchlmNode } from "@/components/workspace/canvas/flow-nodes/researchlm-node"
import { TooltipProvider } from "@/components/ui/tooltip"
import type { ResearchlmNodeData } from "@/features/graph-model/react-flow-adapters"
import type { GraphNode } from "@/features/graph-model/types"

function nodeProps(data: ResearchlmNodeData, selected: boolean): React.ComponentProps<typeof ResearchlmNode> {
  return {
    id: "node-1",
    data,
    selected,
  } as unknown as React.ComponentProps<typeof ResearchlmNode>
}

function createNodeData(isFocused: boolean): ResearchlmNodeData {
  const graphNode: GraphNode = {
    id: "node-1",
    workspaceId: "w1",
    canvasId: "c1",
    type: "topic",
    prompt: "Prompt",
    content: "Line 1\nLine 2\nLine 3",
    position: { x: 0, y: 0 },
    createdAt: "2026-03-04T00:00:00.000Z",
    updatedAt: "2026-03-04T00:00:00.000Z",
  }

  return {
    graphNode,
    semanticLevel: "all",
    semanticMode: "auto",
    isFocused,
  }
}

describe("researchlm node wheel behavior", () => {
  it("does not bubble wheel to canvas when node is focused", () => {
    const onCanvasWheel = vi.fn()

    render(
      <TooltipProvider>
        <div onWheel={onCanvasWheel}>
          <ResearchlmNode {...nodeProps(createNodeData(true), true)} />
        </div>
      </TooltipProvider>
    )

    fireEvent.wheel(screen.getByRole("article"), { deltaY: 120 })
    expect(onCanvasWheel).not.toHaveBeenCalled()
  })

  it("bubbles wheel to canvas when node is not focused", () => {
    const onCanvasWheel = vi.fn()

    render(
      <TooltipProvider>
        <div onWheel={onCanvasWheel}>
          <ResearchlmNode {...nodeProps(createNodeData(false), false)} />
        </div>
      </TooltipProvider>
    )

    fireEvent.wheel(screen.getByRole("article"), { deltaY: 120 })
    expect(onCanvasWheel).toHaveBeenCalledTimes(1)
  })
})
