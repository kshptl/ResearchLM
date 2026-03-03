"use client"

import React from "react"
import type { Canvas, HierarchyLink } from "@/features/graph-model/types"

type Props = {
  canvases: Canvas[]
  links: HierarchyLink[]
  activeCanvasId: string
  onSelectCanvas: (id: string) => void
}

export function HierarchyView({ canvases, links, activeCanvasId, onSelectCanvas }: Props) {
  return (
    <aside className="space-y-2 rounded-md border border-[hsl(var(--border))] bg-white p-3">
      <p className="text-xs font-semibold uppercase tracking-wide">Hierarchy</p>
      <p className="text-xs text-slate-600">Links: {links.length}</p>
      <ul className="space-y-1">
        {canvases.map((canvas) => (
          <li key={canvas.id}>
            <button
              type="button"
              onClick={() => onSelectCanvas(canvas.id)}
              aria-current={activeCanvasId === canvas.id ? "page" : undefined}
              className={`w-full rounded px-2 py-1 text-left text-xs ${
                activeCanvasId === canvas.id ? "bg-sky-100" : "bg-slate-100"
              }`}
            >
              <span className="font-medium">{canvas.topic}</span>
              <span className="ml-2 text-[10px] text-slate-600">depth {canvas.depth}</span>
            </button>
          </li>
        ))}
      </ul>
    </aside>
  )
}
