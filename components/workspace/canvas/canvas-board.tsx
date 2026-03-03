"use client"

import React from "react"
import { useEffect, useMemo, useState } from "react"
import { ExpandActions } from "@/components/workspace/canvas/expand-actions"
import { HistoryPanel } from "@/components/workspace/canvas/history-panel"
import { NodeCard } from "@/components/workspace/canvas/node-card"
import { SemanticLegend } from "@/components/workspace/canvas/semantic-legend"
import { SemanticLevelSelector } from "@/components/workspace/semantic/semantic-level-selector"
import { useGeneration } from "@/features/generation/use-generation"
import { transitionMode, type InteractionMode } from "@/features/graph-model/interaction-mode"
import {
  applyLassoSelection,
  createSelectionState,
  toggleNodeSelection,
  type SelectionState
} from "@/features/graph-model/selection-state"
import { extractTextToNode } from "@/features/graph-model/text-extraction"
import type { GraphNode } from "@/features/graph-model/types"
import { loadSemanticViewState, saveSemanticViewState } from "@/features/persistence/semantic-view-repository"
import { emitSemanticStateLifecycleLog } from "@/features/persistence/workspace-persistence-service"
import {
  DEFAULT_SEMANTIC_BREAKPOINTS,
  resolveSemanticLevel,
  setManualLevel,
  setSemanticMode,
  type SemanticState
} from "@/features/semantic-levels/state"

function createSeedNode(): GraphNode {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    workspaceId: "local-workspace",
    canvasId: "root",
    type: "topic",
    content: "Moving to San Francisco",
    position: { x: 0, y: 0 },
    createdAt: now,
    updatedAt: now
  }
}

export function CanvasBoard() {
  const workspaceId = "local-workspace"
  const canvasId = "root"
  const [nodes, setNodes] = useState<GraphNode[]>([createSeedNode()])
  const [selection, setSelection] = useState<SelectionState>(createSelectionState())
  const [mode, setMode] = useState<InteractionMode>("select")
  const [zoom, setZoom] = useState(1)
  const [semanticState, setSemanticStateValue] = useState<SemanticState>({
    mode: "auto",
    level: "all",
    breakpoints: DEFAULT_SEMANTIC_BREAKPOINTS
  })
  const [semanticHydrated, setSemanticHydrated] = useState(false)
  const [history, setHistory] = useState<Array<{ id: string; label: string }>>([])
  const [historyCursor, setHistoryCursor] = useState(-1)
  const selectedNode = nodes[0]
  const generation = useGeneration({
    provider: "openai",
    model: "gpt-4o-mini",
    credential: "placeholder-local-byok-key"
  })

  const generatedPreview = useMemo(() => {
    const node = nodes.find((item) => item.type === "generated")
    return node?.content ?? ""
  }, [nodes])

  const displayLevel = resolveSemanticLevel(semanticState, zoom)

  useEffect(() => {
    let cancelled = false

    void (async () => {
      const saved = await loadSemanticViewState(workspaceId, canvasId)
      if (cancelled) {
        return
      }

      if (saved) {
        setSemanticStateValue((current) => ({
          ...current,
          mode: saved.mode,
          level: saved.manualLevel ?? current.level
        }))
      }

      setSemanticHydrated(true)
    })()

    return () => {
      cancelled = true
    }
  }, [canvasId, workspaceId])

  useEffect(() => {
    if (!semanticHydrated) {
      return
    }

    void saveSemanticViewState({
      workspaceId,
      canvasId,
      mode: semanticState.mode,
      manualLevel: semanticState.mode === "manual" ? semanticState.level : undefined
    })
  }, [canvasId, semanticHydrated, semanticState.level, semanticState.mode, workspaceId])

  useEffect(() => {
    if (!semanticHydrated) {
      return
    }

    void emitSemanticStateLifecycleLog({
      workspaceId,
      canvasId,
      mode: semanticState.mode,
      activeLevel: displayLevel,
      zoom
    })
  }, [canvasId, displayLevel, semanticHydrated, semanticState.mode, workspaceId, zoom])

  function appendHistory(label: string) {
    setHistory((current) => {
      const next = [...current, { id: crypto.randomUUID(), label }]
      setHistoryCursor(next.length - 1)
      return next
    })
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="flex gap-1">
          {(["select", "pan", "connect", "lasso"] as const).map((nextMode) => (
            <button
              key={nextMode}
              type="button"
              className={`rounded border px-2 py-1 text-xs ${mode === nextMode ? "bg-slate-200" : "bg-white"}`}
              onClick={() =>
                setMode((current) => transitionMode(current, nextMode, { hasSelection: selection.nodeIds.length > 0, isPointerDown: false }))
              }
            >
              {nextMode}
            </button>
          ))}
        </div>
        <SemanticLevelSelector
          mode={semanticState.mode}
          level={semanticState.level}
          resolvedLevel={displayLevel}
          onModeChange={(nextMode) => setSemanticStateValue((current) => setSemanticMode(current, nextMode))}
          onLevelChange={(nextLevel) => setSemanticStateValue((current) => setManualLevel(current, nextLevel))}
        />
        <ExpandActions
          disabled={generation.isStreaming}
          onSelect={async (intent) => {
            if (!selectedNode) {
              return
            }

            const raw = await generation.runIntent(intent, selectedNode.content)
            const now = new Date().toISOString()

            setNodes((current) => [
              ...current,
              {
                id: crypto.randomUUID(),
                workspaceId: selectedNode.workspaceId,
                canvasId: selectedNode.canvasId,
                type: "generated",
                content: raw,
                position: { x: selectedNode.position.x + 96, y: selectedNode.position.y + 96 },
                sourceNodeId: selectedNode.id,
                createdAt: now,
                updatedAt: now
              }
            ])
            appendHistory(`Run ${intent} expansion`)
          }}
        />
        {generation.error ? <p className="text-xs text-red-600">{generation.error}</p> : null}
        {generation.qualityNotice ? <p className="text-xs text-amber-700">{generation.qualityNotice}</p> : null}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {nodes.map((node) => (
          <NodeCard
            key={node.id}
            id={node.id}
            type={node.type}
            content={node.content}
            semanticMode={semanticState.mode}
            semanticLevel={displayLevel}
            selected={selection.nodeIds.includes(node.id)}
            onSelect={(id) => setSelection((current) => toggleNodeSelection(current, id))}
            onChange={(id, content) => {
              setNodes((current) =>
                current.map((item) =>
                  item.id === id
                    ? {
                        ...item,
                        content,
                        updatedAt: new Date().toISOString()
                      }
                    : item
                )
              )
            }}
          />
        ))}
      </div>

      <div className="flex gap-2">
        {generatedPreview ? (
          <button
            type="button"
            className="rounded-md border border-[hsl(var(--border))] px-3 py-2 text-xs"
            onClick={() => {
              const generated = nodes.find((item) => item.type === "generated")
              if (!generated) {
                return
              }
              const extracted = extractTextToNode(generated, generated.content.slice(0, 48))
              setNodes((current) => [...current, extracted])
              appendHistory("Extract text to node")
            }}
          >
            Extract first snippet as new node
          </button>
        ) : null}
        <button
          type="button"
          className="rounded-md border border-[hsl(var(--border))] px-3 py-2 text-xs"
          onClick={() =>
            setSelection((current) =>
              applyLassoSelection(current, nodes, {
                x: 0,
                y: 0,
                width: 1000,
                height: 1000
              })
            )
          }
        >
          Lasso select visible
        </button>
          <button
            type="button"
            className="rounded-md border border-[hsl(var(--border))] px-3 py-2 text-xs"
            onClick={() => setZoom((current) => Math.max(0.2, current - 0.2))}
          >
            Zoom out
          </button>
          <button
            type="button"
            className="rounded-md border border-[hsl(var(--border))] px-3 py-2 text-xs"
            onClick={() => setZoom((current) => Math.min(1, current + 0.2))}
          >
            Zoom in
        </button>
      </div>

      <SemanticLegend
        mode={semanticState.mode}
        resolvedLevel={displayLevel}
        zoom={zoom}
        breakpoints={semanticState.breakpoints ?? DEFAULT_SEMANTIC_BREAKPOINTS}
      />

      <div className="rounded-md border border-[hsl(var(--border))] bg-slate-50 p-2 text-xs text-slate-600">
        <p className="font-semibold">Minimap</p>
        <p>Mode: {mode}</p>
        <p>Zoom: {zoom.toFixed(1)}x</p>
        <p>Selected nodes: {selection.nodeIds.length}</p>
      </div>

      <HistoryPanel
        entries={history}
        canUndo={historyCursor >= 0}
        canRedo={historyCursor < history.length - 1}
        onUndo={() => setHistoryCursor((current) => Math.max(-1, current - 1))}
        onRedo={() => setHistoryCursor((current) => Math.min(history.length - 1, current + 1))}
      />
    </section>
  )
}
