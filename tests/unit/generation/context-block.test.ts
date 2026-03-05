import { describe, expect, it } from "vitest"
import {
  applyPromptContextBlocks,
  createFollowUpContextBlocks,
  createFollowUpPromptWithContext,
  transformPromptContextBlocksForModel,
} from "@/features/generation/context-block"

describe("context block prompt helpers", () => {
  it("creates follow-up context blocks without prompt markup", () => {
    expect(createFollowUpContextBlocks("Quoted text")).toEqual(["Quoted text"])
  })

  it("creates a visible follow-up context block prefill", () => {
    const prompt = createFollowUpPromptWithContext("Quoted text")
    expect(prompt).toBe("[Context]\nQuoted text\n[/Context]\n\n")
  })

  it("applies context blocks outside the prompt editor text", () => {
    const visiblePrompt = applyPromptContextBlocks("Explain this", ["Line <1>"])
    expect(visiblePrompt).toContain("[Context]")
    expect(visiblePrompt).toContain("Line <1>")
    expect(visiblePrompt).toContain("Explain this")
  })

  it("converts visible context blocks into backend xml context tags", () => {
    const modelPrompt = transformPromptContextBlocksForModel("[Context]\nLine <1>\n[/Context]\n\nExplain this")
    expect(modelPrompt).toContain("<context>")
    expect(modelPrompt).toContain("Line &lt;1&gt;")
    expect(modelPrompt).toContain("</context>")
    expect(modelPrompt).toContain("Explain this")
    expect(modelPrompt).not.toContain("[Context]")
  })
})
