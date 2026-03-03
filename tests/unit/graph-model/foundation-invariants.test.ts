import { describe, expect, it } from "vitest"
import { MIN_HISTORY_DEPTH, createHistoryState, pushHistoryCommand } from "@/features/graph-model/history-engine"
import { createNode, createEdge, validateExtractionSpan } from "@/features/graph-model/mutations"
import { clampPaneWidth, createWorkspaceStoreState, updatePaneLayout } from "@/features/graph-model/workspace-store"

describe("workspace foundation invariants", () => {
  it("clamps pane widths within configured bounds", () => {
    expect(clampPaneWidth(100)).toBe(240)
    expect(clampPaneWidth(280)).toBe(280)
    expect(clampPaneWidth(700)).toBe(480)
  })

  it("updates pane layout using clamped values", () => {
    const state = createWorkspaceStoreState({
      id: "w1",
      title: "Workspace",
      rootCanvasId: "c1",
      activeCanvasId: "c1",
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })

    const updated = updatePaneLayout(state.persisted.paneLayout, {
      leftPaneWidthPx: 100,
      rightPaneWidthPx: 900
    })

    expect(updated.leftPaneWidthPx).toBe(240)
    expect(updated.rightPaneWidthPx).toBe(480)
  })

  it("keeps history depth at or below configured minimum depth limit", () => {
    let history = createHistoryState()

    for (let i = 0; i < MIN_HISTORY_DEPTH + 25; i += 1) {
      history = pushHistoryCommand(history, {
        id: `cmd-${i}`,
        label: `Command ${i}`,
        run: () => undefined,
        undo: () => undefined
      })
    }

    expect(history.undoStack).toHaveLength(MIN_HISTORY_DEPTH)
  })

  it("rejects self-referential edges", () => {
    expect(() =>
      createEdge({
        workspaceId: "w1",
        canvasId: "c1",
        fromNodeId: "n1",
        toNodeId: "n1"
      })
    ).toThrow(/self-referential/i)
  })

  it("enforces extraction span bounds", () => {
    expect(() => validateExtractionSpan("a")).toThrow(/at least/i)
    expect(() => validateExtractionSpan("a".repeat(5001))).toThrow(/not exceed/i)
    expect(() => validateExtractionSpan("valid span")).not.toThrow()
  })

  it("creates typed nodes for supported node types", () => {
    const node = createNode({
      workspaceId: "w1",
      canvasId: "c1",
      type: "topic",
      content: "Root topic",
      x: 10,
      y: 20
    })

    expect(node.type).toBe("topic")
    expect(node.position).toEqual({ x: 10, y: 20 })
  })
})
