import type { Canvas, Connection, GraphNode, HierarchyLink, Workspace } from "@/features/graph-model/types"
import type { GenerationAttempt, LocalGenerationLog } from "@/features/generation/types"
import type { GeneratedSubtopicCandidate } from "@/features/hierarchy-model/state"
import type { ConflictEventRecord, RetryContextRecord, WorkspaceSnapshotRecord } from "@/features/persistence/repository"

type GenerationRequestRecord = {
  id: string
  provider: string
  model: string
  intent: string
  status: string
  createdAt: string
  updatedAt: string
}

export const DB_NAME = "sensecape"
export const DB_VERSION = 2

type Stores = {
  workspaces: Workspace
  canvases: Canvas
  nodes: GraphNode
  connections: Connection
  hierarchyLinks: HierarchyLink
  generatedSubtopicCandidates: GeneratedSubtopicCandidate
  snapshots: WorkspaceSnapshotRecord
  retryContexts: RetryContextRecord
  conflictEvents: ConflictEventRecord
  generationRequests: GenerationRequestRecord
  generationAttempts: GenerationAttempt
  localLogs: LocalGenerationLog
  settings: { id: string; value: unknown }
}

const STORE_NAMES: Array<keyof Stores> = [
  "workspaces",
  "canvases",
  "nodes",
  "connections",
  "hierarchyLinks",
  "generatedSubtopicCandidates",
  "snapshots",
  "retryContexts",
  "conflictEvents",
  "generationRequests",
  "generationAttempts",
  "localLogs",
  "settings"
]

export async function openDatabase(): Promise<IDBDatabase> {
  return await new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result
      for (const store of STORE_NAMES) {
        if (!db.objectStoreNames.contains(store)) {
          db.createObjectStore(store, { keyPath: "id" })
        }
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}
