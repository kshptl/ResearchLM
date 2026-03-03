import React from "react"
import { fireEvent, render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it } from "vitest"
import { CanvasBoard } from "@/components/workspace/canvas/canvas-board"
import { persistenceRepository } from "@/features/persistence/repository"

describe("semantic zoom auto", () => {
  beforeEach(async () => {
    await persistenceRepository.clearStore("settings")
  })

  it("automatically reduces representation detail as zoom decreases", () => {
    render(<CanvasBoard />)

    expect(screen.getByRole("button", { name: "Zoom out" })).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Zoom out" }))
    fireEvent.click(screen.getByRole("button", { name: "Zoom out" }))
    fireEvent.click(screen.getByRole("button", { name: "Zoom out" }))
    fireEvent.click(screen.getByRole("button", { name: "Zoom out" }))

    expect(screen.getByDisplayValue("moving, san, francisco")).toBeInTheDocument()
  })
})
