import { NextResponse } from "next/server"
import { z } from "zod"
import type { GenerationRequest } from "@/features/generation/types"
import { assertByokPolicy, CredentialPreflightError } from "@/lib/auth/byok-policy"
import { getProviderAdapter } from "@/lib/providers/registry"
import { assertMonotonicSequence, encodeSseEvent, encodeSsePing } from "@/lib/sse/events"
import { toErrorEnvelope } from "@/lib/sse/error-envelope"

const requestSchema = z.object({
  provider: z.enum(["openai", "anthropic", "gemini", "openrouter", "github-models", "bedrock"]),
  model: z.string().min(1),
  intent: z.enum(["prompt", "explain", "questions", "subtopics", "summarize"]),
  messages: z.array(z.object({ role: z.enum(["system", "user", "assistant", "tool"]), content: z.string().min(1) })).min(1),
  auth: z.object({ type: z.enum(["api-key", "oauth", "aws-profile"]), credential: z.string().min(1) }),
  workspaceContext: z
    .object({
      workspaceId: z.string().optional(),
      canvasId: z.string().optional(),
      sourceNodeId: z.string().optional()
    })
    .optional()
})

export async function POST(request: Request): Promise<Response> {
  const requestId = crypto.randomUUID()

  try {
    const body = await request.json()
    const parsed = requestSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        {
          category: "invalid_request",
          message: "Invalid stream request payload",
          retryable: false,
          requestId
        },
        { status: 400 }
      )
    }

    const payload = parsed.data as GenerationRequest
    try {
      assertByokPolicy(payload)
    } catch (error) {
      if (error instanceof CredentialPreflightError) {
        return NextResponse.json(
          {
            category: error.category,
            message: error.message,
            retryable: false,
            requestId
          },
          { status: error.category === "auth" ? 401 : 403 }
        )
      }
      throw error
    }

    const adapter = getProviderAdapter(payload.provider)

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const encoder = new TextEncoder()
        const timer = setInterval(() => controller.enqueue(encoder.encode(encodeSsePing())), 12000)
        let sequence: number | null = null

        try {
          for await (const event of adapter.stream(payload)) {
            const next = event.data.sequence
            if (typeof next === "number") {
              sequence = assertMonotonicSequence(sequence, next)
            }
            controller.enqueue(encoder.encode(encodeSseEvent(event)))
          }
        } catch (error) {
          controller.enqueue(
            encoder.encode(
              encodeSseEvent({
                type: "error",
                data: { ...toErrorEnvelope(error, requestId) }
              })
            )
          )
        } finally {
          clearInterval(timer)
          controller.close()
        }
      }
    })

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive"
      }
    })
  } catch (error) {
    const envelope = toErrorEnvelope(error, requestId)
    const status =
      envelope.category === "auth"
        ? 401
        : envelope.category === "permission"
          ? 403
          : envelope.category === "invalid_request"
            ? 400
            : 500
    return NextResponse.json(envelope, { status })
  }
}
