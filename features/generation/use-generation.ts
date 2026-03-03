"use client"

import { useCallback, useState } from "react"
import type { GenerationAttempt, GenerationIntent, GenerationRequest, LocalGenerationLog } from "@/features/generation/types"
import type { RetryContextSnapshot } from "@/features/generation/retry-context"
import {
  categorizeGenerationFailure,
  createGenerationFailureNotice,
  type GenerationFailureNotice
} from "@/features/generation/failure-notice-contract"
import { persistenceRepository } from "@/features/persistence/repository"
import { emitStructuredLocalLog } from "@/features/persistence/workspace-persistence-service"
import { consumeGenerationStream } from "@/features/generation/stream-consumer"

type Options = {
  provider: GenerationRequest["provider"]
  model: string
  credential: string
}

export function useGeneration({ provider, model, credential }: Options) {
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string>()
  const [qualityNotice, setQualityNotice] = useState<string>()
  const [failureNotice, setFailureNotice] = useState<GenerationFailureNotice>()

  const runIntent = useCallback(
    async (intent: GenerationIntent, prompt: string, retryContext?: RetryContextSnapshot): Promise<string> => {
      setError(undefined)
      setQualityNotice(undefined)
      setFailureNotice(undefined)
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
          provider,
          model,
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
            provider,
            model,
            intent,
            messages: [{ role: "user", content: prompt }],
            auth: { type: "api-key", credential }
          } satisfies GenerationRequest)
        })

        if (!response.ok || !response.body) {
          throw new Error("Unable to stream model response")
        }

        const { text, qualityNotice } = await consumeGenerationStream(response.body, prompt)

        if (qualityNotice) {
          setQualityNotice(`${qualityNotice.message} (${qualityNotice.actions.join("/")})`)
          setFailureNotice(
            createGenerationFailureNotice({
              category: "quality",
              message: qualityNotice.message,
              requestId,
              provider
            })
          )
        }

        const completionLog: LocalGenerationLog = {
          id: crypto.randomUUID(),
          requestId,
          eventType: "generation_completed",
          provider,
          outcome: "ok",
          timestamp: new Date().toISOString(),
          metadata: {
            intent,
            hasQualityNotice: Boolean(qualityNotice)
          }
        }
        await persistenceRepository.saveLocalGenerationLog(completionLog)
        await emitStructuredLocalLog({
          domain: "generation",
          eventType: "generation_completed",
          outcome: "ok",
          metadata: {
            requestId,
            provider,
            intent,
            credential
          }
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
            provider
          })
        )

        const failureLog: LocalGenerationLog = {
          id: crypto.randomUUID(),
          requestId,
          eventType: "generation_failed",
          provider,
          outcome: "failed",
          timestamp: new Date().toISOString(),
          metadata: {
            intent,
            message
          }
        }
        await persistenceRepository.saveLocalGenerationLog(failureLog)
        await emitStructuredLocalLog({
          domain: "generation",
          eventType: "generation_failed",
          outcome: "failed",
          metadata: {
            requestId,
            provider,
            intent,
            message,
            credential
          }
        })
        return ""
      } finally {
        setIsStreaming(false)
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
