import React from "react"
import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { HierarchyView } from "@/components/workspace/hierarchy/hierarchy-view"
import type { NavigationState } from "@/features/hierarchy-model/navigation"
import { synchronizeHierarchySelection } from "@/features/hierarchy-model/navigation"

describe("hierarchy navigation sync", () => {
  it("keeps hierarchy and active canvas in sync on selection", () => {
    let navigation: NavigationState = { activeCanvasId: "c1" }
    const canvases = [
      { id: "c1", workspaceId: "w1", topic: "Root", depth: 0, createdAt: "", updatedAt: "" },
      { id: "c2", workspaceId: "w1", topic: "Child", depth: 1, parentCanvasId: "c1", createdAt: "", updatedAt: "" }
    ]

    render(
      <HierarchyView
        canvases={canvases}
        links={[]}
        activeCanvasId={navigation.activeCanvasId}
        onSelectCanvas={(id) => {
          navigation = synchronizeHierarchySelection(navigation, id)
        }}
      />
    )

    fireEvent.click(screen.getByRole("button", { name: /child/i }))

    expect(navigation.activeCanvasId).toBe("c2")
    expect(navigation.focusedHierarchyCanvasId).toBe("c2")
  })
})
