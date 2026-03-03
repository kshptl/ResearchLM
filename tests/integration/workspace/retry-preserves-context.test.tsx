import { describe, expect, it } from "vitest"
import { captureRetryContext, restoreRetryContext } from "@/features/generation/retry-context"
import { persistenceRepository } from "@/features/persistence/repository"

describe("retry preserves context", () => {
  it("restores unsaved selection and inspector draft state", () => {
    const snapshot = captureRetryContext({
      selectedNodeIds: ["n1", "n2"],
      selectedEdgeIds: ["e1"],
      inspectorActiveNodeId: "n2",
      inspectorDraft: "Draft inspector text"
    })

    const restored = restoreRetryContext(snapshot, {
      selectedNodeIds: [],
      selectedEdgeIds: [],
      inspectorActiveNodeId: null,
      inspectorDraft: ""
    })

    expect(restored.selectedNodeIds).toEqual(["n1", "n2"])
    expect(restored.selectedEdgeIds).toEqual(["e1"])
    expect(restored.inspectorActiveNodeId).toBe("n2")
    expect(restored.inspectorDraft).toBe("Draft inspector text")
  })

  it("persists retry snapshot references by request id", async () => {
    const snapshot = captureRetryContext({
      selectedNodeIds: ["n9"],
      selectedEdgeIds: ["e9"],
      inspectorActiveNodeId: "n9",
      inspectorDraft: "Retry draft"
    })

    await persistenceRepository.saveRetryContext({
      id: "retry-record-1",
      requestId: "request-1",
      workspaceId: "w1",
      snapshot,
      createdAt: new Date().toISOString()
    })

    const loaded = await persistenceRepository.loadRetryContext("request-1")
    expect(loaded?.snapshot.inspectorDraft).toBe("Retry draft")
    expect(loaded?.snapshot.selectedNodeIds).toEqual(["n9"])
  })
})
