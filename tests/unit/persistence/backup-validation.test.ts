import { describe, expect, it } from "vitest"
import {
  createBackupManifest,
  exportWorkspaceBackup,
  importWorkspaceBackup,
  validateBackupManifest
} from "@/features/persistence/workspace-backup"

describe("backup validation", () => {
  function baselineBackup() {
    const now = new Date().toISOString()
    const backup = {
      version: 1,
      exportedAt: now,
      workspace: {
        id: "w1",
        title: "Workspace",
        rootCanvasId: "c1",
        activeCanvasId: "c1",
        version: 1,
        createdAt: now,
        updatedAt: now
      },
      canvases: [{ id: "c1", workspaceId: "w1", topic: "Root", depth: 0, createdAt: now, updatedAt: now }],
      nodes: [],
      connections: [],
      hierarchyLinks: []
    }

    return {
      ...backup,
      manifest: createBackupManifest(backup)
    }
  }

  it("accepts valid backup manifest", () => {
    const backup = baselineBackup()
    const validation = validateBackupManifest(backup)
    expect(validation.valid).toBe(true)
    expect(validation.errors).toHaveLength(0)
  })

  it("rejects backup payload when checksum mismatches", () => {
    const backup = baselineBackup()
    backup.canvases[0].topic = "Tampered"

    const validation = validateBackupManifest(backup)
    expect(validation.valid).toBe(false)
    expect(validation.errors.join(" ")).toContain("Checksum mismatch")
  })

  it("throws while importing invalid manifest", () => {
    const backup = baselineBackup()
    const serialized = exportWorkspaceBackup(backup)
    const parsed = JSON.parse(serialized) as typeof backup
    parsed.manifest!.checksums.nodes = "deadbeef"

    expect(() => importWorkspaceBackup(JSON.stringify(parsed))).toThrow(/Invalid backup manifest/i)
  })
})
