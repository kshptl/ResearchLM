import { beforeEach, describe, expect, it, vi } from "vitest"
import { discoverProviderModels } from "@/lib/providers/model-discovery"
import { resetProviderCatalogCacheForTests } from "@/lib/providers/catalog"

describe("provider model discovery", () => {
  beforeEach(() => {
    resetProviderCatalogCacheForTests()
    vi.unstubAllGlobals()
  })

  it("fetches OpenAI models from live endpoint for active auth", async () => {
    const fetchMock = vi.fn()
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          openai: {
            id: "openai",
            name: "OpenAI",
            api: "https://api.openai.com/v1",
            models: {},
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    )
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          data: [{ id: "gpt-4o-mini" }, { id: "gpt-5.2" }],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    )
    vi.stubGlobal("fetch", fetchMock)

    const result = await discoverProviderModels({
      providerId: "openai",
      auth: { type: "api", key: "sk-test" },
    })

    expect(result.source).toBe("live")
    expect(result.models.map((model) => model.id)).toEqual(["gpt-4o-mini", "gpt-5.2"])
  })

  it("returns an empty live list when provider model endpoint fails", async () => {
    const fetchMock = vi.fn()
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          openai: {
            id: "openai",
            name: "OpenAI",
            api: "https://api.openai.com/v1",
            models: {},
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    )
    fetchMock.mockResolvedValueOnce(new Response("invalid token", { status: 401 }))
    vi.stubGlobal("fetch", fetchMock)

    const result = await discoverProviderModels({
      providerId: "openai",
      auth: { type: "api", key: "bad-token" },
    })

    expect(result.source).toBe("live")
    expect(result.models).toEqual([])
    expect(result.error).toMatch(/invalid token|failed|401/i)
  })

  it("uses codex model set for OpenAI OAuth without calling the platform models endpoint", async () => {
    const fetchMock = vi.fn()
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          openai: {
            id: "openai",
            name: "OpenAI",
            api: "https://api.openai.com/v1",
            models: {},
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    )
    vi.stubGlobal("fetch", fetchMock)

    const result = await discoverProviderModels({
      providerId: "openai",
      auth: {
        type: "oauth",
        access: "oauth-access",
        refresh: "oauth-refresh",
        expires: Date.now() + 60_000,
      },
    })

    expect(result.source).toBe("live")
    expect(result.models.some((model) => model.id === "gpt-5.3-codex")).toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it("uses GitHub Copilot enterprise base URL when GitHub oauth enterpriseUrl is provided", async () => {
    const fetchMock = vi.fn()
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          "github-copilot": {
            id: "github-copilot",
            name: "GitHub Copilot",
            api: "https://api.githubcopilot.com",
            models: {},
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    )
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          data: [{ id: "gpt-4.1" }],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    )
    vi.stubGlobal("fetch", fetchMock)

    const result = await discoverProviderModels({
      providerId: "github",
      auth: {
        type: "oauth",
        access: "copilot-access",
        refresh: "copilot-refresh",
        expires: 0,
        enterpriseUrl: "company.ghe.com",
      },
    })

    expect(result.source).toBe("live")
    expect(result.providerId).toBe("github")
    expect(result.providerName).toBe("GitHub")
    expect(result.models.map((model) => model.id)).toEqual(["gpt-4.1"])
    expect(String(fetchMock.mock.calls[1]?.[0])).toBe("https://copilot-api.company.ghe.com/models")
    const headers = new Headers((fetchMock.mock.calls[1]?.[1] as RequestInit | undefined)?.headers)
    expect(headers.get("authorization")).toBe("Bearer copilot-refresh")
    expect(headers.get("openai-intent")).toBe("conversation-panel")
  })

  it("uses GitHub Models endpoint for merged GitHub API-key auth", async () => {
    const fetchMock = vi.fn()
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          github: {
            id: "github",
            name: "GitHub",
            api: "https://models.inference.ai.azure.com",
            models: {},
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    )
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          data: [{ id: "gpt-4.1" }],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    )
    vi.stubGlobal("fetch", fetchMock)

    const result = await discoverProviderModels({
      providerId: "github",
      auth: {
        type: "api",
        key: "ghp_api_token",
      },
    })

    expect(result.source).toBe("live")
    expect(result.providerId).toBe("github")
    expect(result.providerName).toBe("GitHub")
    expect(result.models.map((model) => model.id)).toEqual(["gpt-4.1"])
    expect(String(fetchMock.mock.calls[1]?.[0])).toBe("https://models.inference.ai.azure.com/models")
    const headers = new Headers((fetchMock.mock.calls[1]?.[1] as RequestInit | undefined)?.headers)
    expect(headers.get("authorization")).toBe("Bearer ghp_api_token")
    expect(headers.get("openai-intent")).toBeNull()
  })

  it("adds Anthropic OAuth beta requirements for live model discovery", async () => {
    const fetchMock = vi.fn()
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          anthropic: {
            id: "anthropic",
            name: "Anthropic",
            api: "https://api.anthropic.com/v1",
            models: {},
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    )
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          data: [{ id: "claude-sonnet-4-5", display_name: "Claude Sonnet 4.5" }],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    )
    vi.stubGlobal("fetch", fetchMock)

    const result = await discoverProviderModels({
      providerId: "anthropic",
      auth: {
        type: "oauth",
        access: "anthropic-access",
        refresh: "anthropic-refresh",
        expires: Date.now() + 60_000,
      },
    })

    expect(result.source).toBe("live")
    expect(result.models.map((model) => model.id)).toEqual(["claude-sonnet-4-5"])
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain("https://api.anthropic.com/v1/models?beta=true")
    const headers = new Headers((fetchMock.mock.calls[1]?.[1] as RequestInit | undefined)?.headers)
    expect(headers.get("anthropic-beta")).toContain("oauth-2025-04-20")
    expect(headers.get("anthropic-beta")).toContain("interleaved-thinking-2025-05-14")
    expect(headers.get("user-agent")).toBe("claude-cli/2.1.2 (external, cli)")
  })
})
