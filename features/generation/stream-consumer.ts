import {
  evaluateOutputQuality,
  malformedOutputNotice,
  type OutputQualityCategory,
  type OutputQualityNotice
} from "@/features/generation/output-contract"

export type QualityNoticeCategory = OutputQualityCategory
export type QualityNotice = OutputQualityNotice

type ParsedEvent = {
  event: string
  data: Record<string, unknown>
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
      qualityNotice: malformedOutputNotice()
    }
  }

  const text = events
    .filter((event) => event.event === "delta")
    .map((event) => String(event.data.text ?? ""))
    .join("")

  return {
    text,
    qualityNotice: evaluateOutputQuality(text, sourceText)
  }
}

export async function consumeGenerationStreamIncremental(
  stream: ReadableStream<Uint8Array>,
  sourceText: string,
  onDelta: (chunk: string) => void
): Promise<{ text: string; qualityNotice: QualityNotice | null }> {
  const reader = stream.getReader()
  const decoder = new TextDecoder()
  let buffer = ""
  let fullText = ""
  let hadMalformed = false

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    // Process complete SSE frames (separated by double newline)
    const frames = buffer.split("\n\n")
    buffer = frames.pop() ?? ""

    for (const frame of frames) {
      if (!frame.trim()) continue
      const { events, malformed } = parseSsePayload(frame)
      if (malformed) hadMalformed = true

      for (const event of events) {
        if (event.event === "delta" && event.data.text) {
          const chunk = String(event.data.text)
          fullText += chunk
          onDelta(chunk)
        }
      }
    }
  }

  // Process any remaining buffer
  if (buffer.trim()) {
    const { events, malformed } = parseSsePayload(buffer)
    if (malformed) hadMalformed = true
    for (const event of events) {
      if (event.event === "delta" && event.data.text) {
        const chunk = String(event.data.text)
        fullText += chunk
        onDelta(chunk)
      }
    }
  }

  if (hadMalformed && !fullText) {
    return { text: "", qualityNotice: malformedOutputNotice() }
  }

  return {
    text: fullText,
    qualityNotice: evaluateOutputQuality(fullText, sourceText),
  }
}
