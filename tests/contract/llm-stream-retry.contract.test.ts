import { describe, expect, it } from "vitest"
import { CredentialPreflightError, assertByokPolicy } from "@/lib/auth/byok-policy"
import { captureRetryContext } from "@/features/generation/retry-context"

describe("llm stream retry contract", () => {
  it("enforces auth and permission taxonomy for credential preflight", () => {
    expect(() =>
      assertByokPolicy({
        provider: "openai",
        model: "gpt-4o-mini",
        intent: "prompt",
        messages: [{ role: "user", content: "hello" }],
        auth: { type: "api-key", credential: "" }
      })
    ).toThrowError(CredentialPreflightError)

    expect(() =>
      assertByokPolicy({
        provider: "openai",
        model: "gpt-4o-mini",
        intent: "prompt",
        messages: [{ role: "user", content: "hello" }],
        auth: { type: "api-key", credential: "revoked:abc" }
      })
    ).toThrow(/permission/i)
  })

  it("captures retry context with selection and inspector refs", () => {
    const snapshot = captureRetryContext({
      selectedNodeIds: ["n1", "n2"],
      selectedEdgeIds: ["e1"],
      inspectorActiveNodeId: "n2",
      inspectorDraft: "draft text"
    })

    expect(snapshot.selectedNodeIds).toEqual(["n1", "n2"])
    expect(snapshot.inspectorActiveNodeId).toBe("n2")
    expect(snapshot.inspectorDraft).toBe("draft text")
    expect(snapshot.capturedAt).toBeTruthy()
  })
})
