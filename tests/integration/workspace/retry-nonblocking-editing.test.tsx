import "@/tests/helpers/mock-react-flow"
import React from "react"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import WorkspacePage from "@/app/(workspace)/page"

describe("retry non-blocking editing", () => {
  it("keeps node editing available when generation returns retry guidance", async () => {
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
      expect(screen.getByRole("status")).toHaveTextContent(/Generation returned no usable content/i)
    })

    // Click the node to open the detail panel
    const nodeArticles = screen.getAllByRole("article")
    fireEvent.click(nodeArticles[0])

    // The detail panel textarea should be editable
    const nodeInput = screen.getByRole("textbox", { name: "Node content" })
    fireEvent.change(nodeInput, { target: { value: "Editable after retry failure" } })

    expect(nodeInput).toHaveValue("Editable after retry failure")
  })
})
