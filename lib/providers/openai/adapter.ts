import type { GenerationRequest } from "@/features/generation/types"
import type { NormalizedStreamEvent, ProviderAdapter } from "@/lib/providers/adapter-types"
import { extractApiKeyFromAuth } from "@/lib/providers/auth"
import { parseSseDataLines } from "@/lib/providers/sse-parser"
import { joinProviderUrl } from "@/lib/providers/url"

const OPENAI_CODEX_RESPONSES_ENDPOINT = "https://chatgpt.com/backend-api/codex/responses"
const OPENAI_ISSUER = "https://auth.openai.com"
const OPENAI_CLIENT_ID = "app_EMoamEEZ73f0CkXaXp7hrann"
const OAUTH_REFRESH_SAFETY_MARGIN_MS = 3000

function toOpenAiMessages(request: GenerationRequest): Array<{ role: string; content: string }> {
  return request.messages.map((message) => ({
    role: message.role === "tool" ? "user" : message.role,
    content: message.content,
  }))
}

function toOpenAiResponsesInput(request: GenerationRequest): Array<{ role: string; content: string }> {
  return request.messages.map((message) => ({
    role: message.role === "tool" ? "user" : message.role,
    content: message.content,
  }))
}

function toOauthInstructions(request: GenerationRequest): string {
  const explicitSystemInstructions = request.messages
    .filter((message) => message.role === "system")
    .map((message) => message.content.trim())
    .filter((value) => value.length > 0)
    .join("\n\n")

  if (explicitSystemInstructions) {
    return explicitSystemInstructions
  }

  return "You are a helpful research assistant. Provide direct, accurate responses."
}

function parseJwtClaims(token: string): Record<string, unknown> | undefined {
  const parts = token.split(".")
  if (parts.length < 2) {
    return undefined
  }

  try {
    return JSON.parse(Buffer.from(parts[1]!, "base64url").toString("utf8")) as Record<string, unknown>
  } catch {
    return undefined
  }
}

function parseOpenAiAccountId(tokens: { id_token?: string; access_token?: string }): string | undefined {
  const claims = parseJwtClaims(tokens.id_token ?? tokens.access_token ?? "")
  if (!claims) {
    return undefined
  }

  const authClaims = claims["https://api.openai.com/auth"]
  if (authClaims && typeof authClaims === "object" && !Array.isArray(authClaims)) {
    const accountId = (authClaims as Record<string, unknown>).chatgpt_account_id
    if (typeof accountId === "string" && accountId.length > 0) {
      return accountId
    }
  }

  if (typeof claims.chatgpt_account_id === "string" && claims.chatgpt_account_id.length > 0) {
    return claims.chatgpt_account_id
  }

  const organizations = claims.organizations
  if (Array.isArray(organizations)) {
    const first = organizations[0]
    if (first && typeof first === "object" && !Array.isArray(first)) {
      const orgId = (first as Record<string, unknown>).id
      if (typeof orgId === "string" && orgId.length > 0) {
        return orgId
      }
    }
  }

  return undefined
}

async function refreshOpenAiOauthToken(
  auth: Extract<GenerationRequest["auth"], { type: "oauth" }>,
): Promise<{ accessToken: string; accountId?: string }> {
  const canRefresh = typeof auth.refresh === "string" && auth.refresh.length > 0
  const expiresAt = typeof auth.expires === "number" ? auth.expires : Number.POSITIVE_INFINITY
  const shouldRefresh = canRefresh && expiresAt > 0 && expiresAt <= Date.now() + OAUTH_REFRESH_SAFETY_MARGIN_MS

  if (!shouldRefresh) {
    return {
      accessToken: auth.access || auth.refresh || "",
      accountId: auth.accountId,
    }
  }

  const response = await fetch(`${OPENAI_ISSUER}/oauth/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: auth.refresh!,
      client_id: OPENAI_CLIENT_ID,
    }).toString(),
  })

  if (!response.ok) {
    throw new Error(`OpenAI OAuth token refresh failed (${response.status})`)
  }

  const payload = (await response.json()) as {
    access_token?: string
    refresh_token?: string
    id_token?: string
  }

  const accessToken = payload.access_token || auth.access || auth.refresh || ""
  const accountId = parseOpenAiAccountId(payload) ?? auth.accountId
  return {
    accessToken,
    accountId,
  }
}

function parseOpenAiErrorMessage(raw: string, status: number): string {
  const defaultMessage = raw || `OpenAI request failed (${status})`

  try {
    const parsed = JSON.parse(raw) as {
      error?: {
        message?: string
      }
      message?: string
      detail?: string
    }

    const message = parsed.error?.message ?? parsed.message ?? parsed.detail ?? defaultMessage
    if (/missing scopes:\s*model\.request/i.test(message)) {
      return "OpenAI credential is missing `model.request` scope. Update API key permissions or use OpenAI OAuth."
    }
    return message
  } catch {
    if (/missing scopes:\s*model\.request/i.test(defaultMessage)) {
      return "OpenAI credential is missing `model.request` scope. Update API key permissions or use OpenAI OAuth."
    }
    return defaultMessage
  }
}

async function* streamOpenAi(request: GenerationRequest): AsyncGenerator<NormalizedStreamEvent, void, void> {
  const requestId = crypto.randomUUID()
  yield {
    type: "start",
    data: { requestId, provider: request.provider, model: request.model, intent: request.intent },
  }

  const isOauth = request.auth.type === "oauth"
  let token = extractApiKeyFromAuth(request)
  let oauthAccountId: string | undefined

  if (request.auth.type === "oauth") {
    oauthAccountId = request.auth.accountId
    try {
      const refreshed = await refreshOpenAiOauthToken(request.auth)
      token = refreshed.accessToken
      oauthAccountId = refreshed.accountId
    } catch (error) {
      const message = error instanceof Error ? error.message : "OpenAI OAuth token refresh failed"
      yield { type: "error", data: { message } }
      yield { type: "done", data: { finishReason: "error" } }
      return
    }
  }

  if (!token) {
    yield { type: "error", data: { message: "Missing provider credential" } }
    yield { type: "done", data: { finishReason: "error" } }
    return
  }

  const endpoint = isOauth
    ? new URL(OPENAI_CODEX_RESPONSES_ENDPOINT)
    : joinProviderUrl(request.providerConfig?.apiBaseUrl ?? "https://api.openai.com/v1", "chat/completions")

  const headers = new Headers({ "Content-Type": "application/json" })
  headers.set("Authorization", `Bearer ${token}`)
  if (oauthAccountId) {
    headers.set("ChatGPT-Account-Id", oauthAccountId)
  }
  if (isOauth) {
    headers.set("originator", "researchlm")
    headers.set("User-Agent", "researchlm/0.1.0")
    headers.set("session_id", request.workspaceContext?.workspaceId ?? requestId)
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify(
      isOauth
        ? {
            model: request.model,
            input: toOpenAiResponsesInput(request),
            instructions: toOauthInstructions(request),
            store: false,
            stream: true,
          }
        : {
            model: request.model,
            messages: toOpenAiMessages(request),
            stream: true,
            temperature: 0.7,
          },
    ),
  })

  if (!response.ok) {
    const body = await response.text()
    yield { type: "error", data: { message: parseOpenAiErrorMessage(body, response.status) } }
    yield { type: "done", data: { finishReason: "error" } }
    return
  }

  if (!response.body) {
    yield { type: "error", data: { message: "Provider did not return a stream body" } }
    yield { type: "done", data: { finishReason: "error" } }
    return
  }

  for await (const chunk of parseSseDataLines(response.body)) {
    try {
      const parsed = JSON.parse(chunk) as {
        type?: string
        delta?: string
        choices?: Array<{
          delta?: { content?: string }
          finish_reason?: string | null
        }>
        usage?: {
          prompt_tokens?: number
          completion_tokens?: number
        }
        response?: {
          usage?: {
            input_tokens?: number
            output_tokens?: number
          }
          error?: {
            message?: string
          }
        }
      }

      if (parsed.type === "response.output_text.delta" && typeof parsed.delta === "string" && parsed.delta.length > 0) {
        yield { type: "delta", data: { text: parsed.delta } }
      }

      if (parsed.response?.usage) {
        yield {
          type: "usage",
          data: {
            inputTokens: parsed.response.usage.input_tokens,
            outputTokens: parsed.response.usage.output_tokens,
          },
        }
      }

      if (parsed.type === "response.failed") {
        yield {
          type: "error",
          data: {
            message: parsed.response?.error?.message ?? "OpenAI Codex request failed",
          },
        }
        yield { type: "done", data: { finishReason: "error" } }
        return
      }

      if (parsed.type === "response.completed") {
        yield { type: "done", data: { finishReason: "stop" } }
        return
      }

      const delta = parsed.choices?.[0]?.delta?.content
      if (delta) {
        yield { type: "delta", data: { text: delta } }
      }

      if (parsed.usage) {
        yield {
          type: "usage",
          data: {
            inputTokens: parsed.usage.prompt_tokens,
            outputTokens: parsed.usage.completion_tokens,
          },
        }
      }

      const finishReason = parsed.choices?.[0]?.finish_reason
      if (finishReason) {
        yield { type: "done", data: { finishReason } }
        return
      }
    } catch {
      continue
    }
  }

  yield { type: "done", data: { finishReason: "stop" } }
}

export const openAiAdapter: ProviderAdapter = {
  name: "openai",
  capabilities: {
    supportsTools: true,
    supportsJsonMode: true,
    supportsVision: true,
  },
  stream: streamOpenAi,
}
