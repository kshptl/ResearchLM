"use client"

import React from "react"

export type HistoryPanelEntry = {
  id: string
  label: string
}

type Props = {
  entries: HistoryPanelEntry[]
  canUndo: boolean
  canRedo: boolean
  onUndo: () => void
  onRedo: () => void
}

export function HistoryPanel({ entries, canUndo, canRedo, onUndo, onRedo }: Props) {
  return (
    <section className="rounded-md border border-[hsl(var(--border))] p-3" aria-label="Undo and redo history">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-semibold">History</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onUndo}
            disabled={!canUndo}
            className="rounded border px-2 py-1 text-xs disabled:opacity-50"
          >
            Undo
          </button>
          <button
            type="button"
            onClick={onRedo}
            disabled={!canRedo}
            className="rounded border px-2 py-1 text-xs disabled:opacity-50"
          >
            Redo
          </button>
        </div>
      </div>
      <ul className="max-h-32 space-y-1 overflow-auto text-xs text-slate-600">
        {entries.map((entry) => (
          <li key={entry.id}>{entry.label}</li>
        ))}
      </ul>
    </section>
  )
}
