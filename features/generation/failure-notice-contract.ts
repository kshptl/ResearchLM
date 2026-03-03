export type GenerationFailureCategory = "auth" | "permission" | "network" | "quality" | "unknown"
export type GenerationFailureAction = "retry" | "change-action" | "update-credentials" | "dismiss"

export interface GenerationFailureNotice {
  id: string
  category: GenerationFailureCategory
  message: string
  nonBlocking: true
  actions: GenerationFailureAction[]
  requestId?: string
  provider?: string
  createdAt: string
}

function actionsForCategory(category: GenerationFailureCategory): GenerationFailureAction[] {
  if (category === "auth" || category === "permission") {
    return ["update-credentials", "change-action", "dismiss"]
  }
  if (category === "quality") {
    return ["retry", "change-action", "dismiss"]
  }
  return ["retry", "dismiss"]
}

export function createGenerationFailureNotice(input: {
  category: GenerationFailureCategory
  message: string
  requestId?: string
  provider?: string
}): GenerationFailureNotice {
  return {
    id: `gen-failure:${crypto.randomUUID()}`,
    category: input.category,
    message: input.message,
    nonBlocking: true,
    actions: actionsForCategory(input.category),
    requestId: input.requestId,
    provider: input.provider,
    createdAt: new Date().toISOString()
  }
}

export function categorizeGenerationFailure(message: string): GenerationFailureCategory {
  if (/auth|credential|token|api key/i.test(message)) {
    return "auth"
  }
  if (/permission|forbidden|not allowed/i.test(message)) {
    return "permission"
  }
  if (/quality|off-topic|repetitive|empty|malformed/i.test(message)) {
    return "quality"
  }
  if (/network|timeout|stream/i.test(message)) {
    return "network"
  }
  return "unknown"
}
