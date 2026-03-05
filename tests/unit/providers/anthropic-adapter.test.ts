import { beforeEach, describe, expect, it, vi } from "vitest"
import type { GenerationRequest } from "@/features/generation/types"
import { anthropicAdapter } from "@/lib/providers/anthropic/adapter"

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
    provider: "anthropic",
    model: "claude-sonnet-4-5",
    intent: "prompt",
    messages: [{ role: "user", content: "Say hello" }],
    auth: { type: "api-key", credential: "sk-ant-test" },
    providerConfig: {
      apiBaseUrl: "https://api.anthropic.com/v1",
    },
    ...overrides,
  }
}

describe("anthropic adapter", () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
  })

  it("refreshes expired OAuth tokens and sends required OAuth beta headers", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            access_token: "refreshed-anthropic-access",
            refresh_token: "refreshed-anthropic-refresh",
            expires_in: 3600,
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        createSseResponse([
          JSON.stringify({ type: "content_block_delta", delta: { text: "Hello" } }),
          JSON.stringify({ type: "message_delta", delta: { stop_reason: "end_turn" } }),
        ]),
      )
    vi.stubGlobal("fetch", fetchMock)

    const events: Array<{ type: string; data: Record<string, unknown> }> = []
    for await (const event of anthropicAdapter.stream(
      createRequest({
        auth: {
          type: "oauth",
          access: "expired-access",
          refresh: "refresh-token",
          expires: Date.now() - 60_000,
        },
      }),
    )) {
      events.push(event)
    }

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe("https://console.anthropic.com/v1/oauth/token")
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain("https://api.anthropic.com/v1/messages?beta=true")

    const headers = new Headers((fetchMock.mock.calls[1]?.[1] as RequestInit | undefined)?.headers)
    expect(headers.get("authorization")).toBe("Bearer refreshed-anthropic-access")
    expect(headers.get("anthropic-beta")).toContain("oauth-2025-04-20")
    expect(headers.get("anthropic-beta")).toContain("interleaved-thinking-2025-05-14")
    expect(headers.get("user-agent")).toBe("claude-cli/2.1.2 (external, cli)")

    const text = events.filter((event) => event.type === "delta").map((event) => String(event.data.text ?? "")).join("")
    expect(text).toBe("Hello")
    expect(events.some((event) => event.type === "done")).toBe(true)
  })
})
