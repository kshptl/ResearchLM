import React, { useState } from "react"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { useGeneration } from "@/features/generation/use-generation"

function GenerationHarness() {
  const [credential, setCredential] = useState("sk-old")
  const generation = useGeneration({
    provider: "openai",
    model: "gpt-4o-mini",
    credential
  })

  return (
    <div>
      <button
        type="button"
        onClick={() => {
          void generation.runIntent("prompt", "Explain this").catch(() => undefined)
        }}
      >
        Run
      </button>
      <button type="button" onClick={() => setCredential("invalid:revoked-token")}>
        Revoke
      </button>
      <button type="button" onClick={() => setCredential("sk-new")}>
        Replace
      </button>
      <p data-testid="streaming">{generation.isStreaming ? "streaming" : "idle"}</p>
      {generation.failureNotice ? <p data-testid="failure-category">{generation.failureNotice.category}</p> : null}
    </div>
  )
}

function createEmptySuccessStream() {
  return {
    ok: true,
    body: {
      getReader: () => ({
        read: vi.fn().mockResolvedValue({ done: true, value: undefined })
      })
    }
  }
}

describe("credential lifecycle generation", () => {
  it("applies replacement to new/retry requests, while in-flight requests keep original credential", async () => {
    const credentialsByDispatch: string[] = []
    let resolveFirstCall: (() => void) | undefined

    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async (_url: string, init?: RequestInit) => {
        const body = JSON.parse(String(init?.body ?? "{}")) as { auth?: { credential?: string } }
        const credential = body.auth?.credential ?? ""
        credentialsByDispatch.push(credential)

        if (credentialsByDispatch.length === 1) {
          await new Promise<void>((resolve) => {
            resolveFirstCall = resolve
          })
          return createEmptySuccessStream()
        }

        if (/invalid:|revoked:/i.test(credential)) {
          throw new Error("Credential is invalid or expired")
        }

        return createEmptySuccessStream()
      })
    )

    render(<GenerationHarness />)

    fireEvent.click(screen.getByRole("button", { name: "Run" }))
    await waitFor(() => {
      expect(screen.getByTestId("streaming")).toHaveTextContent("streaming")
      expect(credentialsByDispatch[0]).toBe("sk-old")
    })

    fireEvent.click(screen.getByRole("button", { name: "Replace" }))
    expect(credentialsByDispatch[0]).toBe("sk-old")

    resolveFirstCall?.()
    await waitFor(() => {
      expect(screen.getByTestId("streaming")).toHaveTextContent("idle")
    })

    fireEvent.click(screen.getByRole("button", { name: "Run" }))
    await waitFor(() => {
      expect(credentialsByDispatch[1]).toBe("sk-new")
    })

    fireEvent.click(screen.getByRole("button", { name: "Revoke" }))
    fireEvent.click(screen.getByRole("button", { name: "Run" }))
    await waitFor(() => {
      expect(credentialsByDispatch[2]).toBe("invalid:revoked-token")
      expect(screen.getByTestId("failure-category")).toHaveTextContent("auth")
    })

    fireEvent.click(screen.getByRole("button", { name: "Replace" }))
    fireEvent.click(screen.getByRole("button", { name: "Run" }))
    await waitFor(() => {
      expect(credentialsByDispatch[3]).toBe("sk-new")
    })
  })
})
