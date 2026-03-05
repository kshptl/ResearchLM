"use client"

import { useCallback, useRef, useState } from "react"
import type { GenerationAttempt, GenerationIntent, GenerationRequest, LocalGenerationLog } from "@/features/generation/types"
import type { RetryContextSnapshot } from "@/features/generation/retry-context"
import type { GenerationRequestAuth, ProviderAuthCredential } from "@/lib/auth/auth-types"
import {
  categorizeGenerationFailure,
  createGenerationFailureNotice,
  type GenerationFailureNotice
} from "@/features/generation/failure-notice-contract"
import { persistenceRepository } from "@/features/persistence/repository"
import { emitStructuredLocalLog } from "@/features/persistence/workspace-persistence-service"
import { consumeGenerationStream, consumeGenerationStreamIncremental } from "@/features/generation/stream-consumer"
import { getActiveCredentialByProvider, getCredentialAuth } from "@/lib/auth/credential-store"

type Options = {
  provider: GenerationRequest["provider"]
  model: string
  credential?: string | GenerationRequestAuth
}

type RunIntentOptions = {
  retryContext?: RetryContextSnapshot
  overrides?: Partial<Options>
  onDelta?: (chunk: string) => void
}

function resolveAuthFromStored(provider: string): GenerationRequestAuth | undefined {
  const stored = getActiveCredentialByProvider(provider)
  if (!stored) {
    return undefined
  }
  const auth = getCredentialAuth(stored)
  if (!auth) {
    return undefined
  }
  return mapCredentialToRequestAuth(auth)
}

function mapCredentialToRequestAuth(auth: ProviderAuthCredential): GenerationRequestAuth {
  switch (auth.type) {
    case "api":
      return { type: "api-key", credential: auth.key }
    case "oauth":
      return {
        type: "oauth",
        access: auth.access,
        refresh: auth.refresh,
        expires: auth.expires,
        accountId: auth.accountId,
        enterpriseUrl: auth.enterpriseUrl,
      }
    case "wellknown":
      return {
        type: "wellknown",
        key: auth.key,
        token: auth.token,
      }
    case "aws-profile":
      return {
        type: "aws-profile",
        profile: auth.profile,
        region: auth.region,
      }
    case "aws-env-chain":
      return {
        type: "aws-env-chain",
        region: auth.region,
      }
    default:
      return {
        type: "api-key",
        credential: "",
      }
  }
}

function resolveRequestAuth(provider: string, value?: string | GenerationRequestAuth): GenerationRequestAuth {
  if (value && typeof value === "object" && "type" in value) {
    return value
  }

  if (typeof value === "string") {
    if (provider === "bedrock" || provider === "amazon-bedrock") {
      if (value === "aws-env-chain") {
        return { type: "aws-env-chain" }
      }
      return { type: "aws-profile", profile: value }
    }
    return { type: "api-key", credential: value }
  }

  const stored = resolveAuthFromStored(provider)
  if (stored) {
    return stored
  }

  if (provider === "bedrock" || provider === "amazon-bedrock") {
    return { type: "aws-env-chain" }
  }

  return { type: "api-key", credential: "" }
}

function redactAuthForLog(auth: GenerationRequestAuth): string {
  if (auth.type === "api-key") {
    return auth.credential ? "[REDACTED]" : ""
  }
  if (auth.type === "aws-profile") {
    return auth.profile
  }
  if (auth.type === "aws-env-chain") {
    return "aws-env-chain"
  }
  return "[REDACTED]"
}

export function useGeneration({ provider, model, credential }: Options) {
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string>()
  const [failureNotice, setFailureNotice] = useState<GenerationFailureNotice>()
  const activeRequests = useRef(0)

  const runIntent = useCallback(
    async (intent: GenerationIntent, prompt: string, options?: RunIntentOptions): Promise<string> => {
      const effectiveProvider = options?.overrides?.provider ?? provider
      const effectiveModel = options?.overrides?.model ?? model
      const effectiveCredential = options?.overrides?.credential ?? credential
      const effectiveAuth = resolveRequestAuth(effectiveProvider, effectiveCredential)
      const onDelta = options?.onDelta
      const retryContext = options?.retryContext

      // Only clear global error state if this is the first active request
      if (activeRequests.current === 0) {
        setError(undefined)
        setFailureNotice(undefined)
      }
      activeRequests.current += 1
      setIsStreaming(true)

      const requestId = crypto.randomUUID()
      const now = new Date().toISOString()
      const retryContextRecordId = retryContext ? crypto.randomUUID() : undefined

      try {
        if (retryContext) {
          await persistenceRepository.saveRetryContext({
            id: retryContextRecordId!,
            requestId,
            workspaceId: "local-workspace",
            snapshot: retryContext,
            createdAt: now
          })
        }

        await persistenceRepository.saveGenerationRequest({
          id: requestId,
          provider: effectiveProvider,
          model: effectiveModel,
          intent,
          status: "pending",
          createdAt: now,
          updatedAt: now
        })

        const attempt: GenerationAttempt = {
          id: crypto.randomUUID(),
          requestId,
          attemptNumber: 1,
          triggerType: retryContext ? "manual-retry" : "initial",
          retryContextId: retryContextRecordId,
          status: "streaming",
          createdAt: now
        }
        await persistenceRepository.saveGenerationAttempt(attempt)

        const response = await fetch("/api/llm/stream", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            provider: effectiveProvider,
            model: effectiveModel,
            intent,
            messages: [{ role: "user", content: prompt }],
            auth: effectiveAuth
          } satisfies GenerationRequest)
        })

        if (!response.ok || !response.body) {
          throw new Error("Unable to stream model response")
        }

        const { text } = onDelta
          ? await consumeGenerationStreamIncremental(response.body, prompt, onDelta)
          : await consumeGenerationStream(response.body, prompt)

        const completionLog: LocalGenerationLog = {
          id: crypto.randomUUID(),
          requestId,
          eventType: "generation_completed",
          provider: effectiveProvider,
          outcome: "ok",
          timestamp: new Date().toISOString(),
          metadata: { intent }
        }
        await persistenceRepository.saveLocalGenerationLog(completionLog)
        await emitStructuredLocalLog({
          domain: "generation",
          eventType: "generation_completed",
          outcome: "ok",
          metadata: { requestId, provider: effectiveProvider, intent, credential: redactAuthForLog(effectiveAuth) }
        })

        return text
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown generation error"
        setError(message)
        setFailureNotice(
          createGenerationFailureNotice({
            category: categorizeGenerationFailure(message),
            message,
            requestId,
            provider: effectiveProvider
          })
        )

        const failureLog: LocalGenerationLog = {
          id: crypto.randomUUID(),
          requestId,
          eventType: "generation_failed",
          provider: effectiveProvider,
          outcome: "failed",
          timestamp: new Date().toISOString(),
          metadata: { intent, message }
        }
        await persistenceRepository.saveLocalGenerationLog(failureLog)
        await emitStructuredLocalLog({
          domain: "generation",
          eventType: "generation_failed",
          outcome: "failed",
          metadata: { requestId, provider: effectiveProvider, intent, message, credential: redactAuthForLog(effectiveAuth) }
        })
        return ""
      } finally {
        activeRequests.current -= 1
        if (activeRequests.current === 0) {
          setIsStreaming(false)
        }
      }
    },
    [credential, model, provider]
  )

  return {
    isStreaming,
    error,
    failureNotice,
    runIntent
  }
}
