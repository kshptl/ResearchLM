"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"

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
    <Card className="border-border" aria-label="Undo and redo history">
      <CardContent className="p-3">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-semibold">History</p>
        <div className="flex gap-2">
          <Button
            type="button"
            onClick={onUndo}
            disabled={!canUndo}
            variant="outline"
            size="sm"
            className="h-7 px-2 text-xs"
          >
            Undo
          </Button>
          <Button
            type="button"
            onClick={onRedo}
            disabled={!canRedo}
            variant="outline"
            size="sm"
            className="h-7 px-2 text-xs"
          >
            Redo
          </Button>
        </div>
      </div>
      <ScrollArea className="max-h-32">
        <ul className="space-y-1 text-xs text-slate-600">
          {entries.map((entry) => (
            <li key={entry.id}>{entry.label}</li>
          ))}
        </ul>
      </ScrollArea>
      </CardContent>
    </Card>
  )
}
