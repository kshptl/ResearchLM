import "@/tests/helpers/mock-react-flow"
import React from "react"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import WorkspacePage from "@/app/(workspace)/page"

describe("generation failure notice", () => {
  it("renders non-blocking failure notice fields and actions", async () => {
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
      expect(screen.getByRole("status")).toHaveTextContent(/quality:/i)
      expect(screen.getByRole("status")).toHaveTextContent(/Generation returned no usable content/i)
      expect(screen.getByRole("status")).toHaveTextContent(/Actions: retry \/ change-action \/ dismiss/i)
    })
  })
})
