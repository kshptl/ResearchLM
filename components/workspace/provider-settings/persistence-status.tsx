"use client"

import React from "react"
import { Button } from "@/components/ui/button"

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
    <div className="mt-1.5 flex flex-wrap gap-1.5">
      <Button type="button" onClick={onSnapshotNow} variant="outline" size="sm" className="h-7 px-2 text-[11px]">
        Snapshot now
      </Button>
      <Button type="button" onClick={onExportBackup} variant="outline" size="sm" className="h-7 px-2 text-[11px]">
        Export backup
      </Button>
      <Button type="button" onClick={onImportBackup} variant="outline" size="sm" className="h-7 px-2 text-[11px]">
        Import backup
      </Button>
      <Button type="button" onClick={onSimulateConflict} variant="outline" size="sm" className="h-7 px-2 text-[11px]">
        Simulate conflict
      </Button>
    </div>
  )

  if (status === "idle") {
    return (
      <div>
        <p className="text-[11px] text-muted-foreground">Local persistence ready</p>
        {actions}
      </div>
    )
  }

  if (status === "saving") {
    return (
      <div>
        <p className="text-[11px] text-muted-foreground">Saving workspace...</p>
        {actions}
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center gap-1.5">
        <p className="text-[11px] text-destructive">Failed to save workspace</p>
        <Button type="button" onClick={onRetry} variant="outline" size="sm" className="h-7 px-2 text-[11px]">
          Retry
        </Button>
      </div>
      {actions}
    </div>
  )
}
