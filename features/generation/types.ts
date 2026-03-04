export type GenerationIntent = "prompt" | "explain" | "questions" | "subtopics" | "summarize"

export interface GenerationMessage {
  role: "system" | "user" | "assistant" | "tool"
  content: string
}

export interface GenerationRequest {
  id?: string
  provider: "openai" | "anthropic" | "gemini" | "openrouter" | "github-models" | "bedrock"
  model: string
  intent: GenerationIntent
  messages: GenerationMessage[]
  auth: {
    type: "api-key" | "oauth" | "aws-profile"
    credential: string
  }
  workspaceContext?: {
    workspaceId?: string
    canvasId?: string
    sourceNodeId?: string
  }
}

export type GenerationStatus = "pending" | "streaming" | "completed" | "failed" | "cancelled"

export interface GenerationAttempt {
  id: string
  requestId: string
  attemptNumber: number
  triggerType: "initial" | "manual-retry"
  retryContextId?: string
  status: GenerationStatus
  createdAt: string
  completedAt?: string
}

export interface LocalGenerationLog {
  id: string
  requestId: string
  eventType: string
  provider: GenerationRequest["provider"]
  outcome: "ok" | "failed"
  timestamp: string
  metadata?: Record<string, unknown>
}

export interface SemanticViewState {
  workspaceId: string
  canvasId: string
  mode: "auto" | "manual"
  manualLevel?: "all" | "lines" | "summary" | "keywords"
}
