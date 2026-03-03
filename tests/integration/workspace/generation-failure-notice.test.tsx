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
    fireEvent.click(screen.getByRole("button", { name: "Prompt" }))

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent(/quality:/i)
      expect(screen.getByRole("status")).toHaveTextContent(/Generation returned no usable content/i)
      expect(screen.getByRole("status")).toHaveTextContent(/Actions: retry \/ change-action \/ dismiss/i)
    })
  })
})
