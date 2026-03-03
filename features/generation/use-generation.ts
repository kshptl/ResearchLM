"use client"

import { useCallback, useState } from "react"
import type { GenerationAttempt, GenerationIntent, GenerationRequest, LocalGenerationLog } from "@/features/generation/types"
import { persistenceRepository } from "@/features/persistence/repository"
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

  const runIntent = useCallback(
    async (intent: GenerationIntent, prompt: string): Promise<string> => {
      setError(undefined)
      setQualityNotice(undefined)
      setIsStreaming(true)
      const requestId = crypto.randomUUID()
      const now = new Date().toISOString()

      try {
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
          triggerType: "initial",
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

        return text
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown generation error"
        setError(message)

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
        throw err
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
    runIntent
  }
}
