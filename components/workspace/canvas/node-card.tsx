"use client"

import React from "react"
import { useEffect, useState } from "react"
import type { NodeType, SemanticLevel } from "@/features/graph-model/types"
import { getNodeVisualSpec } from "@/features/graph-model/node-visual-contract"
import { representationForLevel } from "@/features/semantic-levels/representation"

type Props = {
  id: string
  type: NodeType
  content: string
   semanticLevel?: SemanticLevel
   semanticMode?: "auto" | "manual"
  selected?: boolean
  onSelect?: (id: string) => void
  onChange: (id: string, content: string) => void
}

export function NodeCard({ id, type, content, semanticLevel = "all", semanticMode = "auto", selected, onSelect, onChange }: Props) {
  const [value, setValue] = useState(content)
  const visual = getNodeVisualSpec(type)
  const projected = representationForLevel(content, semanticLevel)
  const isEditable = semanticLevel === "all"

  useEffect(() => {
    setValue(content)
  }, [content, id])

  return (
    <article
      className={`w-72 rounded-md border p-3 shadow-sm ${visual.tokenClass} ${selected ? "ring-2 ring-sky-500" : ""}`}
      onClick={() => onSelect?.(id)}
    >
      <header className="mb-2 flex items-center gap-2 text-xs font-semibold">
        <span aria-hidden="true">{visual.icon}</span>
        <span>{visual.typeLabel}</span>
        <span className="ml-auto rounded bg-slate-100 px-1.5 py-0.5 text-[10px] uppercase text-slate-600">
          {semanticMode}:{semanticLevel}
        </span>
      </header>
      <textarea
        className="h-24 w-full resize-none border-none bg-transparent text-sm outline-none"
        value={isEditable ? value : projected}
        readOnly={!isEditable}
        aria-label="Node content"
        onChange={(event) => {
          if (!isEditable) {
            return
          }
          const next = event.target.value
          setValue(next)
          onChange(id, next)
        }}
      />
      {!isEditable ? <p className="mt-2 text-[10px] text-slate-500">Switch to full detail to edit this node.</p> : null}
    </article>
  )
}
