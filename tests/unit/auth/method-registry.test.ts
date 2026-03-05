import { describe, expect, it } from "vitest"
import { getProviderAuthMethods } from "@/lib/auth/method-registry"

describe("provider auth method registry", () => {
  it("returns OpenAI parity auth options", () => {
    const methods = getProviderAuthMethods("openai")
    expect(methods.map((method) => method.label)).toEqual([
      "ChatGPT Pro/Plus (browser)",
      "ChatGPT Pro/Plus (headless)",
      "Manually enter API Key",
    ])
  })

  it("returns merged GitHub API + Copilot OAuth methods", () => {
    const methods = getProviderAuthMethods("github")
    expect(methods.map((method) => method.type)).toEqual(["api", "oauth"])
    expect(methods[1]?.label).toBe("Login with GitHub Copilot")
  })

  it("falls back to generic API key method for unknown providers", () => {
    const methods = getProviderAuthMethods("unknown-provider")
    expect(methods).toHaveLength(1)
    expect(methods[0]?.id).toBe("manual-api-key")
  })
})
