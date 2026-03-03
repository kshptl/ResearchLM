import React from "react"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it } from "vitest"
import WorkspacePage from "@/app/(workspace)/page"
import { persistenceRepository } from "@/features/persistence/repository"

describe("workspace backup restore", () => {
  beforeEach(async () => {
    await persistenceRepository.clearStore("snapshots")
    localStorage.removeItem("sensecape:last-backup")
  })

  it("restores exported hierarchy state via backup import", async () => {
    render(<WorkspacePage />)

    fireEvent.click(screen.getByRole("button", { name: /^Subtopic$/ }))
    fireEvent.click(screen.getByRole("button", { name: "Export backup" }))

    fireEvent.click(screen.getByRole("button", { name: /^Broad topic$/ }))
    expect(screen.getByRole("button", { name: /Broad Topic/ })).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Import backup" }))

    await waitFor(() => {
      expect(screen.queryByRole("button", { name: /Broad Topic/ })).not.toBeInTheDocument()
      expect(screen.getByText("Links: 1")).toBeInTheDocument()
    })
  })
})
