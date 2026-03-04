import "@/tests/helpers/mock-react-flow"
import React from "react"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { CanvasBoard } from "@/components/workspace/canvas/canvas-board"
import { persistenceRepository } from "@/features/persistence/repository"
import { saveSemanticViewState } from "@/features/persistence/semantic-view-repository"

describe("semantic view resume", () => {
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

  it("restores semantic mode and level on reload", async () => {
    await saveSemanticViewState({
      workspaceId: "local-workspace",
      canvasId: "root",
      mode: "manual",
      manualLevel: "summary"
    })

    render(<CanvasBoard />)

    // Submit a prompt via CentralPromptBar to create a node so toolbar appears
    const input = screen.getByPlaceholderText("Type a topic or question...")
    fireEvent.change(input, { target: { value: "test" } })
    fireEvent.submit(input.closest("form")!)

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Manual" })).toHaveAttribute("aria-pressed", "true")
      expect(screen.getByRole("button", { name: "summary" })).toHaveAttribute("aria-pressed", "true")
    })
  })
})
