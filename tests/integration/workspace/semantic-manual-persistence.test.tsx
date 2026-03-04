import "@/tests/helpers/mock-react-flow"
import React from "react"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { CanvasBoard } from "@/components/workspace/canvas/canvas-board"
import { persistenceRepository } from "@/features/persistence/repository"
import { loadSemanticViewState } from "@/features/persistence/semantic-view-repository"

describe("semantic manual persistence", () => {
  beforeEach(async () => {
    await persistenceRepository.clearStore("settings")
    // Mock fetch for generation triggered by CentralPromptBar submit
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        body: {
          getReader: () => ({
            read: vi.fn().mockResolvedValue({ done: true, value: undefined })
          })
        }
      })
    )
  })

  it("persists manual selection after user picks semantic level", async () => {
    render(<CanvasBoard />)

    // Submit a prompt via CentralPromptBar to create a node so toolbar appears
    const input = screen.getByPlaceholderText("Type a topic or question...")
    fireEvent.change(input, { target: { value: "test" } })
    fireEvent.submit(input.closest("form")!)

    // Wait for the toolbar to appear with semantic controls
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Manual" })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole("button", { name: "Manual" }))
    fireEvent.click(screen.getByRole("button", { name: "keywords" }))

    await waitFor(async () => {
      const saved = await loadSemanticViewState("local-workspace", "root")
      expect(saved?.mode).toBe("manual")
      expect(saved?.manualLevel).toBe("keywords")
    })
  })
})
