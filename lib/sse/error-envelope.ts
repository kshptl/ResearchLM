export type ErrorCategory =
  | "auth"
  | "permission"
  | "rate_limit"
  | "quota"
  | "invalid_request"
  | "model_not_found"
  | "timeout"
  | "upstream"
  | "safety"
  | "internal"

export interface ErrorEnvelope {
  category: ErrorCategory
  message: string
  retryable: boolean
  requestId?: string
  provider?: string
  providerCode?: string
  retryAfterMs?: number
}

export function toErrorEnvelope(error: unknown, requestId?: string): ErrorEnvelope {
  if (error instanceof Error && /permission|forbidden|not allowed|access denied/i.test(error.message)) {
    return { category: "permission", message: error.message, retryable: false, requestId }
  }

  if (error instanceof Error && /credential|token|auth/i.test(error.message)) {
    return { category: "auth", message: error.message, retryable: false, requestId }
  }

  return {
    category: "internal",
    message: error instanceof Error ? error.message : "Unknown error",
    retryable: false,
    requestId
  }
}
