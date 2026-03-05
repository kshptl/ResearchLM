import "@/tests/helpers/mock-react-flow"
import React from "react"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import WorkspacePage from "@/app/(workspace)/page"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/sonner"

function renderWorkspaceWithToaster(): void {
  render(
    <ThemeProvider>
      <WorkspacePage />
      <Toaster />
    </ThemeProvider>,
  )
}

describe("auth failure routing", () => {
  it("routes auth failures to update-credentials action guidance", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("Credential token missing or invalid"))
    )

    renderWorkspaceWithToaster()

    // Submit via CentralPromptBar to trigger generation
    const input = screen.getByPlaceholderText("Type a topic or question...")
    fireEvent.change(input, { target: { value: "test prompt" } })
    fireEvent.submit(input.closest("form")!)

    await waitFor(() => {
      const text = document.body.textContent ?? ""
      expect(text).toMatch(/auth:/i)
      expect(text).toMatch(/update-credentials/i)
      expect(text).toMatch(/change-action/i)
    })
  })

  it("routes permission failures to update-credentials action guidance", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("Access forbidden: not allowed for this model"))
    )

    renderWorkspaceWithToaster()

    // Submit via CentralPromptBar to trigger generation
    const input = screen.getByPlaceholderText("Type a topic or question...")
    fireEvent.change(input, { target: { value: "test prompt" } })
    fireEvent.submit(input.closest("form")!)

    await waitFor(() => {
      const text = document.body.textContent ?? ""
      expect(text).toMatch(/permission:/i)
      expect(text).toMatch(/update-credentials/i)
      expect(text).toMatch(/change-action/i)
    })
  })
})
