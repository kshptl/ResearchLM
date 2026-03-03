import { openDatabase } from "@/lib/idb/database"
import type { GenerationAttempt, LocalGenerationLog } from "@/features/generation/types"
import type { HierarchyLink } from "@/features/graph-model/types"
import type { RetryContextSnapshot } from "@/features/generation/retry-context"
import type { GeneratedSubtopicCandidate } from "@/features/hierarchy-model/state"

type GenerationRequestRecord = {
  id: string
  provider: string
  model: string
  intent: string
  status: string
  createdAt: string
  updatedAt: string
}

export type WorkspaceSnapshotRecord = {
  id: string
  workspaceId: string
  reason: "autosave" | "manual" | "before-import"
  payload: Record<string, unknown>
  commandCount: number
  createdAt: string
}

export type RetryContextRecord = {
  id: string
  requestId: string
  workspaceId: string
  snapshot: RetryContextSnapshot
  createdAt: string
}

export type ConflictEventRecord = {
  id: string
  workspaceId: string
  entityType: string
  entityId: string
  localUpdatedAt: string
  remoteUpdatedAt: string
  resolution: "local" | "remote"
  summary: string
  createdAt: string
}

const memoryFallback = new Map<string, Map<string, unknown>>()

function getFallbackStore(storeName: string): Map<string, unknown> {
  let store = memoryFallback.get(storeName)
  if (!store) {
    store = new Map<string, unknown>()
    memoryFallback.set(storeName, store)
  }
  return store
}

async function putRecord<T extends { id: string }>(storeName: string, record: T): Promise<void> {
  if (typeof indexedDB === "undefined") {
    getFallbackStore(storeName).set(record.id, record)
    return
  }

  const db = await openDatabase()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite")
    tx.objectStore(storeName).put(record)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

async function getRecord<T>(storeName: string, id: string): Promise<T | undefined> {
  if (typeof indexedDB === "undefined") {
    return getFallbackStore(storeName).get(id) as T | undefined
  }

  const db = await openDatabase()
  return await new Promise<T | undefined>((resolve, reject) => {
    const tx = db.transaction(storeName, "readonly")
    const req = tx.objectStore(storeName).get(id)
    req.onsuccess = () => resolve(req.result as T | undefined)
    req.onerror = () => reject(req.error)
  })
}

async function getAllRecords<T>(storeName: string): Promise<T[]> {
  if (typeof indexedDB === "undefined") {
    return [...getFallbackStore(storeName).values()] as T[]
  }

  const db = await openDatabase()
  return await new Promise<T[]>((resolve, reject) => {
    const tx = db.transaction(storeName, "readonly")
    const req = tx.objectStore(storeName).getAll()
    req.onsuccess = () => resolve((req.result ?? []) as T[])
    req.onerror = () => reject(req.error)
  })
}

async function deleteRecord(storeName: string, id: string): Promise<void> {
  if (typeof indexedDB === "undefined") {
    getFallbackStore(storeName).delete(id)
    return
  }

  const db = await openDatabase()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite")
    tx.objectStore(storeName).delete(id)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

async function clearStore(storeName: string): Promise<void> {
  if (typeof indexedDB === "undefined") {
    getFallbackStore(storeName).clear()
    return
  }

  const db = await openDatabase()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite")
    tx.objectStore(storeName).clear()
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export const persistenceRepository = {
  putRecord,
  getRecord,
  getAllRecords,
  deleteRecord,
  clearStore,
  async saveGenerationRequest(record: GenerationRequestRecord): Promise<void> {
    await putRecord("generationRequests", record)
  },
  async saveGenerationAttempt(record: GenerationAttempt): Promise<void> {
    await putRecord("generationAttempts", record)
  },
  async saveLocalGenerationLog(record: LocalGenerationLog): Promise<void> {
    await putRecord("localLogs", record)
  },
  async saveHierarchyLink(record: HierarchyLink): Promise<void> {
    await putRecord("hierarchyLinks", record)
  },
  async loadHierarchyLinks(workspaceId: string): Promise<HierarchyLink[]> {
    const all = await getAllRecords<HierarchyLink>("hierarchyLinks")
    return all.filter((link) => link.workspaceId === workspaceId)
  },
  async saveGeneratedSubtopicCandidate(record: GeneratedSubtopicCandidate): Promise<void> {
    await putRecord("generatedSubtopicCandidates", record)
  },
  async loadGeneratedSubtopicCandidates(workspaceId: string): Promise<GeneratedSubtopicCandidate[]> {
    const all = await getAllRecords<GeneratedSubtopicCandidate>("generatedSubtopicCandidates")
    return all.filter((candidate) => candidate.workspaceId === workspaceId)
  },
  async saveWorkspaceSnapshot(record: WorkspaceSnapshotRecord): Promise<void> {
    await putRecord("snapshots", record)
  },
  async loadWorkspaceSnapshots(workspaceId: string): Promise<WorkspaceSnapshotRecord[]> {
    const all = await getAllRecords<WorkspaceSnapshotRecord>("snapshots")
    return all
      .filter((snapshot) => snapshot.workspaceId === workspaceId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  },
  async saveRetryContext(record: RetryContextRecord): Promise<void> {
    await putRecord("retryContexts", record)
  },
  async loadRetryContext(requestId: string): Promise<RetryContextRecord | undefined> {
    const all = await getAllRecords<RetryContextRecord>("retryContexts")
    return all.find((entry) => entry.requestId === requestId)
  },
  async saveConflictEvent(record: ConflictEventRecord): Promise<void> {
    await putRecord("conflictEvents", record)
  },
  async loadConflictEvents(workspaceId: string): Promise<ConflictEventRecord[]> {
    const all = await getAllRecords<ConflictEventRecord>("conflictEvents")
    return all
      .filter((event) => event.workspaceId === workspaceId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  }
}
