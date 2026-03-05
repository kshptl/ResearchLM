import { NextResponse } from "next/server"
import { getProviderCatalog, listProviderModels, sortProvidersForSelection } from "@/lib/providers/catalog"

function normalizeProvider(provider: {
  id: string
  name: string
  apiBaseUrl?: string
  npmPackage?: string
  envKeys: string[]
  modelCount: number
  models: Array<{
    id: string
    name: string
    apiId: string
    apiBaseUrl?: string
    npmPackage?: string
    supportsToolCall: boolean
    supportsVision: boolean
  }>
}) {
  if (provider.id === "github-models" || provider.id === "github-copilot") {
    return {
      ...provider,
      id: "github",
      name: "GitHub",
    }
  }
  return provider
}

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url)
  const forceRefresh = url.searchParams.get("refresh") === "1"
  const catalog = await getProviderCatalog({ forceRefresh })
  const providersById = new Map<
    string,
    {
      id: string
      name: string
      apiBaseUrl?: string
      npmPackage?: string
      envKeys: string[]
      modelCount: number
      models: Array<{
        id: string
        name: string
        apiId: string
        apiBaseUrl?: string
        npmPackage?: string
        supportsToolCall: boolean
        supportsVision: boolean
      }>
    }
  >()

  for (const provider of sortProvidersForSelection(Object.values(catalog))) {
    const normalized = normalizeProvider({
      id: provider.id,
      name: provider.name,
      apiBaseUrl: provider.apiBaseUrl,
      npmPackage: provider.npmPackage,
      envKeys: provider.envKeys,
      modelCount: Object.keys(provider.models).length,
      models: listProviderModels(provider).map((model) => ({
        id: model.id,
        name: model.name,
        apiId: model.apiId,
        apiBaseUrl: model.apiBaseUrl,
        npmPackage: model.npmPackage,
        supportsToolCall: model.supportsToolCall,
        supportsVision: model.supportsVision,
      })),
    })

    if (!providersById.has(normalized.id)) {
      providersById.set(normalized.id, normalized)
    }
  }

  const providers = Array.from(providersById.values())

  return NextResponse.json({ providers })
}
