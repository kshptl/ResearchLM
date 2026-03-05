import type { GenerationRequest } from "@/features/generation/types"
import type { NormalizedStreamEvent, ProviderAdapter } from "@/lib/providers/adapter-types"
import { extractApiKeyFromAuth } from "@/lib/providers/auth"
import { parseSseDataLines } from "@/lib/providers/sse-parser"
import { joinProviderUrl } from "@/lib/providers/url"

function normalizeDomain(value: string): string {
  return value.replace(/^https?:\/\//, "").replace(/\/+$/, "")
}

function resolveCopilotBaseUrl(request: GenerationRequest): string {
  if (request.auth.type === "oauth" && typeof request.auth.enterpriseUrl === "string" && request.auth.enterpriseUrl.length > 0) {
    return `https://copilot-api.${normalizeDomain(request.auth.enterpriseUrl)}`
  }
  if (request.providerConfig?.apiBaseUrl?.includes("githubcopilot")) {
    return request.providerConfig.apiBaseUrl
  }
  return "https://api.githubcopilot.com"
}

function resolveGitHubModelsBaseUrl(request: GenerationRequest): string {
  if (request.providerConfig?.apiBaseUrl && !request.providerConfig.apiBaseUrl.includes("githubcopilot")) {
    return request.providerConfig.apiBaseUrl
  }
  return "https://models.inference.ai.azure.com"
}

function resolveCopilotInitiator(request: GenerationRequest): "user" | "agent" {
  const lastMessage = [...request.messages].reverse().find((message) => message.role !== "system")
  return lastMessage?.role === "user" ? "user" : "agent"
}

async function* streamGitHub(request: GenerationRequest): AsyncGenerator<NormalizedStreamEvent, void, void> {
  const requestId = crypto.randomUUID()
  yield { type: "start", data: { requestId, provider: request.provider, model: request.model, intent: request.intent } }

  const usingCopilotOauth = request.auth.type === "oauth"
  const token =
    request.auth.type === "oauth"
      ? request.auth.refresh || request.auth.access
      : extractApiKeyFromAuth(request)
  if (!token) {
    yield { type: "error", data: { message: "Missing GitHub credential" } }
    yield { type: "done", data: { finishReason: "error" } }
    return
  }

  const baseUrl = usingCopilotOauth ? resolveCopilotBaseUrl(request) : resolveGitHubModelsBaseUrl(request)
  const endpoint = joinProviderUrl(baseUrl, "chat/completions")
  const initiator = resolveCopilotInitiator(request)

  const headers = new Headers({
    "Content-Type": "application/json",
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
  })

  if (usingCopilotOauth) {
    headers.set("Openai-Intent", "conversation-edits")
    headers.set("x-initiator", initiator)
    headers.set("User-Agent", "researchlm/0.1.0")
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: request.model,
      stream: true,
      messages: request.messages.map((message) => ({
        role: message.role === "tool" ? "user" : message.role,
        content: message.content,
      })),
    }),
  })

  if (!response.ok || !response.body) {
    const message = response.body ? await response.text() : "GitHub Copilot stream is unavailable"
    yield { type: "error", data: { message } }
    yield { type: "done", data: { finishReason: "error" } }
    return
  }

  for await (const chunk of parseSseDataLines(response.body)) {
    try {
      const parsed = JSON.parse(chunk) as {
        choices?: Array<{ delta?: { content?: string }; finish_reason?: string | null }>
      }
      const text = parsed.choices?.[0]?.delta?.content
      if (text) {
        yield { type: "delta", data: { text } }
      }
      if (parsed.choices?.[0]?.finish_reason) {
        yield { type: "done", data: { finishReason: parsed.choices[0].finish_reason } }
        return
      }
    } catch {
      continue
    }
  }

  yield { type: "done", data: { finishReason: "stop" } }
}

export const githubCopilotAdapter: ProviderAdapter = {
  name: "github",
  capabilities: {
    supportsTools: true,
    supportsJsonMode: true,
    supportsVision: true,
  },
  stream: streamGitHub,
}
