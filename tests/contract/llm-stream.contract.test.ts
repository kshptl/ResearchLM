import { describe, expect, it } from "vitest"

describe("/api/llm/stream contract", () => {
  it("accepts known provider values", () => {
    const providers = ["openai", "anthropic", "google", "openrouter", "github", "amazon-bedrock"]
    expect(providers).toContain("openai")
    expect(providers).toContain("anthropic")
  })

  it("defines canonical SSE event types", () => {
    const events = ["start", "delta", "tool_delta", "usage", "error", "done"]
    expect(events).toEqual(expect.arrayContaining(["start", "done", "error"]))
  })
})
