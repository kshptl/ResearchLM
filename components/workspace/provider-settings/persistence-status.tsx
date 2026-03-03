"use client"

import React from "react"

type Props = {
  status: "idle" | "saving" | "error"
  onRetry: () => void
  onSnapshotNow?: () => void
  onExportBackup?: () => void
  onImportBackup?: () => void
  onSimulateConflict?: () => void
}

export function PersistenceStatus({
  status,
  onRetry,
  onSnapshotNow,
  onExportBackup,
  onImportBackup,
  onSimulateConflict
}: Props) {
  const actions = (
    <div className="mt-2 flex flex-wrap gap-2">
      <button type="button" onClick={onSnapshotNow} className="rounded border px-2 py-1 text-xs">
        Snapshot now
      </button>
      <button type="button" onClick={onExportBackup} className="rounded border px-2 py-1 text-xs">
        Export backup
      </button>
      <button type="button" onClick={onImportBackup} className="rounded border px-2 py-1 text-xs">
        Import backup
      </button>
      <button type="button" onClick={onSimulateConflict} className="rounded border px-2 py-1 text-xs">
        Simulate conflict
      </button>
    </div>
  )

  if (status === "idle") {
    return (
      <div>
        <p className="text-xs text-slate-500">Local persistence ready</p>
        {actions}
      </div>
    )
  }

  if (status === "saving") {
    return (
      <div>
        <p className="text-xs text-slate-500">Saving workspace...</p>
        {actions}
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center gap-2">
        <p className="text-xs text-red-600">Failed to save workspace</p>
        <button type="button" onClick={onRetry} className="rounded border px-2 py-1 text-xs">
          Retry
        </button>
      </div>
      {actions}
    </div>
  )
}
