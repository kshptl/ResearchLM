export type QualityNoticeCategory = "empty" | "repetitive" | "off-topic" | "malformed"

export type QualityNotice = {
  category: QualityNoticeCategory
  message: string
  actions: Array<"retry" | "change-action" | "dismiss">
}

type ParsedEvent = {
  event: string
  data: Record<string, unknown>
}

const DEFAULT_ACTIONS: Array<"retry" | "change-action" | "dismiss"> = ["retry", "change-action", "dismiss"]

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

function evaluateQuality(text: string, sourceText: string): QualityNotice | null {
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

function parseSsePayload(raw: string): { events: ParsedEvent[]; malformed: boolean } {
  const frames = raw.split("\n\n")
  const events: ParsedEvent[] = []
  let malformed = false

  for (const frame of frames) {
    if (!frame.trim()) {
      continue
    }

    const lines = frame.split("\n")
    const eventLine = lines.find((line) => line.startsWith("event:"))
    const dataLine = lines.find((line) => line.startsWith("data:"))
    if (!eventLine || !dataLine) {
      malformed = true
      continue
    }

    const event = eventLine.slice("event:".length).trim()
    const payload = dataLine.slice("data:".length).trim()

    try {
      events.push({
        event,
        data: JSON.parse(payload) as Record<string, unknown>
      })
    } catch {
      malformed = true
    }
  }

  return { events, malformed }
}

export async function consumeGenerationStream(
  stream: ReadableStream<Uint8Array>,
  sourceText: string
): Promise<{ text: string; qualityNotice: QualityNotice | null }> {
  const reader = stream.getReader()
  const decoder = new TextDecoder()
  let raw = ""

  while (true) {
    const { done, value } = await reader.read()
    if (done) {
      break
    }
    raw += decoder.decode(value, { stream: true })
  }

  const { events, malformed } = parseSsePayload(raw)
  if (malformed) {
    return {
      text: "",
      qualityNotice: {
        category: "malformed",
        message: "Generation stream returned malformed SSE payload.",
        actions: DEFAULT_ACTIONS
      }
    }
  }

  const text = events
    .filter((event) => event.event === "delta")
    .map((event) => String(event.data.text ?? ""))
    .join("")

  return {
    text,
    qualityNotice: evaluateQuality(text, sourceText)
  }
}
