import "@/tests/helpers/mock-react-flow"
import React from "react"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import WorkspacePage from "@/app/(workspace)/page"
import { clearCredentialsForTests } from "@/lib/auth/credential-store"

function createDeltaStreamResponse(text: string): { ok: boolean; body: { getReader: () => { read: () => Promise<{ done: boolean; value?: Uint8Array }> } } } {
  const encoder = new TextEncoder()
  const payload = encoder.encode(`event: delta\ndata: ${JSON.stringify({ text })}\n\n`)

  return {
    ok: true,
    body: {
      getReader: () => {
        let sent = false
        return {
          read: async () => {
            if (sent) {
              return { done: true, value: undefined }
            }
            sent = true
            return { done: false, value: payload }
          },
        }
      },
    },
  }
}

function findNodeContainerWithText(text: string): HTMLElement {
  const node = Array.from(document.querySelectorAll<HTMLElement>('[data-testid^="rf-node-"]')).find((candidate) =>
    candidate.textContent?.includes(text)
  )
  if (!node) {
    throw new Error(`Node container with text "${text}" not found`)
  }
  return node
}

describe("workspace regenerate context", () => {
  beforeEach(() => {
    clearCredentialsForTests()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    clearCredentialsForTests()
  })

  it("keeps parent context for child regenerate after parent is regenerated", async () => {
    const streamResponses = [
      "parent response v1",
      "1. child follow-up",
      "child response v1",
      "parent response v2",
      "child response v2",
    ]

    const fetchMock = vi.fn().mockImplementation(async (input: string | URL) => {
      if (input === "/api/llm/stream") {
        const next = streamResponses.shift()
        if (!next) {
          throw new Error("Unexpected /api/llm/stream call")
        }
        return createDeltaStreamResponse(next)
      }
      throw new Error(`Unexpected fetch call: ${String(input)}`)
    })

    vi.stubGlobal("fetch", fetchMock)
    render(<WorkspacePage />)

    const initialInput = screen.getByPlaceholderText("Type a topic or question...")
    fireEvent.change(initialInput, { target: { value: "parent prompt" } })
    fireEvent.submit(initialInput.closest("form")!)

    await waitFor(() => {
      expect(screen.queryAllByText("parent response v1").length).toBeGreaterThan(0)
    })

    const parentNode = findNodeContainerWithText("parent prompt")
    fireEvent.click(parentNode)

    const questionsButton = await screen.findByRole("button", { name: "Questions" })
    fireEvent.click(questionsButton)

    await waitFor(() => {
      expect(screen.queryAllByText("child follow-up").length).toBeGreaterThan(0)
      expect(screen.queryAllByText("child response v1").length).toBeGreaterThan(0)
    })

    fireEvent.click(screen.getByRole("button", { name: "Regenerate" }))

    await waitFor(() => {
      expect(screen.queryAllByText("parent response v2").length).toBeGreaterThan(0)
    })

    const childNode = findNodeContainerWithText("child follow-up")
    fireEvent.click(childNode)
    fireEvent.click(await screen.findByRole("button", { name: "Regenerate" }))

    await waitFor(() => {
      expect(screen.queryAllByText("child response v2").length).toBeGreaterThan(0)
    })

    const streamCalls = fetchMock.mock.calls.filter(([url]) => url === "/api/llm/stream")
    expect(streamCalls).toHaveLength(5)

    const childRegenerateBody = JSON.parse(String((streamCalls[4]?.[1] as RequestInit).body)) as {
      messages?: Array<{ content?: string }>
    }
    const composedPrompt = childRegenerateBody.messages?.[0]?.content ?? ""

    expect(composedPrompt).toContain("User: parent prompt")
    expect(composedPrompt).toContain("Assistant: parent response v2")
    expect(composedPrompt).toContain("User: child follow-up")
    expect(composedPrompt).not.toContain("Assistant: parent response v1")
  })
})
