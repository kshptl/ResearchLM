import { describe, expect, it } from "vitest"
import { deriveSemanticRepresentations, representationForLevel } from "@/features/semantic-levels/representation"
import { levelFromZoom, resolveSemanticLevel } from "@/features/semantic-levels/state"

describe("semantic level logic", () => {
  it("maps zoom to reduced level", () => {
    expect(levelFromZoom(0.2)).toBe("keywords")
    expect(levelFromZoom(0.5)).toBe("summary")
    expect(levelFromZoom(0.7)).toBe("lines")
    expect(levelFromZoom(1)).toBe("all")
  })

  it("prefers manual mode level", () => {
    expect(resolveSemanticLevel({ mode: "manual", level: "summary" }, 0.1)).toBe("summary")
  })

  it("derives all semantic representations from a node payload", () => {
    const content =
      "Cities adapt transit systems over time. Riders compare reliability, cost, and safety across neighborhoods."

    const derived = deriveSemanticRepresentations(content)
    expect(derived.all).toContain("Cities adapt")
    expect(derived.lines.split("\n").length).toBeGreaterThan(0)
    expect(derived.summary.length).toBeGreaterThan(0)
    expect(derived.keywords).toContain("cities")
  })

  it("keeps full representation unchanged for all mode", () => {
    const content = "Exact content stays intact"
    expect(representationForLevel(content, "all")).toBe(content)
  })
})
