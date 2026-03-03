import { describe, expect, it, vi } from "vitest"
import { createHistoryState, pushHistoryCommand, redo, undo } from "@/features/graph-model/history-engine"

describe("history engine", () => {
  it("supports undo and redo cursor stepping", () => {
    const run = vi.fn()
    const unrun = vi.fn()

    let state = createHistoryState()
    state = pushHistoryCommand(state, { id: "1", label: "one", run, undo: unrun })
    state = undo(state)
    expect(unrun).toHaveBeenCalledTimes(1)

    state = redo(state)
    expect(run).toHaveBeenCalledTimes(1)
  })
})
