import type { ProviderAdapter } from "@/lib/providers/adapter-types"
import { anthropicAdapter } from "@/lib/providers/anthropic/adapter"
import { bedrockAdapter } from "@/lib/providers/bedrock/adapter"
import { geminiAdapter } from "@/lib/providers/gemini/adapter"
import { githubModelsAdapter } from "@/lib/providers/github-models/adapter"
import { openAiAdapter } from "@/lib/providers/openai/adapter"
import { openRouterAdapter } from "@/lib/providers/openrouter/adapter"

const adapters: Record<string, ProviderAdapter> = {
  openai: openAiAdapter,
  anthropic: anthropicAdapter,
  gemini: geminiAdapter,
  openrouter: openRouterAdapter,
  "github-models": githubModelsAdapter,
  bedrock: bedrockAdapter
}

export function getProviderAdapter(name: string): ProviderAdapter {
  const adapter = adapters[name]
  if (!adapter) {
    throw new Error(`Unsupported provider: ${name}`)
  }
  return adapter
}
