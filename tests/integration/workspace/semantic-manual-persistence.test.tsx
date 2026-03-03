import React from "react"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it } from "vitest"
import { CanvasBoard } from "@/components/workspace/canvas/canvas-board"
import { persistenceRepository } from "@/features/persistence/repository"
import { loadSemanticViewState } from "@/features/persistence/semantic-view-repository"

describe("semantic manual persistence", () => {
  beforeEach(async () => {
    await persistenceRepository.clearStore("settings")
  })

  it("persists manual selection after user picks semantic level", async () => {
    render(<CanvasBoard />)

    fireEvent.click(screen.getByRole("button", { name: "Manual" }))
    fireEvent.click(screen.getByRole("button", { name: "keywords" }))

    await waitFor(async () => {
      const saved = await loadSemanticViewState("local-workspace", "root")
      expect(saved?.mode).toBe("manual")
      expect(saved?.manualLevel).toBe("keywords")
    })
  })
})
