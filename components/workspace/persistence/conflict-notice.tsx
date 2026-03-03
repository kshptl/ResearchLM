"use client"

import React from "react"
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
    <section
      className="space-y-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900"
      role="status"
      aria-live="polite"
    >
      <p className="font-semibold">Conflict detected for {conflict.entityType}</p>
      <p>
        Your workspace stays editable. We applied the <span className="font-medium">{conflict.resolution}</span> version for
        <span className="font-medium"> {conflict.entityId}</span>.
      </p>
      <p className="text-[11px] text-amber-800">{conflict.summary}</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={onRetrySync} className="rounded border border-amber-500 bg-white px-2 py-1">
          Retry sync
        </button>
        <button type="button" onClick={onOpenRecovery} className="rounded border border-amber-500 bg-white px-2 py-1">
          Open recovery options
        </button>
        <button type="button" onClick={onDismiss} className="rounded border border-amber-500 bg-white px-2 py-1">
          Dismiss notice
        </button>
      </div>
      <p className="text-[11px] text-amber-800">
        If this keeps happening, export a backup and compare recent snapshots before continuing edits.
      </p>
    </section>
  )
}
