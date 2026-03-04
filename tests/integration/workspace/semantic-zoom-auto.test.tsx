import "@/tests/helpers/mock-react-flow"
import { describe, expect, it } from "vitest"
import {
  DEFAULT_SEMANTIC_BREAKPOINTS,
  resolveSemanticLevel,
} from "@/features/semantic-levels/state"

describe("semantic zoom auto", () => {
  it("automatically reduces representation detail as zoom decreases", () => {
    const state = {
      mode: "auto" as const,
      level: "all" as const,
      breakpoints: DEFAULT_SEMANTIC_BREAKPOINTS,
    }

    // Full zoom → all detail
    expect(resolveSemanticLevel(state, 1.0)).toBe("all")

    // Zoom below lines threshold → lines
    expect(resolveSemanticLevel(state, 0.7)).toBe("lines")

    // Zoom below summary threshold → summary
    expect(resolveSemanticLevel(state, 0.5)).toBe("summary")

    // Zoom below keywords threshold → keywords
    expect(resolveSemanticLevel(state, 0.2)).toBe("keywords")
  })

  it("returns manual level regardless of zoom when in manual mode", () => {
    const state = {
      mode: "manual" as const,
      level: "summary" as const,
      breakpoints: DEFAULT_SEMANTIC_BREAKPOINTS,
    }

    expect(resolveSemanticLevel(state, 1.0)).toBe("summary")
    expect(resolveSemanticLevel(state, 0.2)).toBe("summary")
  })
})
