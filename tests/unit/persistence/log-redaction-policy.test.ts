import { describe, expect, it } from "vitest"
import {
  isProhibitedLogField,
  PROHIBITED_LOG_FIELDS,
  redactStructuredData
} from "@/lib/logging/redaction-policy"

describe("log redaction policy", () => {
  it("classifies prohibited sensitive fields", () => {
    expect(PROHIBITED_LOG_FIELDS.length).toBeGreaterThan(0)
    expect(isProhibitedLogField("token")).toBe(true)
    expect(isProhibitedLogField("authorization")).toBe(true)
    expect(isProhibitedLogField("safeField")).toBe(false)
  })

  it("redacts prohibited fields recursively", () => {
    const payload = {
      authorization: "Bearer abc",
      nested: {
        apiKey: "sk-123",
        safe: "ok"
      },
      list: [{ token: "secret-token" }, { name: "visible" }]
    }

    const redacted = redactStructuredData(payload) as {
      authorization: string
      nested: { apiKey: string; safe: string }
      list: Array<{ token?: string; name?: string }>
    }

    expect(redacted.authorization).toBe("[REDACTED]")
    expect(redacted.nested.apiKey).toBe("[REDACTED]")
    expect(redacted.nested.safe).toBe("ok")
    expect(redacted.list[0]?.token).toBe("[REDACTED]")
    expect(redacted.list[1]?.name).toBe("visible")
  })
})
