import {
  persistenceRepository,
  type ConflictEventRecord
} from "@/features/persistence/repository"
import type { CrossTabConflict } from "@/features/persistence/cross-tab-sync"

function conflictDedupKey(event: ConflictEventRecord): string {
  return [
    event.workspaceId,
    event.entityType,
    event.entityId,
    event.localUpdatedAt,
    event.remoteUpdatedAt,
    event.resolution
  ].join(":")
}

export function dedupeConflictEvents(events: ConflictEventRecord[]): ConflictEventRecord[] {
  const seen = new Set<string>()
  const deduped: ConflictEventRecord[] = []

  for (const event of events) {
    const key = conflictDedupKey(event)
    if (seen.has(key)) {
      continue
    }
    seen.add(key)
    deduped.push(event)
  }

  return deduped.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
}

export function conflictFromSync(conflict: CrossTabConflict): ConflictEventRecord {
  return {
    id: `conflict:${crypto.randomUUID()}`,
    workspaceId: conflict.workspaceId,
    entityType: conflict.entityType,
    entityId: conflict.entityId,
    localUpdatedAt: conflict.localUpdatedAt,
    remoteUpdatedAt: conflict.remoteUpdatedAt,
    resolution: conflict.resolution,
    summary: conflict.summary,
    createdAt: new Date().toISOString()
  }
}

export async function persistConflictEvents(events: ConflictEventRecord[]): Promise<ConflictEventRecord[]> {
  const deduped = dedupeConflictEvents(events)
  for (const event of deduped) {
    await persistenceRepository.saveConflictEvent(event)
  }
  return deduped
}

export async function loadConflictEvents(workspaceId: string): Promise<ConflictEventRecord[]> {
  const events = await persistenceRepository.loadConflictEvents(workspaceId)
  return dedupeConflictEvents(events)
}
