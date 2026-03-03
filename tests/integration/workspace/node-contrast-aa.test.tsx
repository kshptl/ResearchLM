import React from "react"
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { NodeCard } from "@/components/workspace/canvas/node-card"
import { NODE_VISUAL_SPECS } from "@/features/graph-model/node-visual-contract"

describe("node contrast/accessibility contract", () => {
  it("renders each node type with dedicated visual token class and label", () => {
    const tokenClasses = Object.values(NODE_VISUAL_SPECS).map((spec) => spec.tokenClass)
    expect(new Set(tokenClasses).size).toBe(tokenClasses.length)

    render(
      <div>
        {Object.entries(NODE_VISUAL_SPECS).map(([type, spec]) => (
          <NodeCard key={type} id={type} type={type as keyof typeof NODE_VISUAL_SPECS} content={`${spec.typeLabel} content`} onChange={() => {}} />
        ))}
      </div>
    )

    for (const spec of Object.values(NODE_VISUAL_SPECS)) {
      expect(screen.getByText(spec.typeLabel)).toBeInTheDocument()
    }
  })
})
