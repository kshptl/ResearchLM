"use client"

import React from "react"
import type { SemanticLevel } from "@/features/graph-model/types"

type Props = {
  mode: "auto" | "manual"
  level: SemanticLevel
  resolvedLevel?: SemanticLevel
  onModeChange: (mode: "auto" | "manual") => void
  onLevelChange: (level: SemanticLevel) => void
}

const levels: SemanticLevel[] = ["all", "lines", "summary", "keywords"]

export function SemanticLevelSelector({ mode, level, resolvedLevel, onModeChange, onLevelChange }: Props) {
  const activeLevel = mode === "manual" ? level : resolvedLevel ?? level

  return (
    <div className="flex flex-wrap items-center gap-2" aria-label="Semantic detail controls">
      <button
        type="button"
        className={`rounded border px-2 py-1 text-xs ${mode === "auto" ? "bg-slate-200" : "bg-white"}`}
        aria-pressed={mode === "auto"}
        onClick={() => onModeChange("auto")}
      >
        Auto
      </button>
      <button
        type="button"
        className={`rounded border px-2 py-1 text-xs ${mode === "manual" ? "bg-slate-200" : "bg-white"}`}
        aria-pressed={mode === "manual"}
        onClick={() => onModeChange("manual")}
      >
        Manual
      </button>
      {mode === "manual"
        ? levels.map((semanticLevel) => (
            <button
              key={semanticLevel}
              type="button"
              aria-pressed={semanticLevel === level}
              className={`rounded border px-2 py-1 text-xs ${semanticLevel === level ? "bg-sky-100" : "bg-white"}`}
              onClick={() => onLevelChange(semanticLevel)}
            >
              {semanticLevel}
            </button>
          ))
        : null}
      <span className="rounded bg-slate-100 px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-slate-600">
        showing {activeLevel}
      </span>
    </div>
  )
}
