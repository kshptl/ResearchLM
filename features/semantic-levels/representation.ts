import type { SemanticLevel } from "@/features/graph-model/types"

const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "for",
  "from",
  "in",
  "is",
  "it",
  "of",
  "on",
  "or",
  "that",
  "the",
  "to",
  "with"
])

function normalizedWords(content: string): string[] {
  return content
    .trim()
    .split(/\s+/)
    .filter(Boolean)
}

function sentenceLikeLines(content: string): string[] {
  return content
    .trim()
    .split(/\n+/)
    .flatMap((line) => line.split(/[.!?]+/))
    .map((line) => line.trim())
    .filter(Boolean)
}

function lineProjection(content: string): string {
  const lines = sentenceLikeLines(content)
  if (lines.length === 0) {
    return ""
  }

  return lines
    .slice(0, 3)
    .map((line) => normalizedWords(line).slice(0, 8).join(" "))
    .join("\n")
}

function summaryProjection(content: string): string {
  const words = normalizedWords(content)
  const clipped = words.slice(0, 22).join(" ")
  return words.length > 22 ? `${clipped}...` : clipped
}

function keywordProjection(content: string): string {
  const words = content
    .trim()
    .split(/\W+/)
    .map((word) => word.toLowerCase())
    .filter((word) => word.length > 2 && !STOP_WORDS.has(word))

  const unique = new Set<string>()
  for (const word of words) {
    if (unique.size >= 6) {
      break
    }
    unique.add(word)
  }

  return [...unique].join(", ")
}

export function representationForLevel(content: string, level: SemanticLevel): string {
  const normalized = content.trim()
  if (level === "all") {
    return normalized
  }

  if (level === "lines") {
    return lineProjection(normalized)
  }

  if (level === "summary") {
    return summaryProjection(normalized)
  }

  return keywordProjection(normalized)
}

export function deriveSemanticRepresentations(content: string): Record<SemanticLevel, string> {
  return {
    all: representationForLevel(content, "all"),
    lines: representationForLevel(content, "lines"),
    summary: representationForLevel(content, "summary"),
    keywords: representationForLevel(content, "keywords")
  }
}
