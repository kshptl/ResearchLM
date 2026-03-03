import React from "react"
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import WorkspacePage from "@/app/(workspace)/page"

describe("workspace UI contract", () => {
  it("renders required pane landmarks and control groups", () => {
    render(<WorkspacePage />)

    expect(screen.getByText("Sensecape Exploration Workspace")).toBeInTheDocument()
    expect(screen.getByText("Hierarchy")).toBeInTheDocument()
    expect(screen.getByText("Generated subtopics")).toBeInTheDocument()
    expect(screen.getByText("Provider Credentials (BYOK)")).toBeInTheDocument()
  })

  it("exposes required persistence and generation controls", () => {
    render(<WorkspacePage />)

    expect(screen.getByRole("button", { name: "Prompt" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Snapshot now" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Export backup" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Import backup" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Simulate conflict" })).toBeInTheDocument()
  })
})
