import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  DEFAULT_WORKSPACE_MODEL_PREFERENCE,
  readWorkspaceDefaultModelPreference,
  subscribeWorkspaceDefaultModelPreference,
  writeWorkspaceDefaultModelPreference,
} from "@/features/generation/default-model-preference"

describe("default model preference", () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it("returns fallback preference when unset", () => {
    expect(readWorkspaceDefaultModelPreference()).toEqual(DEFAULT_WORKSPACE_MODEL_PREFERENCE)
  })

  it("persists and reads a selected provider/model pair", () => {
    writeWorkspaceDefaultModelPreference({ provider: "anthropic", model: "claude-sonnet-4-5" })
    expect(readWorkspaceDefaultModelPreference()).toEqual({
      provider: "anthropic",
      model: "claude-sonnet-4-5",
    })
  })

  it("notifies subscribers on in-tab preference updates", () => {
    const listener = vi.fn()
    const unsubscribe = subscribeWorkspaceDefaultModelPreference(listener)

    writeWorkspaceDefaultModelPreference({ provider: "google", model: "gemini-2.5-pro" })

    expect(listener).toHaveBeenCalledWith({
      provider: "google",
      model: "gemini-2.5-pro",
    })

    unsubscribe()
  })
})

