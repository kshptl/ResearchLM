import "@/tests/helpers/mock-react-flow"
import React from "react"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import WorkspacePage from "@/app/(workspace)/page"
import { TooltipProvider } from "@/components/ui/tooltip"
import { clearCredentialsForTests, saveCredential } from "@/lib/auth/credential-store"

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

function selectResponseText(container: HTMLElement): void {
  const paragraph = container.querySelector("p")
  const textNode = paragraph?.firstChild
  if (!textNode || textNode.nodeType !== Node.TEXT_NODE) {
    throw new Error("Unable to locate response text node")
  }

  const text = textNode.textContent ?? ""
  const end = Math.min(8, text.length)
  const range = document.createRange()
  range.setStart(textNode, 0)
  range.setEnd(textNode, end)

  const selection = window.getSelection()
  selection?.removeAllRanges()
  selection?.addRange(range)
}

describe("response follow-up context menu", () => {
  beforeEach(() => {
    clearCredentialsForTests()
    saveCredential("openai", "api-key", "sk-test")
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    clearCredentialsForTests()
  })

  it("creates a follow-up node from selected response text and focuses prompt editing", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(createDeltaStreamResponse("Response text for selection"))
    )

    render(
      <TooltipProvider>
        <WorkspacePage />
      </TooltipProvider>
    )

    const input = screen.getByPlaceholderText("Type a topic or question...")
    fireEvent.change(input, { target: { value: "root prompt" } })
    fireEvent.submit(input.closest("form")!)

    await waitFor(() => {
      expect(screen.queryAllByText("Response text for selection").length).toBeGreaterThan(0)
    })

    const nodeArticles = screen.getAllByRole("article")
    fireEvent.click(nodeArticles[0])

    const responseMarkdown = await screen.findByTestId("node-response-markdown")
    selectResponseText(responseMarkdown)
    fireEvent.contextMenu(responseMarkdown, { clientX: 180, clientY: 220 })

    const followUpButton = await screen.findByRole("button", { name: "Follow up" })
    fireEvent.click(followUpButton)

    const promptEditor = await screen.findByLabelText("Node prompt editor")
    expect(promptEditor).toHaveFocus()
    const promptValue = (promptEditor as HTMLTextAreaElement).value
    expect(promptValue).toBe("")
    expect(promptValue).not.toContain("<context>")
    expect(promptValue).not.toContain("[Context]")
    expect(promptValue).not.toContain("[/Context]")

    const inlineContextBlocks = await screen.findByTestId("node-inline-context-blocks")
    expect(inlineContextBlocks).toHaveTextContent("Context")
    expect(inlineContextBlocks).toHaveTextContent("Response")

    fireEvent.click(screen.getByTestId("rf-canvas"))
    await waitFor(() => {
      expect(screen.queryByLabelText("Node prompt editor")).not.toBeInTheDocument()
    })
    const viewContextBlocks = await screen.findByTestId("node-view-context-blocks")
    expect(viewContextBlocks).toHaveTextContent("Context")
    expect(viewContextBlocks).toHaveTextContent("Response")

    const nodeCount = document.querySelectorAll('[data-testid^="rf-node-"]').length
    expect(nodeCount).toBeGreaterThan(1)
  })
})
