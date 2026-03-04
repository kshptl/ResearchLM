import "@/tests/helpers/mock-react-flow"
import React from "react"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it } from "vitest"
import WorkspacePage from "@/app/(workspace)/page"
import { persistenceRepository } from "@/features/persistence/repository"

describe("subtopic candidate lifecycle persistence", () => {
  beforeEach(async () => {
    await persistenceRepository.clearStore("generatedSubtopicCandidates")
  })

  it("persists dismissed lifecycle across reload", async () => {
    const view = render(<WorkspacePage />)

    // Open settings drawer to access hierarchy controls
    fireEvent.click(screen.getByRole("button", { name: "Open settings" }))

    fireEvent.click(screen.getByRole("button", { name: "Sibling" }))
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Dismiss" })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }))
    expect(screen.getByText("dismissed")).toBeInTheDocument()

    view.unmount()
    render(<WorkspacePage />)

    // Open settings drawer again after remount
    fireEvent.click(screen.getByRole("button", { name: "Open settings" }))

    await waitFor(() => {
      expect(screen.getByText("dismissed")).toBeInTheDocument()
    })
  })
})
