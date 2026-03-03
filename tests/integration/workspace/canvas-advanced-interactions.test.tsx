import React from "react"
import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { HistoryPanel } from "@/components/workspace/canvas/history-panel"

describe("canvas advanced interactions", () => {
  it("renders history panel and dispatches undo/redo actions", () => {
    const undo = vi.fn()
    const redo = vi.fn()

    render(
      <HistoryPanel
        entries={[{ id: "h1", label: "Create node" }]}
        canUndo={true}
        canRedo={true}
        onUndo={undo}
        onRedo={redo}
      />
    )

    fireEvent.click(screen.getByRole("button", { name: "Undo" }))
    fireEvent.click(screen.getByRole("button", { name: "Redo" }))

    expect(undo).toHaveBeenCalledTimes(1)
    expect(redo).toHaveBeenCalledTimes(1)
    expect(screen.getByText("Create node")).toBeInTheDocument()
  })
})
