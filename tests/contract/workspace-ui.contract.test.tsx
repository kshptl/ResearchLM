import "@/tests/helpers/mock-react-flow"
import React from "react"
import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import WorkspacePage from "@/app/(workspace)/page"

describe("workspace UI contract", () => {
  it("renders required pane landmarks and control groups", () => {
    render(<WorkspacePage />)

    // Open settings drawer to access hierarchy and credentials
    fireEvent.click(screen.getByRole("button", { name: "Open settings" }))

    expect(screen.getByText("Sensecape Exploration Workspace")).toBeInTheDocument()
    expect(screen.getAllByText("Hierarchy").length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText("Generated subtopics")).toBeInTheDocument()
    expect(screen.getByText("Provider Credentials (BYOK)")).toBeInTheDocument()
  })

  it("exposes required persistence and generation controls", () => {
    render(<WorkspacePage />)

    // Canvas starts with CentralPromptBar instead of a Prompt button
    expect(screen.getByPlaceholderText("Type a topic or question...")).toBeInTheDocument()

    // Open settings drawer to access persistence controls
    fireEvent.click(screen.getByRole("button", { name: "Open settings" }))

    expect(screen.getByRole("button", { name: "Snapshot now" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Export backup" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Import backup" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Simulate conflict" })).toBeInTheDocument()
  })
})
