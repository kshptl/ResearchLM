import { beforeEach, describe, expect, it, vi } from "vitest"
import type { GenerationRequest } from "@/features/generation/types"
import { githubCopilotAdapter } from "@/lib/providers/github-copilot/adapter"

function createSseResponse(events: string[]): Response {
  const encoder = new TextEncoder()
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const event of events) {
        controller.enqueue(encoder.encode(`data: ${event}\n\n`))
      }
      controller.close()
    },
  })
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
    },
  })
}

function createRequest(overrides?: Partial<GenerationRequest>): GenerationRequest {
  return {
    provider: "github",
    model: "gpt-4.1",
    intent: "prompt",
    messages: [{ role: "user", content: "Say hello" }],
    auth: { type: "oauth", access: "access-token", refresh: "refresh-token", expires: 0 },
    providerConfig: {
      apiBaseUrl: "https://api.githubcopilot.com",
    },
    ...overrides,
  }
}

describe("github copilot adapter", () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
  })

  it("uses enterprise base URL and refresh token for OAuth requests", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      createSseResponse([
        JSON.stringify({ choices: [{ delta: { content: "Hello" }, finish_reason: "stop" }] }),
      ]),
    )
    vi.stubGlobal("fetch", fetchMock)

    const events: Array<{ type: string; data: Record<string, unknown> }> = []
    for await (const event of githubCopilotAdapter.stream(
      createRequest({
        auth: {
          type: "oauth",
          access: "access-token",
          refresh: "refresh-token",
          expires: 0,
          enterpriseUrl: "company.ghe.com",
        },
      }),
    )) {
      events.push(event)
    }

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe("https://copilot-api.company.ghe.com/chat/completions")
    const headers = new Headers((fetchMock.mock.calls[0]?.[1] as RequestInit | undefined)?.headers)
    expect(headers.get("authorization")).toBe("Bearer refresh-token")
    expect(headers.get("x-initiator")).toBe("user")

    const text = events.filter((event) => event.type === "delta").map((event) => String(event.data.text ?? "")).join("")
    expect(text).toBe("Hello")
  })

  it("marks assistant-initiated requests with agent initiator header", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      createSseResponse([JSON.stringify({ choices: [{ finish_reason: "stop" }] })]),
    )
    vi.stubGlobal("fetch", fetchMock)

    for await (const _event of githubCopilotAdapter.stream(
      createRequest({
        messages: [
          { role: "user", content: "hello" },
          { role: "assistant", content: "world" },
        ],
      }),
    )) {
      // consume stream
    }

    const headers = new Headers((fetchMock.mock.calls[0]?.[1] as RequestInit | undefined)?.headers)
    expect(headers.get("x-initiator")).toBe("agent")
  })
})
