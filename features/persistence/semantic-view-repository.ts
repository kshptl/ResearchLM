import type { SemanticViewState } from "@/features/generation/types"
import { persistenceRepository } from "@/features/persistence/repository"

const STORE = "settings"

type SemanticViewRecord = {
  id: string
  value: SemanticViewState
}

export function semanticViewStateId(workspaceId: string, canvasId: string): string {
  return `semantic:${workspaceId}:${canvasId}`
}

export async function saveSemanticViewState(state: SemanticViewState): Promise<void> {
  await persistenceRepository.putRecord<SemanticViewRecord>(STORE, {
    id: semanticViewStateId(state.workspaceId, state.canvasId),
    value: state
  })
}

export async function loadSemanticViewState(workspaceId: string, canvasId: string): Promise<SemanticViewState | undefined> {
  const record = await persistenceRepository.getRecord<SemanticViewRecord>(STORE, semanticViewStateId(workspaceId, canvasId))
  return record?.value
}

export async function clearSemanticViewState(workspaceId: string, canvasId: string): Promise<void> {
  await persistenceRepository.deleteRecord(STORE, semanticViewStateId(workspaceId, canvasId))
}
