import type { GenerationRequest } from "@/features/generation/types"
import type { NormalizedStreamEvent, ProviderAdapter } from "@/lib/providers/adapter-types"
import { parseSseDataLines } from "@/lib/providers/sse-parser"
import { joinProviderUrl } from "@/lib/providers/url"

const ANTHROPIC_OAUTH_CLIENT_ID = "9d1c250a-e61b-44d9-88ed-5944d1962f5e"
const ANTHROPIC_OAUTH_REFRESH_ENDPOINT = "https://console.anthropic.com/v1/oauth/token"
const ANTHROPIC_REQUIRED_BETAS = ["oauth-2025-04-20", "interleaved-thinking-2025-05-14"]
const OAUTH_REFRESH_SAFETY_MARGIN_MS = 3000

function toAnthropicMessages(request: GenerationRequest): Array<{ role: "user" | "assistant"; content: string }> {
  return request.messages
    .filter((message) => message.role !== "system")
    .map((message) => ({
      role: message.role === "assistant" ? "assistant" : "user",
      content: message.content,
    }))
}

async function refreshAnthropicOauthToken(
  auth: Extract<GenerationRequest["auth"], { type: "oauth" }>,
): Promise<string> {
  const canRefresh = typeof auth.refresh === "string" && auth.refresh.length > 0
  const expiresAt = typeof auth.expires === "number" ? auth.expires : Number.POSITIVE_INFINITY
  const shouldRefresh = canRefresh && expiresAt > 0 && expiresAt <= Date.now() + OAUTH_REFRESH_SAFETY_MARGIN_MS

  if (!shouldRefresh) {
    return auth.access
  }

  const response = await fetch(ANTHROPIC_OAUTH_REFRESH_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      grant_type: "refresh_token",
      refresh_token: auth.refresh,
      client_id: ANTHROPIC_OAUTH_CLIENT_ID,
    }),
  })

  if (!response.ok) {
    throw new Error(`Anthropic OAuth token refresh failed (${response.status})`)
  }

  const payload = (await response.json()) as {
    access_token?: string
  }

  return payload.access_token || auth.access
}

async function* streamAnthropic(request: GenerationRequest): AsyncGenerator<NormalizedStreamEvent, void, void> {
  const requestId = crypto.randomUUID()
  yield { type: "start", data: { requestId, provider: "anthropic", model: request.model, intent: request.intent } }

  const baseUrl = request.providerConfig?.apiBaseUrl ?? "https://api.anthropic.com/v1"
  const endpoint = joinProviderUrl(baseUrl, "messages")
  const systemPrompt = request.messages.find((message) => message.role === "system")?.content

  const headers = new Headers({
    "Content-Type": "application/json",
    "anthropic-version": "2023-06-01",
  })

  if (request.auth.type === "oauth") {
    let accessToken = request.auth.access
    try {
      accessToken = await refreshAnthropicOauthToken(request.auth)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Anthropic OAuth token refresh failed"
      yield { type: "error", data: { message } }
      yield { type: "done", data: { finishReason: "error" } }
      return
    }

    headers.set("authorization", `Bearer ${accessToken}`)
    headers.set("anthropic-beta", ANTHROPIC_REQUIRED_BETAS.join(","))
    headers.set("user-agent", "claude-cli/2.1.2 (external, cli)")
    if (!endpoint.searchParams.has("beta")) {
      endpoint.searchParams.set("beta", "true")
    }
  } else if (request.auth.type === "api-key") {
    headers.set("x-api-key", request.auth.credential)
  } else if (request.auth.type === "wellknown") {
    headers.set("authorization", `Bearer ${request.auth.token}`)
  } else {
    yield { type: "error", data: { message: "Unsupported auth type for Anthropic provider" } }
    yield { type: "done", data: { finishReason: "error" } }
    return
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: request.model,
      stream: true,
      messages: toAnthropicMessages(request),
      system: systemPrompt,
      max_tokens: 4096,
    }),
  })

  if (!response.ok || !response.body) {
    const message = response.body ? await response.text() : "Anthropic stream is unavailable"
    yield { type: "error", data: { message } }
    yield { type: "done", data: { finishReason: "error" } }
    return
  }

  for await (const chunk of parseSseDataLines(response.body)) {
    try {
      const parsed = JSON.parse(chunk) as {
        type?: string
        delta?: { text?: string; stop_reason?: string | null }
        usage?: { input_tokens?: number; output_tokens?: number }
      }

      if (parsed.type === "content_block_delta" && parsed.delta?.text) {
        yield { type: "delta", data: { text: parsed.delta.text } }
      }

      if (parsed.usage) {
        yield {
          type: "usage",
          data: {
            inputTokens: parsed.usage.input_tokens,
            outputTokens: parsed.usage.output_tokens,
          },
        }
      }

      if (parsed.type === "message_delta" && parsed.delta?.stop_reason) {
        yield { type: "done", data: { finishReason: parsed.delta.stop_reason } }
        return
      }
    } catch {
      continue
    }
  }

  yield { type: "done", data: { finishReason: "stop" } }
}

export const anthropicAdapter: ProviderAdapter = {
  name: "anthropic",
  capabilities: {
    supportsTools: true,
    supportsJsonMode: true,
    supportsVision: true,
  },
  stream: streamAnthropic,
}
