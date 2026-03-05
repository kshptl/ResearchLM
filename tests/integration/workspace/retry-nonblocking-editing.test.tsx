import "@/tests/helpers/mock-react-flow"
import React from "react"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import WorkspacePage from "@/app/(workspace)/page"
import { clearCredentialsForTests, saveCredential } from "@/lib/auth/credential-store"

describe("retry non-blocking editing", () => {
  beforeEach(() => {
    clearCredentialsForTests()
    saveCredential("openai", "api-key", "sk-test")
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    clearCredentialsForTests()
  })

  it("keeps side-panel prompt editing available when generation returns empty output", async () => {
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

    render(<WorkspacePage />)

    // Submit via CentralPromptBar to trigger generation
    const input = screen.getByPlaceholderText("Type a topic or question...")
    fireEvent.change(input, { target: { value: "test prompt" } })
    fireEvent.submit(input.closest("form")!)

    await waitFor(() => {
      expect(screen.getAllByRole("article").length).toBeGreaterThan(0)
    })
    expect(screen.queryByText(/Generation returned no usable content/i)).not.toBeInTheDocument()

    // Click the node to open the detail panel
    const nodeArticles = screen.getAllByRole("article")
    fireEvent.click(nodeArticles[0])

    // The side-panel prompt field should be editable by default
    const promptInput = screen.getByRole("textbox", { name: "Node prompt" })
    fireEvent.change(promptInput, { target: { value: "Editable prompt after retry failure" } })

    expect(promptInput).toHaveValue("Editable prompt after retry failure")
    expect(screen.queryByRole("button", { name: /toggle edit/i })).not.toBeInTheDocument()
    expect(screen.queryByRole("textbox", { name: "Node content" })).not.toBeInTheDocument()
  })
})
