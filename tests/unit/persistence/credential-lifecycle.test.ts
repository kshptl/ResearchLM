import { beforeEach, describe, expect, it } from "vitest"
import { assertByokPolicy, CredentialPreflightError } from "@/lib/auth/byok-policy"
import {
  clearCredentialsForTests,
  getActiveCredentialByProvider,
  replaceCredential,
  revokeCredential,
  saveCredential
} from "@/lib/auth/credential-store"

describe("credential lifecycle", () => {
  beforeEach(() => {
    clearCredentialsForTests()
  })

  it("supports save, replace, and revoke transitions", () => {
    const saved = saveCredential("openai", "api-key", "sk-valid")
    expect(getActiveCredentialByProvider("openai")?.id).toBe(saved.id)

    const replaced = replaceCredential(saved.id, "sk-replaced")
    expect(replaced?.status).toBe("active")

    const revoked = revokeCredential(saved.id)
    expect(revoked?.status).toBe("revoked")
    expect(getActiveCredentialByProvider("openai")).toBeUndefined()
  })

  it("gates auth and permission failures during credential preflight", () => {
    expect(() =>
      assertByokPolicy({
        provider: "openai",
        model: "gpt-4o-mini",
        intent: "prompt",
        messages: [{ role: "user", content: "Hello" }],
        auth: { type: "api-key", credential: "" }
      })
    ).toThrowError(CredentialPreflightError)

    expect(() =>
      assertByokPolicy({
        provider: "openai",
        model: "gpt-4o-mini",
        intent: "prompt",
        messages: [{ role: "user", content: "Hello" }],
        auth: { type: "api-key", credential: "revoked:token" }
      })
    ).toThrow(/revoked|permission/i)
  })
})
