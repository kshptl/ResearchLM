import type { GenerationRequest } from "@/features/generation/types"

const consumerTokenPatterns = [/^ghu_/i, /^ghs_/i, /^sk-cli/i, /^session_/i]
const revokedCredentialPatterns = [/^revoked:/i, /^permission-denied:/i]
const invalidCredentialPatterns = [/^invalid:/i, /^expired:/i]

export class CredentialPreflightError extends Error {
  readonly category: "auth" | "permission"
  readonly retryable: false

  constructor(category: "auth" | "permission", message: string) {
    super(message)
    this.category = category
    this.retryable = false
  }
}

export function assertByokPolicy(request: GenerationRequest): void {
  const credential = request.auth.credential.trim()
  if (!credential) {
    throw new CredentialPreflightError("auth", "Missing BYOK credential")
  }

  for (const pattern of consumerTokenPatterns) {
    if (pattern.test(credential)) {
      throw new CredentialPreflightError("permission", "Consumer or CLI session tokens are not allowed")
    }
  }

  for (const pattern of revokedCredentialPatterns) {
    if (pattern.test(credential)) {
      throw new CredentialPreflightError("permission", "Credential has been revoked or lacks permission")
    }
  }

  for (const pattern of invalidCredentialPatterns) {
    if (pattern.test(credential)) {
      throw new CredentialPreflightError("auth", "Credential is invalid or expired")
    }
  }
}
