import { beforeEach, describe, expect, it, vi } from "vitest"
import type { GenerationRequest } from "@/features/generation/types"
import { openAiAdapter } from "@/lib/providers/openai/adapter"

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

function createJwt(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" }), "utf8").toString("base64url")
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url")
  return `${header}.${body}.sig`
}

function createRequest(overrides?: Partial<GenerationRequest>): GenerationRequest {
  return {
    provider: "openai",
    model: "gpt-5.2",
    intent: "prompt",
    messages: [{ role: "user", content: "Say hello" }],
    auth: { type: "api-key", credential: "sk-test" },
    ...overrides,
  }
}

describe("openai adapter", () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
  })

  it("uses Codex responses endpoint for OpenAI OAuth credentials", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      createSseResponse([
        JSON.stringify({ type: "response.output_text.delta", delta: "Hello" }),
        JSON.stringify({ type: "response.output_text.delta", delta: " world" }),
        JSON.stringify({ type: "response.completed", response: { usage: { input_tokens: 1, output_tokens: 2 } } }),
      ]),
    )
    vi.stubGlobal("fetch", fetchMock)

    const events: Array<{ type: string; data: Record<string, unknown> }> = []
    for await (const event of openAiAdapter.stream(
      createRequest({
        auth: {
          type: "oauth",
          access: "oauth-access-token",
          refresh: "oauth-refresh-token",
          expires: Date.now() + 60_000,
          accountId: "acct_123",
        },
      }),
    )) {
      events.push(event)
    }

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe("https://chatgpt.com/backend-api/codex/responses")
    const oauthBody = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body ?? "{}")) as {
      instructions?: string
      store?: boolean
      stream?: boolean
      model?: string
    }
    expect(typeof oauthBody.instructions).toBe("string")
    expect(oauthBody.instructions?.length).toBeGreaterThan(0)
    expect(oauthBody.store).toBe(false)
    expect(oauthBody.model).toBe("gpt-5.2")
    expect(oauthBody.stream).toBe(true)

    const deltas = events.filter((event) => event.type === "delta").map((event) => String(event.data.text ?? ""))
    expect(deltas.join("")).toBe("Hello world")
    expect(events.some((event) => event.type === "done")).toBe(true)
  })

  it("normalizes OpenAI missing-scope errors for API key auth", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          error: {
            message:
              "You have insufficient permissions for this operation. Missing scopes: model.request. Check your role.",
          },
        }),
        { status: 403 },
      ),
    )
    vi.stubGlobal("fetch", fetchMock)

    const events: Array<{ type: string; data: Record<string, unknown> }> = []
    for await (const event of openAiAdapter.stream(createRequest())) {
      events.push(event)
    }

    const errorEvent = events.find((event) => event.type === "error")
    expect(errorEvent).toBeDefined()
    expect(String(errorEvent?.data.message ?? "")).toContain("missing `model.request` scope")
  })

  it("refreshes expired OpenAI OAuth tokens before Codex requests", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            access_token: "refreshed-access-token",
            refresh_token: "refreshed-refresh-token",
            expires_in: 3600,
            id_token: createJwt({
              organizations: [{ id: "org_abc123" }],
            }),
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        createSseResponse([JSON.stringify({ type: "response.completed" })]),
      )
    vi.stubGlobal("fetch", fetchMock)

    for await (const _event of openAiAdapter.stream(
      createRequest({
        auth: {
          type: "oauth",
          access: "expired-access-token",
          refresh: "refresh-token",
          expires: Date.now() - 60_000,
        },
      }),
    )) {
      // consume stream
    }

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe("https://auth.openai.com/oauth/token")
    expect(String(fetchMock.mock.calls[1]?.[0])).toBe("https://chatgpt.com/backend-api/codex/responses")

    const requestHeaders = new Headers((fetchMock.mock.calls[1]?.[1] as RequestInit | undefined)?.headers)
    expect(requestHeaders.get("authorization")).toBe("Bearer refreshed-access-token")
    expect(requestHeaders.get("chatgpt-account-id")).toBe("org_abc123")
  })

  it("surfaces OAuth endpoint detail errors when present", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          detail: "Instructions are required",
        }),
        { status: 400 },
      ),
    )
    vi.stubGlobal("fetch", fetchMock)

    const events: Array<{ type: string; data: Record<string, unknown> }> = []
    for await (const event of openAiAdapter.stream(
      createRequest({
        auth: {
          type: "oauth",
          access: "oauth-access-token",
          refresh: "oauth-refresh-token",
          expires: Date.now() + 60_000,
        },
      }),
    )) {
      events.push(event)
    }

    const errorEvent = events.find((event) => event.type === "error")
    expect(errorEvent).toBeDefined()
    expect(String(errorEvent?.data.message ?? "")).toContain("Instructions are required")
  })
})
