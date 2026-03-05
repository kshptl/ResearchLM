"use client"

import React from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { GeneratedSubtopicCandidate } from "@/features/hierarchy-model/state"

type Props = {
  candidates: GeneratedSubtopicCandidate[]
  onSelect: (candidateId: string) => void
  onDismiss: (candidateId: string) => void
}

function badgeForLifecycle(lifecycle: GeneratedSubtopicCandidate["lifecycle"]): string {
  switch (lifecycle) {
    case "selected":
      return "bg-emerald-100 text-emerald-700"
    case "dismissed":
      return "bg-slate-200 text-slate-600"
    case "pending":
      return "bg-amber-100 text-amber-700"
    default:
      return "bg-sky-100 text-sky-700"
  }
}

export function SubtopicCandidatePicker({ candidates, onSelect, onDismiss }: Props) {
  return (
    <Card className="border-border">
      <CardHeader className="p-3">
        <CardTitle className="text-xs uppercase tracking-wide">Generated subtopics</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 p-3 pt-0">
      <ul className="space-y-2">
        {candidates.map((candidate) => (
          <li key={candidate.id} className="rounded border border-slate-200 p-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm text-slate-900">{candidate.label}</p>
              <Badge className={`text-[10px] uppercase ${badgeForLifecycle(candidate.lifecycle)}`}>
                {candidate.lifecycle}
              </Badge>
            </div>
            <div className="mt-2 flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => onSelect(candidate.id)}
                disabled={candidate.lifecycle === "selected"}
              >
                Select
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => onDismiss(candidate.id)}
                disabled={candidate.lifecycle === "dismissed"}
              >
                Dismiss
              </Button>
            </div>
          </li>
        ))}
      </ul>
      </CardContent>
    </Card>
  )
}
