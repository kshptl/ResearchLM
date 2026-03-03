import React from "react"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it } from "vitest"
import WorkspacePage from "@/app/(workspace)/page"
import { persistenceRepository } from "@/features/persistence/repository"

describe("cross-tab conflict notice", () => {
  beforeEach(async () => {
    await persistenceRepository.clearStore("conflictEvents")
  })

  it("renders actionable non-blocking conflict notification", async () => {
    render(<WorkspacePage />)

    fireEvent.click(screen.getByRole("button", { name: "Simulate conflict" }))

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent(/Conflict detected for/i)
    })
    expect(screen.getByRole("status")).toHaveTextContent(/workspace stays editable/i)
    expect(screen.getByRole("button", { name: "Retry sync" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Open recovery options" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Dismiss notice" })).toBeInTheDocument()
  })
})
