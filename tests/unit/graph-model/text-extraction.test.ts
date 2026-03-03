import { describe, expect, it } from "vitest"
import { extractTextToNode } from "@/features/graph-model/text-extraction"

describe("text extraction", () => {
  const source = {
    id: "source-1",
    workspaceId: "w1",
    canvasId: "c1",
    type: "generated" as const,
    content: "Some generated content",
    position: { x: 0, y: 0 },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }

  it("creates extracted node with provenance", () => {
    const extracted = extractTextToNode(source, "key detail")
    expect(extracted.sourceNodeId).toBe(source.id)
    expect(extracted.canvasId).toBe(source.canvasId)
  })

  it("rejects very short extraction span", () => {
    expect(() => extractTextToNode(source, "ab")).toThrow(/at least/i)
  })
})
