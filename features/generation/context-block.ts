const CONTEXT_BLOCK_REGEX = /\[Context\]\s*([\s\S]*?)\s*\[\/Context\]/gi

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;")
}

export function createFollowUpPromptWithContext(context: string): string {
  const trimmed = context.trim()
  if (!trimmed) {
    return ""
  }

  return `[Context]\n${trimmed}\n[/Context]\n\n`
}

export function normalizePromptContextBlocks(contextBlocks?: string[]): string[] {
  if (!contextBlocks || contextBlocks.length === 0) {
    return []
  }

  return contextBlocks
    .map((block) => block.trim())
    .filter((block) => block.length > 0)
}

export function createFollowUpContextBlocks(context: string): string[] {
  return normalizePromptContextBlocks([context])
}

export function applyPromptContextBlocks(prompt: string, contextBlocks?: string[]): string {
  const normalizedBlocks = normalizePromptContextBlocks(contextBlocks)
  if (normalizedBlocks.length === 0) {
    return prompt
  }

  const visibleBlocks = normalizedBlocks
    .map((context) => `[Context]\n${context}\n[/Context]`)
    .join("\n\n")

  const trimmedPrompt = prompt.trim()
  if (!trimmedPrompt) {
    return visibleBlocks
  }

  return `${visibleBlocks}\n\n${prompt}`
}

export function transformPromptContextBlocksForModel(prompt: string): string {
  const contextBlocks: string[] = []
  const strippedPrompt = prompt.replace(CONTEXT_BLOCK_REGEX, (_match, context) => {
    const value = typeof context === "string" ? context.trim() : ""
    if (value.length > 0) {
      contextBlocks.push(value)
    }
    return ""
  })

  if (contextBlocks.length === 0) {
    return prompt
  }

  const xmlContext = contextBlocks.map((context) => `<context>\n${escapeXml(context)}\n</context>`).join("\n\n")
  const remainingPrompt = strippedPrompt.trim()

  if (!remainingPrompt) {
    return xmlContext
  }

  return `${xmlContext}\n\n${remainingPrompt}`
}
