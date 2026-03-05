import "@/tests/helpers/mock-react-flow"
import React from "react"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import WorkspacePage from "@/app/(workspace)/page"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { clearCredentialsForTests, saveCredential } from "@/lib/auth/credential-store"

describe("generation failure notice", () => {
  beforeEach(() => {
    clearCredentialsForTests()
    saveCredential("openai", "api-key", "sk-test")
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    clearCredentialsForTests()
  })

  it("does not emit quality failure notices for empty model output", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      body: {
        getReader: () => ({
          read: vi.fn().mockResolvedValue({ done: true, value: undefined })
        })
      }
    })
    vi.stubGlobal(
      "fetch",
      fetchMock
    )

    render(
      <TooltipProvider>
        <WorkspacePage />
        <Toaster />
      </TooltipProvider>
    )

    // Submit via CentralPromptBar to trigger generation
    const input = screen.getByPlaceholderText("Type a topic or question...")
    fireEvent.change(input, { target: { value: "test prompt" } })
    fireEvent.submit(input.closest("form")!)

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/llm/stream",
        expect.objectContaining({ method: "POST" })
      )
    })

    expect(screen.queryByText(/Generation returned no usable content/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/quality:/i)).not.toBeInTheDocument()
  })
})
