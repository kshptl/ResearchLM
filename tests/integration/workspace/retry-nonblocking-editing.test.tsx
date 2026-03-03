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

    fireEvent.click(screen.getByRole("button", { name: "Prompt" }))

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent(/Generation returned no usable content/i)
    })

    const nodeInput = screen.getAllByRole("textbox", { name: "Node content" })[0]
    fireEvent.change(nodeInput, { target: { value: "Editable after retry failure" } })

    expect(nodeInput).toHaveValue("Editable after retry failure")
  })
})
