export interface CrossTabMutation {
  id: string
  workspaceId: string
  entityType: string
  entityId: string
  updatedAt: string
  tabId: string
  payload: Record<string, unknown>
  references?: string[]
}

export interface CrossTabConflict {
  workspaceId: string
  entityType: string
  entityId: string
  localUpdatedAt: string
  remoteUpdatedAt: string
  resolution: "local" | "remote"
  summary: string
}

export interface CrossTabReconcileResult {
  entities: Map<string, CrossTabMutation>
  applied: CrossTabMutation[]
  conflicts: CrossTabConflict[]
}

function mutationKey(mutation: CrossTabMutation): string {
  return `${mutation.entityType}:${mutation.entityId}`
}

function compareMutations(left: CrossTabMutation, right: CrossTabMutation): number {
  const time = left.updatedAt.localeCompare(right.updatedAt)
  if (time !== 0) {
    return time
  }

  const entity = mutationKey(left).localeCompare(mutationKey(right))
  if (entity !== 0) {
    return entity
  }

  const tab = left.tabId.localeCompare(right.tabId)
  if (tab !== 0) {
    return tab
  }

  return left.id.localeCompare(right.id)
}

function hasMissingReferences(
  mutation: CrossTabMutation,
  state: Map<string, CrossTabMutation>
): string[] {
  const references = mutation.references ?? []
  return references.filter((reference) => !state.has(reference))
}

function shouldReplaceCurrent(current: CrossTabMutation, incoming: CrossTabMutation): boolean {
  if (incoming.updatedAt > current.updatedAt) {
    return true
  }
  if (incoming.updatedAt < current.updatedAt) {
    return false
  }

  const tieBreak = incoming.tabId.localeCompare(current.tabId)
  if (tieBreak > 0) {
    return true
  }
  if (tieBreak < 0) {
    return false
  }

  return incoming.id.localeCompare(current.id) > 0
}

export function reconcileCrossTabMutations(
  existing: Iterable<CrossTabMutation>,
  incoming: CrossTabMutation[]
): CrossTabReconcileResult {
  const entities = new Map<string, CrossTabMutation>()
  for (const entry of existing) {
    entities.set(mutationKey(entry), entry)
  }

  const applied: CrossTabMutation[] = []
  const conflicts: CrossTabConflict[] = []

  for (const mutation of [...incoming].sort(compareMutations)) {
    const key = mutationKey(mutation)
    const current = entities.get(key)

    const missingReferences = hasMissingReferences(mutation, entities)
    if (missingReferences.length > 0) {
      conflicts.push({
        workspaceId: mutation.workspaceId,
        entityType: mutation.entityType,
        entityId: mutation.entityId,
        localUpdatedAt: current?.updatedAt ?? mutation.updatedAt,
        remoteUpdatedAt: mutation.updatedAt,
        resolution: "local",
        summary: `Skipped update due to missing references: ${missingReferences.join(", ")}`
      })
      continue
    }

    if (!current || shouldReplaceCurrent(current, mutation)) {
      entities.set(key, mutation)
      applied.push(mutation)
      if (current && current.updatedAt === mutation.updatedAt && current.tabId !== mutation.tabId) {
        conflicts.push({
          workspaceId: mutation.workspaceId,
          entityType: mutation.entityType,
          entityId: mutation.entityId,
          localUpdatedAt: current.updatedAt,
          remoteUpdatedAt: mutation.updatedAt,
          resolution: "remote",
          summary: "Resolved same-timestamp conflict with deterministic tab-id tie-break"
        })
      }
      continue
    }

    conflicts.push({
      workspaceId: mutation.workspaceId,
      entityType: mutation.entityType,
      entityId: mutation.entityId,
      localUpdatedAt: current.updatedAt,
      remoteUpdatedAt: mutation.updatedAt,
      resolution: "local",
      summary: "Ignored stale remote update"
    })
  }

  return {
    entities,
    applied,
    conflicts
  }
}

export function createCrossTabChannel(
  channelName: string,
  onMessage: (message: CrossTabMutation) => void
): { post: (message: CrossTabMutation) => void; close: () => void } {
  if (typeof BroadcastChannel === "undefined") {
    return {
      post: () => {
        return
      },
      close: () => {
        return
      }
    }
  }

  const channel = new BroadcastChannel(channelName)
  channel.onmessage = (event) => {
    onMessage(event.data as CrossTabMutation)
  }

  return {
    post: (message) => channel.postMessage(message),
    close: () => channel.close()
  }
}
