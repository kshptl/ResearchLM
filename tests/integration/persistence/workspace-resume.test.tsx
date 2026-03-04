import "@/tests/helpers/mock-react-flow"
import React from "react"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it } from "vitest"
import WorkspacePage from "@/app/(workspace)/page"
import { persistenceRepository } from "@/features/persistence/repository"

describe("workspace resume", () => {
  beforeEach(async () => {
    await persistenceRepository.clearStore("snapshots")
    await persistenceRepository.clearStore("hierarchyLinks")
    await persistenceRepository.clearStore("generatedSubtopicCandidates")
  })

  it("renders persistence status", async () => {
    const view = render(<WorkspacePage />)

    // Open settings drawer to access persistence controls
    fireEvent.click(screen.getByRole("button", { name: "Open settings" }))

    expect(screen.getByText("Local persistence ready")).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: /^Subtopic$/ }))
    fireEvent.click(screen.getByRole("button", { name: "Snapshot now" }))

    view.unmount()
    render(<WorkspacePage />)

    // Open settings drawer again after remount
    fireEvent.click(screen.getByRole("button", { name: "Open settings" }))

    await waitFor(() => {
      expect(screen.getByText("Links: 1")).toBeInTheDocument()
    })
  })
})
