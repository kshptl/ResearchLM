import React from "react"
import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { SubtopicCandidatePicker } from "@/components/workspace/hierarchy/subtopic-candidate-picker"
import { persistenceRepository } from "@/features/persistence/repository"
import type { GeneratedSubtopicCandidate } from "@/features/hierarchy-model/state"
import { setSubtopicCandidateLifecycle } from "@/features/hierarchy-model/state"

describe("generated subtopic selection", () => {
  it("updates candidate lifecycle and persists selected/dismissed state", async () => {
    const now = new Date().toISOString()
    let candidates: GeneratedSubtopicCandidate[] = [
      {
        id: "cand-1",
        workspaceId: "w1",
        parentCanvasId: "c1",
        label: "Transit policy",
        lifecycle: "presented" as const,
        createdAt: now,
        updatedAt: now
      }
    ]

    render(
      <SubtopicCandidatePicker
        candidates={candidates}
        onSelect={(candidateId) => {
          candidates = setSubtopicCandidateLifecycle(candidates, candidateId, "selected")
        }}
        onDismiss={(candidateId) => {
          candidates = setSubtopicCandidateLifecycle(candidates, candidateId, "dismissed")
        }}
      />
    )

    fireEvent.click(screen.getByRole("button", { name: "Select" }))
    expect(candidates[0].lifecycle).toBe("selected")
    await persistenceRepository.saveGeneratedSubtopicCandidate(candidates[0])

    candidates = setSubtopicCandidateLifecycle(candidates, "cand-1", "dismissed")
    await persistenceRepository.saveGeneratedSubtopicCandidate(candidates[0])

    const loaded = await persistenceRepository.loadGeneratedSubtopicCandidates("w1")
    expect(loaded).toHaveLength(1)
    expect(loaded[0].lifecycle).toBe("dismissed")
  })
})
