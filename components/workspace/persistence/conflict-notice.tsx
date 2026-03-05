"use client"

import React from "react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import type { ConflictEventRecord } from "@/features/persistence/repository"

type Props = {
  conflict: ConflictEventRecord | null
  onRetrySync: () => void
  onOpenRecovery: () => void
  onDismiss: () => void
}

export function ConflictNotice({ conflict, onRetrySync, onOpenRecovery, onDismiss }: Props) {
  if (!conflict) {
    return null
  }

  return (
    <Alert className="space-y-2 border-amber-300 bg-amber-50 text-amber-900" role="status" aria-live="polite">
      <AlertTitle className="text-xs font-semibold">Conflict detected for {conflict.entityType}</AlertTitle>
      <AlertDescription className="space-y-2 text-xs">
        <p>
          Your workspace stays editable. We applied the <span className="font-medium">{conflict.resolution}</span> version for
          <span className="font-medium"> {conflict.entityId}</span>.
        </p>
        <p className="text-[11px] text-amber-800">{conflict.summary}</p>
      </AlertDescription>
      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={onRetrySync} variant="outline" size="sm" className="h-7 border-amber-500 px-2 text-xs">
          Retry sync
        </Button>
        <Button type="button" onClick={onOpenRecovery} variant="outline" size="sm" className="h-7 border-amber-500 px-2 text-xs">
          Open recovery options
        </Button>
        <Button type="button" onClick={onDismiss} variant="outline" size="sm" className="h-7 border-amber-500 px-2 text-xs">
          Dismiss notice
        </Button>
      </div>
      <p className="text-[11px] text-amber-800">
        If this keeps happening, export a backup and compare recent snapshots before continuing edits.
      </p>
    </Alert>
  )
}
