import React from "react"
import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import WorkspaceLayout from "@/app/(workspace)/layout"

describe("unsupported viewport guidance", () => {
  beforeEach(() => {
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: query.includes("1024px") ? false : true,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn()
    }))
  })

  it("shows guidance and disables editing interactions on unsupported viewport", () => {
    render(
      <WorkspaceLayout>
        <button type="button">Editable action</button>
      </WorkspaceLayout>
    )

    expect(screen.getByText(/Desktop editing is required/i)).toBeInTheDocument()
    expect(screen.getByRole("status")).toBeInTheDocument()
    expect(screen.getByText("Editable action").closest("div")).toHaveAttribute("aria-disabled", "true")
  })
})
