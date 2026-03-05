import { describe, expect, it } from "vitest"
import { categorizeGenerationFailure, createGenerationFailureNotice } from "@/features/generation/failure-notice-contract"

describe("failure notice contract", () => {
  it("categorizes auth failures", () => {
    expect(categorizeGenerationFailure("Missing API key credential")).toBe("auth")
  })

  it("does not classify quality-keyword errors as quality", () => {
    expect(categorizeGenerationFailure("Generation output appears off-topic")).toBe("unknown")
  })

  it("uses retry/dismiss actions for unknown failures", () => {
    const notice = createGenerationFailureNotice({
      category: "unknown",
      message: "unexpected issue"
    })
    expect(notice.actions).toEqual(["retry", "dismiss"])
  })
})
