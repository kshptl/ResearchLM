type ParsedEvent = {
  event: string
  data: Record<string, unknown>
}

function asStreamErrorMessage(data: Record<string, unknown>): string {
  const message = data.message
  if (typeof message === "string" && message.trim().length > 0) {
    return message
  }
  return "Provider stream failed"
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
  _sourceText: string
): Promise<{ text: string }> {
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

  const { events } = parseSsePayload(raw)

  const streamError = events.find((event) => event.event === "error")
  if (streamError) {
    throw new Error(asStreamErrorMessage(streamError.data))
  }

  const text = events
    .filter((event) => event.event === "delta")
    .map((event) => String(event.data.text ?? ""))
    .join("")

  return {
    text,
  }
}

export async function consumeGenerationStreamIncremental(
  stream: ReadableStream<Uint8Array>,
  _sourceText: string,
  onDelta: (chunk: string) => void
): Promise<{ text: string }> {
  const reader = stream.getReader()
  const decoder = new TextDecoder()
  let buffer = ""
  let fullText = ""

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    // Process complete SSE frames (separated by double newline)
    const frames = buffer.split("\n\n")
    buffer = frames.pop() ?? ""

    for (const frame of frames) {
      if (!frame.trim()) continue
      const { events } = parseSsePayload(frame)

      for (const event of events) {
        if (event.event === "error") {
          throw new Error(asStreamErrorMessage(event.data))
        }
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
    const { events } = parseSsePayload(buffer)
    for (const event of events) {
      if (event.event === "error") {
        throw new Error(asStreamErrorMessage(event.data))
      }
      if (event.event === "delta" && event.data.text) {
        const chunk = String(event.data.text)
        fullText += chunk
        onDelta(chunk)
      }
    }
  }

  return {
    text: fullText,
  }
}
