type RawCatalogProvider = {
  id?: string
  name?: string
  api?: string
  npm?: string
  env?: string[]
  models?: Record<string, RawCatalogModel>
}

type RawCatalogModel = {
  id?: string
  name?: string
  provider?: {
    api?: string
    npm?: string
  }
  tool_call?: boolean
  attachment?: boolean
  options?: Record<string, unknown>
}

export type ProviderCatalogModel = {
  id: string
  name: string
  apiId: string
  apiBaseUrl?: string
  npmPackage?: string
  supportsToolCall: boolean
  supportsVision: boolean
  options: Record<string, unknown>
}

export type ProviderCatalogProvider = {
  id: string
  name: string
  apiBaseUrl?: string
  npmPackage?: string
  envKeys: string[]
  models: Record<string, ProviderCatalogModel>
}

export type ProviderCatalog = Record<string, ProviderCatalogProvider>

const PROVIDER_PRIORITY_ORDER = ["opencode", "anthropic", "github", "openai", "google", "openrouter", "vercel"] as const
const CATALOG_URL = "https://models.dev/api.json"
const CACHE_TTL_MS = 10 * 60 * 1000

const fallbackCatalog: ProviderCatalog = {
  openai: {
    id: "openai",
    name: "OpenAI",
    apiBaseUrl: "https://api.openai.com/v1",
    npmPackage: "@ai-sdk/openai",
    envKeys: ["OPENAI_API_KEY"],
    models: {
      "gpt-5.2": {
        id: "gpt-5.2",
        name: "GPT-5.2",
        apiId: "gpt-5.2",
        apiBaseUrl: "https://api.openai.com/v1",
        npmPackage: "@ai-sdk/openai",
        supportsToolCall: true,
        supportsVision: true,
        options: {},
      },
    },
  },
  anthropic: {
    id: "anthropic",
    name: "Anthropic",
    apiBaseUrl: "https://api.anthropic.com/v1",
    npmPackage: "@ai-sdk/anthropic",
    envKeys: ["ANTHROPIC_API_KEY"],
    models: {},
  },
  google: {
    id: "google",
    name: "Google",
    apiBaseUrl: "https://generativelanguage.googleapis.com/v1beta",
    npmPackage: "@ai-sdk/google",
    envKeys: ["GOOGLE_GENERATIVE_AI_API_KEY", "GEMINI_API_KEY"],
    models: {},
  },
  openrouter: {
    id: "openrouter",
    name: "OpenRouter",
    apiBaseUrl: "https://openrouter.ai/api/v1",
    npmPackage: "@openrouter/ai-sdk-provider",
    envKeys: ["OPENROUTER_API_KEY"],
    models: {},
  },
  github: {
    id: "github",
    name: "GitHub",
    apiBaseUrl: "https://models.inference.ai.azure.com",
    npmPackage: "@ai-sdk/openai-compatible",
    envKeys: ["GITHUB_TOKEN"],
    models: {},
  },
  "github-models": {
    id: "github-models",
    name: "GitHub Models",
    apiBaseUrl: "https://models.inference.ai.azure.com",
    npmPackage: "@ai-sdk/openai-compatible",
    envKeys: ["GITHUB_TOKEN"],
    models: {},
  },
  "github-copilot": {
    id: "github-copilot",
    name: "GitHub Copilot",
    apiBaseUrl: "https://api.githubcopilot.com",
    npmPackage: "@ai-sdk/github-copilot",
    envKeys: ["GITHUB_TOKEN"],
    models: {},
  },
  "amazon-bedrock": {
    id: "amazon-bedrock",
    name: "Amazon Bedrock",
    apiBaseUrl: undefined,
    npmPackage: "@ai-sdk/amazon-bedrock",
    envKeys: ["AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "AWS_REGION"],
    models: {},
  },
}

let cachedCatalog: { loadedAt: number; providers: ProviderCatalog } | null = null

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined
}

function normalizeCatalog(raw: unknown): ProviderCatalog {
  if (!raw || typeof raw !== "object") {
    return fallbackCatalog
  }

  const providers: ProviderCatalog = {}
  for (const [providerId, providerValue] of Object.entries(raw as Record<string, RawCatalogProvider>)) {
    if (!providerValue || typeof providerValue !== "object") {
      continue
    }

    const providerName = asString(providerValue.name) ?? providerId
    const providerApiBase = asString(providerValue.api)
    const providerNpm = asString(providerValue.npm)
    const envKeys = Array.isArray(providerValue.env) ? providerValue.env.filter((entry): entry is string => typeof entry === "string") : []
    const modelEntries = providerValue.models ?? {}

    const models: Record<string, ProviderCatalogModel> = {}
    for (const [modelId, modelValue] of Object.entries(modelEntries)) {
      if (!modelValue || typeof modelValue !== "object") {
        continue
      }

      const apiBaseUrl = asString(modelValue.provider?.api) ?? providerApiBase
      const npmPackage = asString(modelValue.provider?.npm) ?? providerNpm
      models[modelId] = {
        id: modelId,
        name: asString(modelValue.name) ?? modelId,
        apiId: asString(modelValue.id) ?? modelId,
        apiBaseUrl,
        npmPackage,
        supportsToolCall: modelValue.tool_call !== false,
        supportsVision: modelValue.attachment === true,
        options: (modelValue.options as Record<string, unknown> | undefined) ?? {},
      }
    }

    providers[providerId] = {
      id: asString(providerValue.id) ?? providerId,
      name: providerName,
      apiBaseUrl: providerApiBase,
      npmPackage: providerNpm,
      envKeys,
      models,
    }
  }

  if (Object.keys(providers).length === 0) {
    return fallbackCatalog
  }

  const merged: ProviderCatalog = {
    ...fallbackCatalog,
    ...providers,
  }

  if (providers.bedrock && !providers["amazon-bedrock"]) {
    merged["amazon-bedrock"] = {
      ...providers.bedrock,
      id: "amazon-bedrock",
      name: "Amazon Bedrock",
    }
  }

  return merged
}

async function fetchRemoteCatalog(): Promise<ProviderCatalog> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 8000)

  try {
    const response = await fetch(CATALOG_URL, {
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    })

    if (!response.ok) {
      return fallbackCatalog
    }

    const json = (await response.json()) as unknown
    return normalizeCatalog(json)
  } catch {
    return fallbackCatalog
  } finally {
    clearTimeout(timeout)
  }
}

export async function getProviderCatalog(options?: { forceRefresh?: boolean }): Promise<ProviderCatalog> {
  if (!options?.forceRefresh && cachedCatalog && Date.now() - cachedCatalog.loadedAt < CACHE_TTL_MS) {
    return cachedCatalog.providers
  }

  const providers = await fetchRemoteCatalog()
  cachedCatalog = {
    loadedAt: Date.now(),
    providers,
  }
  return providers
}

export function resetProviderCatalogCacheForTests(): void {
  cachedCatalog = null
}

function providerPriority(providerId: string): number {
  const index = PROVIDER_PRIORITY_ORDER.indexOf(providerId as (typeof PROVIDER_PRIORITY_ORDER)[number])
  return index === -1 ? 999 : index
}

export function sortProvidersForSelection(providers: ProviderCatalogProvider[]): ProviderCatalogProvider[] {
  return [...providers].sort((left, right) => {
    const leftPriority = providerPriority(left.id)
    const rightPriority = providerPriority(right.id)
    if (leftPriority !== rightPriority) {
      return leftPriority - rightPriority
    }
    return left.name.localeCompare(right.name)
  })
}

export function listProviderModels(provider: ProviderCatalogProvider): ProviderCatalogModel[] {
  return Object.values(provider.models).sort((left, right) => left.name.localeCompare(right.name))
}

export async function getProviderById(providerId: string): Promise<ProviderCatalogProvider | undefined> {
  const catalog = await getProviderCatalog()
  if (providerId === "github-copilot-enterprise") {
    return catalog.github ?? catalog["github-copilot"] ?? catalog["github-models"]
  }
  if (providerId === "github-copilot" || providerId === "github-models") {
    return catalog.github ?? catalog[providerId]
  }
  if (providerId === "github") {
    return catalog.github ?? catalog["github-models"] ?? catalog["github-copilot"]
  }
  if (catalog[providerId]) {
    return catalog[providerId]
  }
  if (providerId === "bedrock") {
    return catalog["amazon-bedrock"]
  }
  if (providerId === "gemini") {
    return catalog.google
  }
  return undefined
}
