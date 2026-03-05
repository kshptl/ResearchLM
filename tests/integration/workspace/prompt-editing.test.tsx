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

describe("workspace prompt editing", () => {
  beforeEach(() => {
    clearCredentialsForTests()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    clearCredentialsForTests()
  })

  it("supports double-click prompt edit with enter submit and shift+enter newline behavior", async () => {
    const streamResponses = ["original answer", "updated answer"]

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

    const input = screen.getByPlaceholderText("Type a topic or question...")
    fireEvent.change(input, { target: { value: "original prompt" } })
    fireEvent.submit(input.closest("form")!)

    await waitFor(() => {
      expect(screen.queryAllByText("original answer").length).toBeGreaterThan(0)
    })

    const promptArea = screen.getByRole("button", { name: /original prompt/i })
    fireEvent.doubleClick(promptArea)

    const editor = await screen.findByLabelText("Node prompt editor")
    expect(editor).toHaveValue("original prompt")

    fireEvent.click(screen.getByTestId("rf-canvas"))
    await waitFor(() => {
      expect(screen.queryByLabelText("Node prompt editor")).not.toBeInTheDocument()
    })

    const promptAreaAfterClose = screen.getByRole("button", { name: /original prompt/i })
    fireEvent.doubleClick(promptAreaAfterClose)
    const reopenedEditor = await screen.findByLabelText("Node prompt editor")
    expect(reopenedEditor).toHaveValue("original prompt")

    const firstStreamCallCount = fetchMock.mock.calls.filter(([url]) => url === "/api/llm/stream").length
    fireEvent.keyDown(reopenedEditor, { key: "Enter", code: "Enter", shiftKey: true })
    const afterShiftEnterCount = fetchMock.mock.calls.filter(([url]) => url === "/api/llm/stream").length
    expect(afterShiftEnterCount).toBe(firstStreamCallCount)

    fireEvent.change(reopenedEditor, { target: { value: "edited prompt line 1\nedited prompt line 2" } })
    fireEvent.keyDown(reopenedEditor, { key: "Enter", code: "Enter" })

    await waitFor(() => {
      expect(screen.queryAllByText("updated answer").length).toBeGreaterThan(0)
    })

    const streamCalls = fetchMock.mock.calls.filter(([url]) => url === "/api/llm/stream")
    expect(streamCalls).toHaveLength(2)

    const secondBody = JSON.parse(String((streamCalls[1]?.[1] as RequestInit).body)) as {
      messages?: Array<{ content?: string }>
    }
    expect(secondBody.messages?.[0]?.content).toBe("edited prompt line 1\nedited prompt line 2")
  })
})
