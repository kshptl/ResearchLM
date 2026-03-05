import { describe, expect, it } from "vitest"
import { buildConversationContext, composePromptWithConversationContext } from "@/features/generation/conversation-context"
import type { Edge, GraphNode } from "@/features/graph-model/types"

function node(overrides: Partial<GraphNode>): GraphNode {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    workspaceId: overrides.workspaceId ?? "w",
    canvasId: overrides.canvasId ?? "c",
    type: overrides.type ?? "topic",
    prompt: overrides.prompt,
    promptContextBlocks: overrides.promptContextBlocks,
    content: overrides.content ?? "",
    position: overrides.position ?? { x: 0, y: 0 },
    sourceNodeId: overrides.sourceNodeId,
    createdAt: overrides.createdAt ?? "2026-01-01T00:00:00.000Z",
    updatedAt: overrides.updatedAt ?? "2026-01-01T00:00:00.000Z",
  }
}

function edge(fromNodeId: string, toNodeId: string): Edge {
  return {
    id: `${fromNodeId}-${toNodeId}`,
    workspaceId: "w",
    canvasId: "c",
    fromNodeId,
    toNodeId,
    relationshipType: "related",
    createdAt: "2026-01-01T00:00:00.000Z",
  }
}

describe("conversation context", () => {
  it("returns empty context for a root node", () => {
    const root = node({ id: "root", prompt: "Root prompt", content: "Root answer" })
    expect(buildConversationContext([root], [], root.id)).toBe("")
  })

  it("composes child prompt with ordered ancestor context from graph edges", () => {
    const root = node({ id: "root", prompt: "Root prompt", content: "Root answer" })
    const child = node({ id: "child", prompt: "Child prompt", sourceNodeId: "root" })

    const fullPrompt = composePromptWithConversationContext([root, child], [edge("root", "child")], child.id, "Child prompt")
    expect(fullPrompt).toBe("User: Root prompt\nAssistant: Root answer\n\nUser: Child prompt")
  })

  it("uses latest parent content when composing regenerate prompt", () => {
    const rootV1 = node({ id: "root", prompt: "Root prompt", content: "Root answer v1" })
    const child = node({ id: "child", prompt: "Child prompt", sourceNodeId: "root" })
    const rootV2 = { ...rootV1, content: "Root answer v2", updatedAt: "2026-01-01T00:00:01.000Z" }

    const before = composePromptWithConversationContext([rootV1, child], [edge("root", "child")], child.id, "Child prompt")
    const after = composePromptWithConversationContext([rootV2, child], [edge("root", "child")], child.id, "Child prompt")

    expect(before).toContain("Assistant: Root answer v1")
    expect(after).toContain("Assistant: Root answer v2")
    expect(after).not.toContain("Assistant: Root answer v1")
  })

  it("includes all upstream ancestors and dedupes converged branches", () => {
    const root = node({ id: "root", prompt: "Root", content: "Root answer", createdAt: "2026-01-01T00:00:00.000Z" })
    const branchA = node({ id: "a", prompt: "Branch A", content: "A answer", createdAt: "2026-01-01T00:00:01.000Z" })
    const branchB = node({ id: "b", prompt: "Branch B", content: "B answer", createdAt: "2026-01-01T00:00:02.000Z" })
    const merge = node({ id: "merge", prompt: "Merge", content: "Merge answer", createdAt: "2026-01-01T00:00:03.000Z" })
    const target = node({ id: "target", prompt: "Next" })

    const context = buildConversationContext(
      [root, branchA, branchB, merge, target],
      [
        edge("root", "a"),
        edge("root", "b"),
        edge("a", "merge"),
        edge("b", "merge"),
        edge("merge", "target"),
      ],
      "target"
    )

    expect(context).toContain("User: Root")
    expect(context).toContain("User: Branch A")
    expect(context).toContain("User: Branch B")
    expect(context).toContain("User: Merge")
    expect(context.match(/User: Root/g)?.length ?? 0).toBe(1)
  })

  it("is cycle-safe and does not duplicate visited nodes", () => {
    const a = node({ id: "a", prompt: "A", content: "A answer" })
    const b = node({ id: "b", prompt: "B", content: "B answer" })
    const c = node({ id: "c", prompt: "C", content: "C answer" })

    const context = buildConversationContext(
      [a, b, c],
      [edge("a", "b"), edge("b", "c"), edge("c", "a")],
      "c"
    )

    expect(context.match(/User: A/g)?.length ?? 0).toBe(1)
    expect(context.match(/User: B/g)?.length ?? 0).toBe(1)
  })

  it("transforms visible context blocks into backend xml tags", () => {
    const root = node({ id: "root", prompt: "Root prompt", content: "Root answer" })
    const child = node({
      id: "child",
      prompt: "What does this imply?",
      promptContextBlocks: ["Selected quote"],
      sourceNodeId: "root",
    })

    const fullPrompt = composePromptWithConversationContext(
      [root, child],
      [edge("root", "child")],
      child.id,
      child.prompt ?? "",
      child.promptContextBlocks,
    )

    expect(fullPrompt).toContain("<context>")
    expect(fullPrompt).toContain("Selected quote")
    expect(fullPrompt).toContain("What does this imply?")
    expect(fullPrompt).not.toContain("[Context]")
    expect(fullPrompt).not.toContain("[/Context]")
  })
})
