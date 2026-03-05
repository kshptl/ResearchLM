import "@/tests/helpers/mock-react-flow"
import React from "react"
import { render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it } from "vitest"
import WorkspacePage from "@/app/(workspace)/page"
import { persistenceRepository } from "@/features/persistence/repository"

describe("workspace startup chat chooser", () => {
  beforeEach(async () => {
    await persistenceRepository.clearStore("snapshots")
    await persistenceRepository.clearStore("chatSessions")
    await persistenceRepository.clearStore("settings")
  })

  it("shows recent chat list when persisted sessions exist", async () => {
    const now = new Date().toISOString()
    await persistenceRepository.saveChatSession({
      id: "chat-a",
      workspaceId: "chat-a",
      title: "Recent Chat A",
      createdAt: now,
      updatedAt: now,
      lastOpenedAt: now,
      lastSnapshotAt: now,
      nodeCount: 2,
      edgeCount: 1,
      provider: "openai",
      model: "gpt-4o-mini",
    })
    await persistenceRepository.saveChatSession({
      id: "chat-b",
      workspaceId: "chat-b",
      title: "Recent Chat B",
      createdAt: now,
      updatedAt: now,
      lastOpenedAt: now,
      lastSnapshotAt: now,
      nodeCount: 4,
      edgeCount: 3,
      provider: "anthropic",
      model: "claude-3-5-sonnet-latest",
    })

    render(<WorkspacePage />)

    await waitFor(() => {
      expect(screen.getByText("Resume chat")).toBeInTheDocument()
      expect(screen.getByText("Recent Chat A")).toBeInTheDocument()
      expect(screen.getByText("Recent Chat B")).toBeInTheDocument()
    })
  })
})
