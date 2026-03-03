import { describe, expect, it } from "vitest"
import { evaluateOutputQuality, malformedOutputNotice } from "@/features/generation/output-contract"

describe("output quality guard", () => {
  it("flags empty output as actionable notice", () => {
    const notice = evaluateOutputQuality("", "Source context text")
    expect(notice?.category).toBe("empty")
    expect(notice?.actions).toEqual(["retry", "change-action", "dismiss"])
  })

  it("flags repetitive output", () => {
    const text = "system system system system system system"
    const notice = evaluateOutputQuality(text, "system context")
    expect(notice?.category).toBe("repetitive")
  })

  it("flags off-topic output when source keyword coverage is low", () => {
    const source = "transportation planning bus transit schedules"
    const generated = "volcano astronomy galaxy orbit telescope"
    const notice = evaluateOutputQuality(generated, source)
    expect(notice?.category).toBe("off-topic")
  })

  it("builds malformed notice with retry/change-action/dismiss actions", () => {
    const notice = malformedOutputNotice()
    expect(notice.category).toBe("malformed")
    expect(notice.actions).toEqual(["retry", "change-action", "dismiss"])
  })
})
