import type { ProviderAdapter } from "@/lib/providers/adapter-types"
import type { GenerationRequest } from "@/features/generation/types"
import { anthropicAdapter } from "@/lib/providers/anthropic/adapter"
import { bedrockAdapter } from "@/lib/providers/bedrock/adapter"
import { geminiAdapter } from "@/lib/providers/gemini/adapter"
import { githubCopilotAdapter } from "@/lib/providers/github-copilot/adapter"
import { githubModelsAdapter } from "@/lib/providers/github-models/adapter"
import { openAiAdapter } from "@/lib/providers/openai/adapter"
import { openRouterAdapter } from "@/lib/providers/openrouter/adapter"

const adapters: Record<string, ProviderAdapter> = {
  openai: openAiAdapter,
  anthropic: anthropicAdapter,
  gemini: geminiAdapter,
  google: geminiAdapter,
  openrouter: openRouterAdapter,
  github: githubCopilotAdapter,
  "github-models": githubModelsAdapter,
  "github-copilot": githubCopilotAdapter,
  "github-copilot-enterprise": githubCopilotAdapter,
  bedrock: bedrockAdapter,
  "amazon-bedrock": bedrockAdapter
}

function inferAdapterFromConfig(request: GenerationRequest): ProviderAdapter | undefined {
  const npmPackage = request.providerConfig?.npmPackage
  if (!npmPackage) {
    return undefined
  }

  if (npmPackage.includes("anthropic")) {
    return anthropicAdapter
  }
  if (npmPackage.includes("amazon-bedrock")) {
    return bedrockAdapter
  }
  if (npmPackage.includes("google")) {
    return geminiAdapter
  }
  if (npmPackage.includes("openrouter")) {
    return openRouterAdapter
  }
  if (npmPackage.includes("github-copilot")) {
    return githubCopilotAdapter
  }
  if (npmPackage.includes("openai")) {
    return openAiAdapter
  }

  return undefined
}

export function getProviderAdapter(name: string, request?: GenerationRequest): ProviderAdapter {
  const adapter = adapters[name]
  if (!adapter) {
    const inferred = request ? inferAdapterFromConfig(request) : undefined
    if (inferred) {
      return inferred
    }
    if (request?.providerConfig?.apiBaseUrl) {
      return openAiAdapter
    }
    throw new Error(`Unsupported provider: ${name}`)
  }
  return adapter
}
