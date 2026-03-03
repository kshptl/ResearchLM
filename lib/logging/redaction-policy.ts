export const PROHIBITED_LOG_FIELDS = [
  "authorization",
  "apiKey",
  "credential",
  "encryptedValue",
  "password",
  "rawValue",
  "secret",
  "token"
] as const

const prohibitedFieldSet = new Set<string>(PROHIBITED_LOG_FIELDS)

export function isProhibitedLogField(key: string): boolean {
  return prohibitedFieldSet.has(key)
}

export function redactStructuredData(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => redactStructuredData(item))
  }

  if (value && typeof value === "object") {
    const output: Record<string, unknown> = {}
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      if (isProhibitedLogField(key)) {
        output[key] = "[REDACTED]"
        continue
      }
      output[key] = redactStructuredData(nested)
    }
    return output
  }

  return value
}
