import { describe, expect, it } from "vitest"
import { captureRetryContext, restoreRetryContext } from "@/features/generation/retry-context"

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
})
