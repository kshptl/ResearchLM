"use client"

import React from "react"
import type { SemanticLevel } from "@/features/graph-model/types"
import type { SemanticBreakpoints } from "@/features/semantic-levels/state"

type Props = {
  mode: "auto" | "manual"
  resolvedLevel: SemanticLevel
  zoom: number
  breakpoints: SemanticBreakpoints
}

export function SemanticLegend({ mode, resolvedLevel, zoom, breakpoints }: Props) {
  return (
    <section className="rounded-md border border-[hsl(var(--border))] bg-slate-50 p-2 text-xs text-slate-700">
      <p className="font-semibold">Semantic detail</p>
      <p>
        Mode: <span className="font-medium">{mode}</span> · active level: <span className="font-medium">{resolvedLevel}</span>
      </p>
      <p>Zoom: {zoom.toFixed(1)}x</p>
      <p>
        Auto thresholds: keywords &lt; {breakpoints.keywordsMaxZoom.toFixed(2)}, summary &lt; {breakpoints.summaryMaxZoom.toFixed(2)}, lines
        &lt; {breakpoints.linesMaxZoom.toFixed(2)}, else all
      </p>
    </section>
  )
}
