import type { CSSProperties } from "react"

type RgbColor = {
  r: number
  g: number
  b: number
}

const LIGHT_TEXT: RgbColor = { r: 255, g: 255, b: 255 }
const DARK_TEXT: RgbColor = { r: 0, g: 0, b: 0 }

function clamp01(value: number): number {
  if (value < 0) return 0
  if (value > 1) return 1
  return value
}

function clamp255(value: number): number {
  if (value < 0) return 0
  if (value > 255) return 255
  return Math.round(value)
}

function rgbToCss(color: RgbColor): string {
  return `rgb(${clamp255(color.r)} ${clamp255(color.g)} ${clamp255(color.b)})`
}

function mixRgb(base: RgbColor, target: RgbColor, amount: number): RgbColor {
  const t = clamp01(amount)
  return {
    r: base.r + (target.r - base.r) * t,
    g: base.g + (target.g - base.g) * t,
    b: base.b + (target.b - base.b) * t,
  }
}

function hueToRgb(p: number, q: number, t: number): number {
  let next = t
  if (next < 0) next += 1
  if (next > 1) next -= 1
  if (next < 1 / 6) return p + (q - p) * 6 * next
  if (next < 1 / 2) return q
  if (next < 2 / 3) return p + (q - p) * (2 / 3 - next) * 6
  return p
}

function hslToRgb(h: number, s: number, l: number): RgbColor {
  const hue = ((h % 360) + 360) % 360
  const sat = clamp01(s / 100)
  const light = clamp01(l / 100)

  if (sat === 0) {
    const gray = light * 255
    return { r: gray, g: gray, b: gray }
  }

  const q = light < 0.5 ? light * (1 + sat) : light + sat - light * sat
  const p = 2 * light - q
  const hk = hue / 360

  return {
    r: 255 * hueToRgb(p, q, hk + 1 / 3),
    g: 255 * hueToRgb(p, q, hk),
    b: 255 * hueToRgb(p, q, hk - 1 / 3),
  }
}

function parseHue(raw: string): number | null {
  const trimmed = raw.trim().toLowerCase()
  if (trimmed.endsWith("turn")) {
    const value = Number.parseFloat(trimmed.slice(0, -4))
    return Number.isFinite(value) ? value * 360 : null
  }
  if (trimmed.endsWith("rad")) {
    const value = Number.parseFloat(trimmed.slice(0, -3))
    return Number.isFinite(value) ? (value * 180) / Math.PI : null
  }
  if (trimmed.endsWith("deg")) {
    const value = Number.parseFloat(trimmed.slice(0, -3))
    return Number.isFinite(value) ? value : null
  }
  const value = Number.parseFloat(trimmed)
  return Number.isFinite(value) ? value : null
}

function parsePercent(raw: string): number | null {
  const trimmed = raw.trim()
  if (!trimmed.endsWith("%")) {
    return null
  }
  const value = Number.parseFloat(trimmed.slice(0, -1))
  return Number.isFinite(value) ? value : null
}

function parseHexColor(input: string): RgbColor | null {
  const hex = input.trim().replace(/^#/, "")
  if (!/^[0-9a-f]{3}([0-9a-f]{3})?$/i.test(hex)) {
    return null
  }

  if (hex.length === 3) {
    const [r, g, b] = hex.split("")
    return {
      r: Number.parseInt(`${r}${r}`, 16),
      g: Number.parseInt(`${g}${g}`, 16),
      b: Number.parseInt(`${b}${b}`, 16),
    }
  }

  return {
    r: Number.parseInt(hex.slice(0, 2), 16),
    g: Number.parseInt(hex.slice(2, 4), 16),
    b: Number.parseInt(hex.slice(4, 6), 16),
  }
}

function parseRgbColor(input: string): RgbColor | null {
  const match = input.trim().match(/^rgba?\((.+)\)$/i)
  if (!match) {
    return null
  }
  const parts = match[1]
    .replace(/\//g, " ")
    .split(/[,\s]+/)
    .map((part) => part.trim())
    .filter(Boolean)

  if (parts.length < 3) {
    return null
  }

  const channels: number[] = []
  for (const raw of parts.slice(0, 3)) {
    if (raw.endsWith("%")) {
      const percent = Number.parseFloat(raw.slice(0, -1))
      if (!Number.isFinite(percent)) return null
      channels.push((percent / 100) * 255)
      continue
    }
    const value = Number.parseFloat(raw)
    if (!Number.isFinite(value)) return null
    channels.push(value)
  }

  return {
    r: channels[0],
    g: channels[1],
    b: channels[2],
  }
}

function parseHslColor(input: string): RgbColor | null {
  const match = input.trim().match(/^hsla?\((.+)\)$/i)
  if (!match) {
    return null
  }

  const normalized = match[1].replace(/\s*\/\s*[\d.]+%?\s*$/, "")
  const parts = normalized
    .replace(/,/g, " ")
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean)

  if (parts.length < 3) {
    return null
  }

  const hue = parseHue(parts[0])
  const saturation = parsePercent(parts[1])
  const lightness = parsePercent(parts[2])
  if (hue === null || saturation === null || lightness === null) {
    return null
  }

  return hslToRgb(hue, saturation, lightness)
}

export function parseCssColor(input: string): RgbColor | null {
  const value = input.trim()
  if (!value) {
    return null
  }
  if (value.startsWith("#")) {
    return parseHexColor(value)
  }
  if (/^rgba?\(/i.test(value)) {
    return parseRgbColor(value)
  }
  if (/^hsla?\(/i.test(value)) {
    return parseHslColor(value)
  }
  return null
}

function toRelativeLuminance(color: RgbColor): number {
  const toLinear = (channel: number) => {
    const value = clamp255(channel) / 255
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  }

  const r = toLinear(color.r)
  const g = toLinear(color.g)
  const b = toLinear(color.b)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function contrastRatio(colorA: RgbColor, colorB: RgbColor): number {
  const l1 = toRelativeLuminance(colorA)
  const l2 = toRelativeLuminance(colorB)
  const brightest = Math.max(l1, l2)
  const darkest = Math.min(l1, l2)
  return (brightest + 0.05) / (darkest + 0.05)
}

function chooseReadableText(background: RgbColor): RgbColor {
  const contrastWithLight = contrastRatio(background, LIGHT_TEXT)
  const contrastWithDark = contrastRatio(background, DARK_TEXT)
  return contrastWithLight > contrastWithDark ? LIGHT_TEXT : DARK_TEXT
}

export function createNodeThemeStyle(colorToken: string): CSSProperties | undefined {
  const background = parseCssColor(colorToken)
  if (!background) {
    return undefined
  }

  const foreground = chooseReadableText(background)
  const mutedForeground = mixRgb(background, foreground, 0.62)
  const border = mixRgb(background, foreground, 0.24)
  const mutedSurface = mixRgb(background, foreground, 0.08)
  const accentSurface = mixRgb(background, foreground, 0.14)
  const ring = mixRgb(background, foreground, 0.44)
  const destructive = foreground === LIGHT_TEXT ? { r: 248, g: 113, b: 113 } : { r: 153, g: 27, b: 27 }

  return {
    "--background": rgbToCss(mutedSurface),
    "--card": rgbToCss(background),
    "--card-foreground": rgbToCss(foreground),
    "--foreground": rgbToCss(foreground),
    "--muted": rgbToCss(mutedSurface),
    "--muted-foreground": rgbToCss(mutedForeground),
    "--border": rgbToCss(border),
    "--input": rgbToCss(border),
    "--accent": rgbToCss(accentSurface),
    "--accent-foreground": rgbToCss(foreground),
    "--ring": rgbToCss(ring),
    "--destructive": rgbToCss(destructive),
    color: rgbToCss(foreground),
  } as CSSProperties
}
