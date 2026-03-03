export type GenerationIntent = "prompt" | "explain" | "questions" | "subtopics"

export interface GenerationMessage {
  role: "system" | "user" | "assistant" | "tool"
  content: string
}

export interface GenerationRequest {
  id?: string
  provider: "openai" | "anthropic" | "gemini" | "openrouter" | "github-models"
  model: string
  intent: GenerationIntent
  messages: GenerationMessage[]
  auth: {
    type: "api-key" | "oauth"
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
