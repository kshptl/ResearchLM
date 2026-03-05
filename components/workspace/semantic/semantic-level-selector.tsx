"use client"

import React from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
      <Button
        type="button"
        variant={mode === "auto" ? "secondary" : "outline"}
        size="sm"
        className="h-7 px-2 text-xs"
        aria-pressed={mode === "auto"}
        onClick={() => onModeChange("auto")}
      >
        Auto
      </Button>
      <Button
        type="button"
        variant={mode === "manual" ? "secondary" : "outline"}
        size="sm"
        className="h-7 px-2 text-xs"
        aria-pressed={mode === "manual"}
        onClick={() => onModeChange("manual")}
      >
        Manual
      </Button>
      {mode === "manual"
        ? levels.map((semanticLevel) => (
            <Button
              key={semanticLevel}
              type="button"
              aria-pressed={semanticLevel === level}
              variant={semanticLevel === level ? "secondary" : "outline"}
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => onLevelChange(semanticLevel)}
            >
              {semanticLevel}
            </Button>
          ))
        : null}
      <Badge variant="secondary" className="px-2 py-1 text-[10px] uppercase tracking-wide text-slate-600">
        showing {activeLevel}
      </Badge>
    </div>
  )
}
