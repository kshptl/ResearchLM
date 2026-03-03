import React from "react"
import { render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it } from "vitest"
import { CanvasBoard } from "@/components/workspace/canvas/canvas-board"
import { persistenceRepository } from "@/features/persistence/repository"
import { saveSemanticViewState } from "@/features/persistence/semantic-view-repository"

describe("semantic view resume", () => {
  beforeEach(async () => {
    await persistenceRepository.clearStore("settings")
  })

  it("restores semantic mode and level on reload", async () => {
    await saveSemanticViewState({
      workspaceId: "local-workspace",
      canvasId: "root",
      mode: "manual",
      manualLevel: "summary"
    })

    render(<CanvasBoard />)

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Manual" })).toHaveAttribute("aria-pressed", "true")
      expect(screen.getByRole("button", { name: "summary" })).toHaveAttribute("aria-pressed", "true")
    })
  })
})
