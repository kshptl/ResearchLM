import React from "react"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import WorkspacePage from "@/app/(workspace)/page"

describe("auth failure routing", () => {
  it("routes auth failures to update-credentials action guidance", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("Credential token missing or invalid"))
    )

    render(<WorkspacePage />)
    fireEvent.click(screen.getByRole("button", { name: "Prompt" }))

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent(/^auth:/i)
      expect(screen.getByRole("status")).toHaveTextContent(/update-credentials/i)
      expect(screen.getByRole("status")).toHaveTextContent(/change-action/i)
    })
  })

  it("routes permission failures to update-credentials action guidance", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("Access forbidden: not allowed for this model"))
    )

    render(<WorkspacePage />)
    fireEvent.click(screen.getByRole("button", { name: "Prompt" }))

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent(/^permission:/i)
      expect(screen.getByRole("status")).toHaveTextContent(/update-credentials/i)
      expect(screen.getByRole("status")).toHaveTextContent(/change-action/i)
    })
  })
})
