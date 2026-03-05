import "@/tests/helpers/mock-react-flow"
import React from "react"
import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import WorkspacePage from "@/app/(workspace)/page"

describe("workspace UI contract", () => {
  it("renders required pane landmarks and control groups", () => {
    render(<WorkspacePage />)

    expect(screen.getByRole("button", { name: "Open settings" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "New Chat" })).toBeInTheDocument()
    expect(screen.getByPlaceholderText("Type a topic or question...")).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Open settings" }))

    expect(screen.getByText("Settings")).toBeInTheDocument()
    expect(screen.queryByText("Hierarchy")).not.toBeInTheDocument()
    expect(screen.queryByText("Generated subtopics")).not.toBeInTheDocument()
    expect(screen.getByText("Default Model")).toBeInTheDocument()
  })

  it("removes manual persistence action controls", () => {
    render(<WorkspacePage />)

    fireEvent.click(screen.getByRole("button", { name: "Open settings" }))

    expect(screen.queryByRole("button", { name: "Snapshot now" })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Export backup" })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Import backup" })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Simulate conflict" })).not.toBeInTheDocument()
  })
})
