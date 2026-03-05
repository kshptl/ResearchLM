import { describe, expect, it } from "vitest"
import { contrastRatio, createNodeThemeStyle, parseCssColor } from "@/features/graph-model/node-color-theme"

function resolveCssColor(value: string | undefined): { r: number; g: number; b: number } {
  if (!value) {
    throw new Error("Missing CSS color value")
  }
  const parsed = parseCssColor(value)
  if (!parsed) {
    throw new Error(`Unable to parse CSS color: ${value}`)
  }
  return parsed
}

describe("node color theme", () => {
  it("returns undefined when color token cannot be parsed", () => {
    expect(createNodeThemeStyle("var(--token)")).toBeUndefined()
  })

  it("ensures readable foreground for light backgrounds", () => {
    const style = createNodeThemeStyle("hsl(48 95% 88%)")
    expect(style).toBeTruthy()
    const styleMap = style as unknown as Record<string, string | undefined>

    const foreground = resolveCssColor(styleMap["--foreground"])
    const background = resolveCssColor(styleMap["--card"])
    expect(contrastRatio(foreground, background)).toBeGreaterThanOrEqual(4.5)
  })

  it("ensures readable foreground for dark backgrounds", () => {
    const style = createNodeThemeStyle("hsl(210 30% 18%)")
    expect(style).toBeTruthy()
    const styleMap = style as unknown as Record<string, string | undefined>

    const foreground = resolveCssColor(styleMap["--foreground"])
    const background = resolveCssColor(styleMap["--card"])
    expect(contrastRatio(foreground, background)).toBeGreaterThanOrEqual(4.5)
  })

  it("ensures readable foreground for mid-tone backgrounds", () => {
    const style = createNodeThemeStyle("hsl(210 20% 48%)")
    expect(style).toBeTruthy()
    const styleMap = style as unknown as Record<string, string | undefined>

    const foreground = resolveCssColor(styleMap["--foreground"])
    const background = resolveCssColor(styleMap["--card"])
    expect(contrastRatio(foreground, background)).toBeGreaterThanOrEqual(4.5)
  })
})
