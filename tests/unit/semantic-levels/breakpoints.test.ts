import { describe, expect, it } from "vitest"
import { levelFromZoom, resolveSemanticLevel } from "@/features/semantic-levels/state"

describe("semantic breakpoints", () => {
  it("uses provided breakpoints for auto mode", () => {
    const breakpoints = {
      keywordsMaxZoom: 0.25,
      summaryMaxZoom: 0.45,
      linesMaxZoom: 0.85
    }

    expect(levelFromZoom(0.2, breakpoints)).toBe("keywords")
    expect(levelFromZoom(0.3, breakpoints)).toBe("summary")
    expect(levelFromZoom(0.8, breakpoints)).toBe("lines")
    expect(levelFromZoom(0.9, breakpoints)).toBe("all")
  })

  it("manual mode overrides zoom-derived level", () => {
    const resolved = resolveSemanticLevel(
      {
        mode: "manual",
        level: "keywords",
        breakpoints: {
          keywordsMaxZoom: 0.2,
          summaryMaxZoom: 0.4,
          linesMaxZoom: 0.6
        }
      },
      1
    )

    expect(resolved).toBe("keywords")
  })
})
