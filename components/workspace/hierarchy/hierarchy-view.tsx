"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { Canvas, HierarchyLink } from "@/features/graph-model/types"

type Props = {
  canvases: Canvas[]
  links: HierarchyLink[]
  activeCanvasId: string
  onSelectCanvas: (id: string) => void
}

export function HierarchyView({ canvases, links, activeCanvasId, onSelectCanvas }: Props) {
  return (
    <Card className="border-border">
      <CardHeader className="space-y-1 p-3">
        <CardTitle className="text-xs uppercase tracking-wide">Hierarchy</CardTitle>
        <p className="text-xs text-slate-600">Links: {links.length}</p>
      </CardHeader>
      <CardContent className="p-3 pt-0">
      <ul className="space-y-1">
        {canvases.map((canvas) => (
          <li key={canvas.id}>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onSelectCanvas(canvas.id)}
              aria-current={activeCanvasId === canvas.id ? "page" : undefined}
              className={`w-full rounded px-2 py-1 text-left text-xs ${
                activeCanvasId === canvas.id ? "bg-sky-100" : "bg-slate-100"
              }`}
            >
              <span className="font-medium">{canvas.topic}</span>
              <span className="ml-2 text-[10px] text-slate-600">depth {canvas.depth}</span>
            </Button>
          </li>
        ))}
      </ul>
      </CardContent>
    </Card>
  )
}
