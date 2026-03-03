import type { Workspace } from "@/features/graph-model/types"
import { persistenceRepository, type WorkspaceSnapshotRecord } from "@/features/persistence/repository"
import { redactStructuredData } from "@/lib/logging/redaction-policy"

const STORE = "workspaces"
const SETTINGS_STORE = "settings"

export type StructuredLogDomain = "generation" | "persistence" | "conflict"

export interface SnapshotPolicyInput {
  commandCountSinceSnapshot: number
  elapsedMsSinceSnapshot: number
  hasUnsavedChanges: boolean
}

export interface SnapshotPolicyConfig {
  maxCommandsBetweenSnapshots: number
  maxElapsedMsBetweenSnapshots: number
}

export const DEFAULT_SNAPSHOT_POLICY: SnapshotPolicyConfig = {
  maxCommandsBetweenSnapshots: 12,
  maxElapsedMsBetweenSnapshots: 45_000
}

export interface SemanticStateLifecycleLog {
  id: string
  workspaceId: string
  canvasId: string
  mode: "auto" | "manual"
  activeLevel: "all" | "lines" | "summary" | "keywords"
  zoom: number
  timestamp: string
}

export interface StructuredLocalLog {
  id: string
  domain: StructuredLogDomain
  eventType: string
  outcome: "ok" | "failed"
  timestamp: string
  metadata: Record<string, unknown>
}

export interface AutosaveScheduler {
  signalCommand: () => void
  shouldSnapshot: () => boolean
  markSnapshotSaved: () => void
}

export async function saveWorkspace(workspace: Workspace): Promise<void> {
  await persistenceRepository.putRecord(STORE, workspace)
}

export async function loadWorkspace(id: string): Promise<Workspace | undefined> {
  return await persistenceRepository.getRecord<Workspace>(STORE, id)
}

export function hydrateWorkspaceRecord(
  raw: Partial<Workspace> & { schemaVersion?: number; rootCanvasId?: string; activeCanvasId?: string }
): Workspace {
  const now = new Date().toISOString()
  const workspaceId = raw.id ?? crypto.randomUUID()
  const rootCanvasId = raw.rootCanvasId ?? raw.activeCanvasId ?? `${workspaceId}:root`
  const activeCanvasId = raw.activeCanvasId ?? rootCanvasId

  return {
    id: workspaceId,
    title: raw.title ?? "Recovered Workspace",
    rootCanvasId,
    activeCanvasId,
    version: typeof raw.version === "number" ? raw.version : 1,
    providerPreferences: raw.providerPreferences,
    semanticDefaults: raw.semanticDefaults,
    createdAt: raw.createdAt ?? now,
    updatedAt: raw.updatedAt ?? now
  }
}

export function shouldPersistAdaptiveSnapshot(
  input: SnapshotPolicyInput,
  config: SnapshotPolicyConfig = DEFAULT_SNAPSHOT_POLICY
): boolean {
  if (!input.hasUnsavedChanges) {
    return false
  }

  return (
    input.commandCountSinceSnapshot >= config.maxCommandsBetweenSnapshots ||
    input.elapsedMsSinceSnapshot >= config.maxElapsedMsBetweenSnapshots
  )
}

export function createWorkspaceSnapshotRecord(args: {
  workspaceId: string
  reason: WorkspaceSnapshotRecord["reason"]
  payload: Record<string, unknown>
  commandCount: number
}): WorkspaceSnapshotRecord {
  return {
    id: `snapshot:${crypto.randomUUID()}`,
    workspaceId: args.workspaceId,
    reason: args.reason,
    payload: args.payload,
    commandCount: args.commandCount,
    createdAt: new Date().toISOString()
  }
}

export async function saveWorkspaceSnapshot(snapshot: WorkspaceSnapshotRecord): Promise<void> {
  await persistenceRepository.saveWorkspaceSnapshot(snapshot)
}

export async function loadLatestWorkspaceSnapshot(workspaceId: string): Promise<WorkspaceSnapshotRecord | undefined> {
  const snapshots = await persistenceRepository.loadWorkspaceSnapshots(workspaceId)
  return snapshots[snapshots.length - 1]
}

export function createAdaptiveSnapshotScheduler(policy: SnapshotPolicyConfig = DEFAULT_SNAPSHOT_POLICY): AutosaveScheduler {
  let commandCountSinceSnapshot = 0
  let lastSnapshotAt = Date.now()
  let hasUnsavedChanges = false

  return {
    signalCommand: () => {
      commandCountSinceSnapshot += 1
      hasUnsavedChanges = true
    },
    shouldSnapshot: () =>
      shouldPersistAdaptiveSnapshot(
        {
          commandCountSinceSnapshot,
          elapsedMsSinceSnapshot: Date.now() - lastSnapshotAt,
          hasUnsavedChanges
        },
        policy
      ),
    markSnapshotSaved: () => {
      commandCountSinceSnapshot = 0
      hasUnsavedChanges = false
      lastSnapshotAt = Date.now()
    }
  }
}

export async function emitStructuredLocalLog(args: {
  domain: StructuredLogDomain
  eventType: string
  outcome: "ok" | "failed"
  metadata?: Record<string, unknown>
}): Promise<StructuredLocalLog> {
  const payload: StructuredLocalLog = {
    id: `log:${crypto.randomUUID()}`,
    domain: args.domain,
    eventType: args.eventType,
    outcome: args.outcome,
    timestamp: new Date().toISOString(),
    metadata: redactStructuredData(args.metadata ?? {}) as Record<string, unknown>
  }

  await persistenceRepository.putRecord(SETTINGS_STORE, {
    id: payload.id,
    value: payload
  })

  return payload
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
