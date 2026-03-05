import { beforeEach, describe, expect, it } from "vitest"
import { persistenceRepository } from "@/features/persistence/repository"
import { loadLatestWorkspaceSnapshot } from "@/features/persistence/workspace-persistence-service"

describe("workspace resume persistence", () => {
  beforeEach(async () => {
    await persistenceRepository.clearStore("snapshots")
    await persistenceRepository.clearStore("chatSessions")
    await persistenceRepository.clearStore("settings")
  })

  it("stores snapshots per chat id and resolves latest snapshot for resume", async () => {
    const now = new Date().toISOString()
    await persistenceRepository.saveWorkspaceSnapshot({
      id: "snapshot:1",
      workspaceId: "chat-1",
      reason: "autosave",
      commandCount: 1,
      createdAt: "2026-03-04T10:00:00.000Z",
      payload: { nodes: [] },
    })
    await persistenceRepository.saveWorkspaceSnapshot({
      id: "snapshot:2",
      workspaceId: "chat-1",
      reason: "autosave",
      commandCount: 2,
      createdAt: "2026-03-04T10:05:00.000Z",
      payload: { nodes: [{ id: "n1" }] },
    })
    await persistenceRepository.saveChatSession({
      id: "chat-1",
      workspaceId: "chat-1",
      title: "Resume Target",
      createdAt: now,
      updatedAt: now,
      lastOpenedAt: now,
      lastSnapshotAt: now,
      nodeCount: 1,
      edgeCount: 0,
      provider: "openai",
      model: "gpt-4o-mini",
    })

    const latest = await loadLatestWorkspaceSnapshot("chat-1")
    expect(latest?.id).toBe("snapshot:2")
    expect((latest?.payload as { nodes?: Array<{ id: string }> }).nodes?.[0]?.id).toBe("n1")
  })
})
