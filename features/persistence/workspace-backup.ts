import type { Canvas, Connection, GraphNode, HierarchyLink, Workspace } from "@/features/graph-model/types"
import { runIntentTransaction } from "@/lib/idb/transactions"

type BackupEntityChecksums = {
  workspace: string
  canvases: string
  nodes: string
  connections: string
  hierarchyLinks: string
}

type BackupEntityCounts = {
  canvases: number
  nodes: number
  connections: number
  hierarchyLinks: number
}

export interface BackupManifest {
  schemaVersion: number
  exportedAt: string
  workspaceId: string
  checksums: BackupEntityChecksums
  counts: BackupEntityCounts
}

export interface WorkspaceBackup {
  version: number
  exportedAt: string
  manifest?: BackupManifest
  workspace: Workspace
  canvases: Canvas[]
  nodes: GraphNode[]
  connections: Connection[]
  hierarchyLinks: HierarchyLink[]
}

export interface BackupRestoreSummary {
  partial: boolean
  restoredCounts: BackupEntityCounts
  expectedCounts: BackupEntityCounts
  message: string
}

function stableSerialize(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableSerialize(item)).join(",")}]`
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>
    const keys = Object.keys(record).sort()
    return `{${keys.map((key) => `${JSON.stringify(key)}:${stableSerialize(record[key])}`).join(",")}}`
  }

  return JSON.stringify(value)
}

function checksumFor(value: unknown): string {
  const text = stableSerialize(value)
  let hash = 0
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash * 31 + text.charCodeAt(index)) >>> 0
  }
  return hash.toString(16).padStart(8, "0")
}

export function createBackupManifest(backup: WorkspaceBackup): BackupManifest {
  return {
    schemaVersion: backup.version,
    exportedAt: backup.exportedAt,
    workspaceId: backup.workspace.id,
    checksums: {
      workspace: checksumFor(backup.workspace),
      canvases: checksumFor(backup.canvases),
      nodes: checksumFor(backup.nodes),
      connections: checksumFor(backup.connections),
      hierarchyLinks: checksumFor(backup.hierarchyLinks)
    },
    counts: {
      canvases: backup.canvases.length,
      nodes: backup.nodes.length,
      connections: backup.connections.length,
      hierarchyLinks: backup.hierarchyLinks.length
    }
  }
}

export function validateBackupManifest(backup: WorkspaceBackup): { valid: boolean; errors: string[] } {
  const manifest = backup.manifest
  if (!manifest) {
    return { valid: false, errors: ["Missing backup manifest"] }
  }

  const errors: string[] = []
  if (manifest.workspaceId !== backup.workspace.id) {
    errors.push("Manifest workspace id mismatch")
  }

  const recalculated = createBackupManifest(backup)
  for (const key of Object.keys(recalculated.checksums) as Array<keyof BackupEntityChecksums>) {
    if (manifest.checksums[key] !== recalculated.checksums[key]) {
      errors.push(`Checksum mismatch for ${key}`)
    }
  }

  for (const key of Object.keys(recalculated.counts) as Array<keyof BackupEntityCounts>) {
    if (manifest.counts[key] !== recalculated.counts[key]) {
      errors.push(`Count mismatch for ${key}`)
    }
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

export function exportWorkspaceBackup(backup: WorkspaceBackup): string {
  const manifest = createBackupManifest(backup)
  return JSON.stringify({ ...backup, manifest })
}

export async function restoreWorkspaceBackup(backup: WorkspaceBackup): Promise<void> {
  if (typeof indexedDB === "undefined") {
    return
  }

  await runIntentTransaction(["workspaces", "canvases", "nodes", "connections", "hierarchyLinks"], (tx) => {
    tx.objectStore("workspaces").put(backup.workspace)
    const canvasesStore = tx.objectStore("canvases")
    for (const canvas of backup.canvases) {
      canvasesStore.put(canvas)
    }
    const nodesStore = tx.objectStore("nodes")
    for (const node of backup.nodes) {
      nodesStore.put(node)
    }
    const connectionsStore = tx.objectStore("connections")
    for (const connection of backup.connections) {
      connectionsStore.put(connection)
    }
    const hierarchyStore = tx.objectStore("hierarchyLinks")
    for (const link of backup.hierarchyLinks) {
      hierarchyStore.put(link)
    }
  })
}

export function importWorkspaceBackup(serialized: string): WorkspaceBackup {
  const parsed = JSON.parse(serialized) as WorkspaceBackup
  if (!parsed.workspace?.id) {
    throw new Error("Invalid backup payload")
  }

  const withManifest = {
    ...parsed,
    manifest: parsed.manifest ?? createBackupManifest(parsed)
  }

  const validation = validateBackupManifest(withManifest)
  if (!validation.valid) {
    throw new Error(`Invalid backup manifest: ${validation.errors.join("; ")}`)
  }

  return withManifest
}

export function summarizeBackupRestore(backup: WorkspaceBackup, restoredCounts: BackupEntityCounts): BackupRestoreSummary {
  const expectedCounts = {
    canvases: backup.canvases.length,
    nodes: backup.nodes.length,
    connections: backup.connections.length,
    hierarchyLinks: backup.hierarchyLinks.length
  }

  const partial =
    restoredCounts.canvases < expectedCounts.canvases ||
    restoredCounts.nodes < expectedCounts.nodes ||
    restoredCounts.connections < expectedCounts.connections ||
    restoredCounts.hierarchyLinks < expectedCounts.hierarchyLinks

  const message = partial
    ? "Restore completed with partial data. Review skipped entities before continuing."
    : "Restore completed successfully."

  return {
    partial,
    restoredCounts,
    expectedCounts,
    message
  }
}
