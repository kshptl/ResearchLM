"use client"

import React from "react"
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
    <section className="space-y-2 rounded-md border border-[hsl(var(--border))] bg-white p-3">
      <h3 className="text-xs font-semibold uppercase tracking-wide">Generated subtopics</h3>
      <ul className="space-y-2">
        {candidates.map((candidate) => (
          <li key={candidate.id} className="rounded border border-slate-200 p-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm text-slate-900">{candidate.label}</p>
              <span className={`rounded px-2 py-0.5 text-[10px] font-semibold uppercase ${badgeForLifecycle(candidate.lifecycle)}`}>
                {candidate.lifecycle}
              </span>
            </div>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                className="rounded border px-2 py-1 text-xs"
                onClick={() => onSelect(candidate.id)}
                disabled={candidate.lifecycle === "selected"}
              >
                Select
              </button>
              <button
                type="button"
                className="rounded border px-2 py-1 text-xs"
                onClick={() => onDismiss(candidate.id)}
                disabled={candidate.lifecycle === "dismissed"}
              >
                Dismiss
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
