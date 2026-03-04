"use client"

import { useCallback, useRef, useState } from "react"
import type { GenerationAttempt, GenerationIntent, GenerationRequest, LocalGenerationLog } from "@/features/generation/types"
import type { RetryContextSnapshot } from "@/features/generation/retry-context"
import {
  categorizeGenerationFailure,
  createGenerationFailureNotice,
  type GenerationFailureNotice
} from "@/features/generation/failure-notice-contract"
import { persistenceRepository } from "@/features/persistence/repository"
import { emitStructuredLocalLog } from "@/features/persistence/workspace-persistence-service"
import { consumeGenerationStream, consumeGenerationStreamIncremental } from "@/features/generation/stream-consumer"

type Options = {
  provider: GenerationRequest["provider"]
  model: string
  credential: string
}

type RunIntentOptions = {
  retryContext?: RetryContextSnapshot
  overrides?: Partial<Options>
  onDelta?: (chunk: string) => void
}

export function useGeneration({ provider, model, credential }: Options) {
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string>()
  const [qualityNotice, setQualityNotice] = useState<string>()
  const [failureNotice, setFailureNotice] = useState<GenerationFailureNotice>()
  const activeRequests = useRef(0)

  const runIntent = useCallback(
    async (intent: GenerationIntent, prompt: string, options?: RunIntentOptions): Promise<string> => {
      const effectiveProvider = options?.overrides?.provider ?? provider
      const effectiveModel = options?.overrides?.model ?? model
      const effectiveCredential = options?.overrides?.credential ?? credential
      const onDelta = options?.onDelta
      const retryContext = options?.retryContext

      // Only clear global error state if this is the first active request
      if (activeRequests.current === 0) {
        setError(undefined)
        setQualityNotice(undefined)
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

        const authType = effectiveProvider === "bedrock" ? "aws-profile" : "api-key"

        const response = await fetch("/api/llm/stream", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            provider: effectiveProvider,
            model: effectiveModel,
            intent,
            messages: [{ role: "user", content: prompt }],
            auth: { type: authType, credential: effectiveCredential }
          } satisfies GenerationRequest)
        })

        if (!response.ok || !response.body) {
          throw new Error("Unable to stream model response")
        }

        const { text, qualityNotice: qn } = onDelta
          ? await consumeGenerationStreamIncremental(response.body, prompt, onDelta)
          : await consumeGenerationStream(response.body, prompt)

        if (qn) {
          setQualityNotice(`${qn.message} (${qn.actions.join("/")})`)
          setFailureNotice(
            createGenerationFailureNotice({
              category: "quality",
              message: qn.message,
              requestId,
              provider: effectiveProvider
            })
          )
        }

        const completionLog: LocalGenerationLog = {
          id: crypto.randomUUID(),
          requestId,
          eventType: "generation_completed",
          provider: effectiveProvider,
          outcome: "ok",
          timestamp: new Date().toISOString(),
          metadata: { intent, hasQualityNotice: Boolean(qn) }
        }
        await persistenceRepository.saveLocalGenerationLog(completionLog)
        await emitStructuredLocalLog({
          domain: "generation",
          eventType: "generation_completed",
          outcome: "ok",
          metadata: { requestId, provider: effectiveProvider, intent, credential: effectiveCredential }
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
          metadata: { requestId, provider: effectiveProvider, intent, message, credential: effectiveCredential }
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
    qualityNotice,
    failureNotice,
    runIntent
  }
}
