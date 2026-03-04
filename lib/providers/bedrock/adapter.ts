import {
  BedrockRuntimeClient,
  ConverseStreamCommand,
  type Message,
  type ContentBlock,
} from "@aws-sdk/client-bedrock-runtime"
import { fromIni } from "@aws-sdk/credential-providers"
import type { GenerationRequest } from "@/features/generation/types"
import type { NormalizedStreamEvent, ProviderAdapter } from "@/lib/providers/adapter-types"

const DEFAULT_REGION = "us-east-1"
const AWS_PROFILE = "cline"

function toBedrockMessages(request: GenerationRequest): { system: string; messages: Message[] } {
  let system = ""
  const messages: Message[] = []

  for (const msg of request.messages) {
    if (msg.role === "system") {
      system = msg.content
      continue
    }

    const role = msg.role === "assistant" ? "assistant" : "user"
    const content: ContentBlock[] = [{ text: msg.content }]
    messages.push({ role, content })
  }

  // Bedrock requires at least one message
  if (messages.length === 0) {
    messages.push({ role: "user", content: [{ text: "Hello" }] })
  }

  return { system, messages }
}

async function* streamBedrock(request: GenerationRequest): AsyncGenerator<NormalizedStreamEvent, void, void> {
  const requestId = crypto.randomUUID()

  yield {
    type: "start",
    data: { requestId, provider: "bedrock", model: request.model, intent: request.intent },
  }

  const client = new BedrockRuntimeClient({
    region: DEFAULT_REGION,
    credentials: fromIni({ profile: AWS_PROFILE }),
  })

  const { system, messages } = toBedrockMessages(request)

  const command = new ConverseStreamCommand({
    modelId: request.model,
    messages,
    ...(system ? { system: [{ text: system }] } : {}),
  })

  const response = await client.send(command)

  if (!response.stream) {
    yield { type: "error", data: { message: "No stream returned from Bedrock" } }
    yield { type: "done", data: { finishReason: "error" } }
    return
  }

  for await (const event of response.stream) {
    if (event.contentBlockDelta?.delta?.text) {
      yield { type: "delta", data: { text: event.contentBlockDelta.delta.text } }
    }

    if (event.messageStop) {
      yield { type: "done", data: { finishReason: event.messageStop.stopReason ?? "stop" } }
      return
    }

    if (event.metadata?.usage) {
      yield {
        type: "usage",
        data: {
          inputTokens: event.metadata.usage.inputTokens,
          outputTokens: event.metadata.usage.outputTokens,
        },
      }
    }
  }

  yield { type: "done", data: { finishReason: "stop" } }
}

export const bedrockAdapter: ProviderAdapter = {
  name: "bedrock",
  capabilities: {
    supportsTools: true,
    supportsJsonMode: false,
    supportsVision: true,
  },
  stream: streamBedrock,
}
