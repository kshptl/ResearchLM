import type { Workspace } from "@/features/graph-model/types"
import { persistenceRepository } from "@/features/persistence/repository"

const STORE = "workspaces"
const SETTINGS_STORE = "settings"

export interface SemanticStateLifecycleLog {
  id: string
  workspaceId: string
  canvasId: string
  mode: "auto" | "manual"
  activeLevel: "all" | "lines" | "summary" | "keywords"
  zoom: number
  timestamp: string
}

export async function saveWorkspace(workspace: Workspace): Promise<void> {
  await persistenceRepository.putRecord(STORE, workspace)
}

export async function loadWorkspace(id: string): Promise<Workspace | undefined> {
  return await persistenceRepository.getRecord<Workspace>(STORE, id)
}

export async function emitSemanticStateLifecycleLog(
  entry: Omit<SemanticStateLifecycleLog, "id" | "timestamp">
): Promise<SemanticStateLifecycleLog> {
  const payload: SemanticStateLifecycleLog = {
    id: `semantic-log:${crypto.randomUUID()}`,
    timestamp: new Date().toISOString(),
    ...entry
  }

  await persistenceRepository.putRecord(SETTINGS_STORE, {
    id: payload.id,
    value: {
      domain: "semantic-state",
      ...payload
    }
  })

  return payload
}
