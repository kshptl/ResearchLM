export type OutputQualityCategory = "empty" | "repetitive" | "off-topic" | "malformed"
export type OutputQualityAction = "retry" | "change-action" | "dismiss"

export interface OutputQualityNotice {
  category: OutputQualityCategory
  message: string
  actions: OutputQualityAction[]
}

const DEFAULT_ACTIONS: OutputQualityAction[] = ["retry", "change-action", "dismiss"]

function normalizeToken(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "")
}

function extractRequiredSourceKeywords(sourceText: string): string[] {
  const unique: string[] = []
  for (const token of sourceText.split(/\s+/)) {
    const normalized = normalizeToken(token)
    if (normalized.length < 4) {
      continue
    }
    if (!unique.includes(normalized)) {
      unique.push(normalized)
    }
    if (unique.length >= 10) {
      break
    }
  }
  return unique
}

function duplicateRatio(text: string): number {
  const tokens = text
    .split(/\s+/)
    .map((token) => normalizeToken(token))
    .filter((token) => token.length >= 4)
  if (tokens.length === 0) {
    return 0
  }

  const uniqueCount = new Set(tokens).size
  return 1 - uniqueCount / tokens.length
}

export function malformedOutputNotice(): OutputQualityNotice {
  return {
    category: "malformed",
    message: "Generation stream returned malformed SSE payload.",
    actions: DEFAULT_ACTIONS
  }
}

export function evaluateOutputQuality(text: string, sourceText: string): OutputQualityNotice | null {
  const trimmed = text.trim()
  if (!trimmed) {
    return {
      category: "empty",
      message: "Generation returned no usable content.",
      actions: DEFAULT_ACTIONS
    }
  }

  if (duplicateRatio(trimmed) > 0.3) {
    return {
      category: "repetitive",
      message: "Generation output is too repetitive.",
      actions: DEFAULT_ACTIONS
    }
  }

  const requiredKeywords = extractRequiredSourceKeywords(sourceText)
  if (requiredKeywords.length > 0) {
    const generatedTokens = new Set(
      trimmed
        .split(/\s+/)
        .map((token) => normalizeToken(token))
        .filter((token) => token.length >= 4)
    )
    const matched = requiredKeywords.filter((keyword) => generatedTokens.has(keyword)).length
    const keywordCoverage = matched / requiredKeywords.length
    if (keywordCoverage < 0.5) {
      return {
        category: "off-topic",
        message: "Generation output appears off-topic relative to the source context.",
        actions: DEFAULT_ACTIONS
      }
    }
  }

  return null
}
