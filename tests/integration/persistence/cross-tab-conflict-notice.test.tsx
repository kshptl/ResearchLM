import { beforeEach, describe, expect, it } from "vitest"
import { persistenceRepository, type ConflictEventRecord } from "@/features/persistence/repository"

describe("conflict event persistence", () => {
  beforeEach(async () => {
    await persistenceRepository.clearStore("conflictEvents")
  })

  it("stores and loads conflict events ordered by creation time", async () => {
    const older: ConflictEventRecord = {
      id: "conflict:older",
      workspaceId: "chat-1",
      entityType: "canvas",
      entityId: "root",
      localUpdatedAt: "2026-03-04T10:00:00.000Z",
      remoteUpdatedAt: "2026-03-04T10:00:01.000Z",
      resolution: "remote",
      summary: "Older conflict",
      createdAt: "2026-03-04T10:00:02.000Z",
    }
    const newer: ConflictEventRecord = {
      ...older,
      id: "conflict:newer",
      summary: "Newer conflict",
      createdAt: "2026-03-04T10:00:03.000Z",
    }

    await persistenceRepository.saveConflictEvent(newer)
    await persistenceRepository.saveConflictEvent(older)

    const loaded = await persistenceRepository.loadConflictEvents("chat-1")
    expect(loaded).toHaveLength(2)
    expect(loaded[0]?.id).toBe("conflict:older")
    expect(loaded[1]?.id).toBe("conflict:newer")
  })
})
