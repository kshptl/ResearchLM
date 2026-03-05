"use client"

import React, { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
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
      <Card className="border-border">
        <CardContent className="p-3 text-xs text-slate-600">Select a node to inspect and edit details.</CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-border">
      <CardContent className="space-y-2 p-3">
      <p className="text-xs font-semibold">Inspector</p>
      <p className="text-xs text-slate-600">Node: {nodeId}</p>
      <Textarea
        value={draft}
        onChange={(event) => {
          const next = event.target.value
          setDraft(next)
          onChange(next)
        }}
        className="h-24 resize-none text-xs"
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
              <Button
                type="button"
                variant={semanticMode === "auto" ? "secondary" : "outline"}
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => onSemanticModeChange("auto")}
              >
                Auto
              </Button>
              <Button
                type="button"
                variant={semanticMode === "manual" ? "secondary" : "outline"}
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => onSemanticModeChange("manual")}
              >
                Manual
              </Button>
            </div>
          ) : null}
          {semanticMode === "manual" && onSemanticLevelChange ? (
            <div className="flex flex-wrap gap-2">
              {semanticLevels.map((level) => (
                <Button
                  key={level}
                  type="button"
                  variant={level === semanticLevel ? "secondary" : "outline"}
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => onSemanticLevelChange(level)}
                >
                  {level}
                </Button>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}
      </CardContent>
    </Card>
  )
}
