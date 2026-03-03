import { describe, expect, it } from "vitest"
import { hydrateWorkspaceRecord } from "@/features/persistence/workspace-persistence-service"
import { createBackupManifest, exportWorkspaceBackup, importWorkspaceBackup } from "@/features/persistence/workspace-backup"

describe("workspace hydration", () => {
  it("hydrates legacy workspace records with missing fields", () => {
    const hydrated = hydrateWorkspaceRecord({
      id: "w-legacy",
      title: "Legacy",
      activeCanvasId: "canvas-a"
    })

    expect(hydrated.rootCanvasId).toBe("canvas-a")
    expect(hydrated.activeCanvasId).toBe("canvas-a")
    expect(hydrated.version).toBe(1)
  })

  it("serializes and restores backup payload", () => {
    const backup = {
      version: 1,
      exportedAt: new Date().toISOString(),
      workspace: {
        id: "w1",
        title: "Workspace",
        rootCanvasId: "c1",
        activeCanvasId: "c1",
        version: 1,
        createdAt: "",
        updatedAt: ""
      },
      canvases: [],
      nodes: [],
      connections: [],
      hierarchyLinks: []
    }

    const withManifest = { ...backup, manifest: createBackupManifest(backup) }

    const hydrated = importWorkspaceBackup(exportWorkspaceBackup(withManifest))
    expect(hydrated.workspace.id).toBe("w1")
    expect(hydrated.manifest?.workspaceId).toBe("w1")
  })
})
