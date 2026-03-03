"use client"

import React, { useEffect, useState } from "react"
import type { SemanticLevel } from "@/features/graph-model/types"

type Props = {
  nodeId: string | null
  content: string
  onChange: (next: string) => void
  semanticMode?: "auto" | "manual"
  semanticLevel?: SemanticLevel
  onSemanticModeChange?: (mode: "auto" | "manual") => void
  onSemanticLevelChange?: (level: SemanticLevel) => void
}

const semanticLevels: SemanticLevel[] = ["all", "lines", "summary", "keywords"]

export function InspectorPanel({
  nodeId,
  content,
  onChange,
  semanticMode,
  semanticLevel,
  onSemanticModeChange,
  onSemanticLevelChange
}: Props) {
  const [draft, setDraft] = useState(content)

  useEffect(() => {
    setDraft(content)
  }, [content, nodeId])

  if (!nodeId) {
    return (
      <aside className="rounded-md border border-[hsl(var(--border))] p-3 text-xs text-slate-600">
        Select a node to inspect and edit details.
      </aside>
    )
  }

  return (
    <aside className="space-y-2 rounded-md border border-[hsl(var(--border))] p-3">
      <p className="text-xs font-semibold">Inspector</p>
      <p className="text-xs text-slate-600">Node: {nodeId}</p>
      <textarea
        value={draft}
        onChange={(event) => {
          const next = event.target.value
          setDraft(next)
          onChange(next)
        }}
        className="h-24 w-full resize-none rounded border p-2 text-xs"
      />
      {semanticMode && semanticLevel ? (
        <section className="space-y-2 rounded border border-slate-200 p-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-600">Semantic context</p>
          <p className="text-xs text-slate-600">
            Node {nodeId} is displayed in <span className="font-medium">{semanticMode}</span> mode at
            <span className="font-medium"> {semanticLevel}</span> detail.
          </p>
          {onSemanticModeChange ? (
            <div className="flex gap-2">
              <button
                type="button"
                className={`rounded border px-2 py-1 text-xs ${semanticMode === "auto" ? "bg-slate-200" : "bg-white"}`}
                onClick={() => onSemanticModeChange("auto")}
              >
                Auto
              </button>
              <button
                type="button"
                className={`rounded border px-2 py-1 text-xs ${semanticMode === "manual" ? "bg-slate-200" : "bg-white"}`}
                onClick={() => onSemanticModeChange("manual")}
              >
                Manual
              </button>
            </div>
          ) : null}
          {semanticMode === "manual" && onSemanticLevelChange ? (
            <div className="flex flex-wrap gap-2">
              {semanticLevels.map((level) => (
                <button
                  key={level}
                  type="button"
                  className={`rounded border px-2 py-1 text-xs ${level === semanticLevel ? "bg-sky-100" : "bg-white"}`}
                  onClick={() => onSemanticLevelChange(level)}
                >
                  {level}
                </button>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}
    </aside>
  )
}
