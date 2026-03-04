import React, { useMemo } from "react"
import type { ReactNode } from "react"

type WorkspaceShellProps = {
  leftPane: ReactNode
  centerPane: ReactNode
  rightPane: ReactNode
  leftCollapsed?: boolean
  rightCollapsed?: boolean
}

export function WorkspaceShell({
  leftPane,
  centerPane,
  rightPane,
  leftCollapsed = false,
  rightCollapsed = false
}: WorkspaceShellProps) {
  const leftClass = leftCollapsed ? "hidden" : "block"
  const rightClass = rightCollapsed ? "hidden" : "block"

  const gridCols = useMemo(() => {
    if (leftCollapsed && rightCollapsed) return "lg:grid-cols-[minmax(0,1fr)]"
    if (leftCollapsed) return "lg:grid-cols-[minmax(0,1fr)_320px]"
    if (rightCollapsed) return "lg:grid-cols-[280px_minmax(0,1fr)]"
    return "lg:grid-cols-[280px_minmax(0,1fr)_320px]"
  }, [leftCollapsed, rightCollapsed])

  return (
    <section className={`grid h-[calc(100vh-6rem)] grid-cols-1 gap-4 ${gridCols}`}>
      <aside className={`${leftClass} workspace-pane rounded-md p-3`} aria-label="Hierarchy pane">
        {leftPane}
      </aside>
      <main className="workspace-pane flex flex-col overflow-hidden rounded-md" aria-label="Canvas pane">
        {centerPane}
      </main>
      <aside className={`${rightClass} workspace-pane rounded-md p-3`} aria-label="Inspector pane">
        {rightPane}
      </aside>
    </section>
  )
}
