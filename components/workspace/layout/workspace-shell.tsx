import React from "react"
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

  return (
    <section className="grid min-h-[70vh] grid-cols-1 gap-4 lg:grid-cols-[280px_minmax(0,1fr)_320px]">
      <aside className={`${leftClass} workspace-pane rounded-md p-3`} aria-label="Hierarchy pane">
        {leftPane}
      </aside>
      <main className="workspace-pane rounded-md p-3" aria-label="Canvas pane">
        {centerPane}
      </main>
      <aside className={`${rightClass} workspace-pane rounded-md p-3`} aria-label="Inspector pane">
        {rightPane}
      </aside>
    </section>
  )
}
