"use client"

import React, { useCallback, useEffect, useMemo, useState } from "react"
import {
  ReactFlow,
  ReactFlowProvider,
  MiniMap,
  Background,
  BackgroundVariant,
  useReactFlow,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
  type Viewport,
  type NodeMouseHandler,
} from "@xyflow/react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { ExpandActions } from "@/components/workspace/canvas/expand-actions"
import { HistoryPanel } from "@/components/workspace/canvas/history-panel"
import { SemanticLegend } from "@/components/workspace/canvas/semantic-legend"
import { SemanticLevelSelector } from "@/components/workspace/semantic/semantic-level-selector"
import { CentralPromptBar } from "@/components/workspace/canvas/central-prompt-bar"
import { nodeTypes } from "@/components/workspace/canvas/flow-nodes"
import { toRFNodes, toRFEdges } from "@/features/graph-model/react-flow-adapters"
import { useGeneration } from "@/features/generation/use-generation"
import { transitionMode, type InteractionMode } from "@/features/graph-model/interaction-mode"
import { createConversationNode, createEdge } from "@/features/graph-model/mutations"
import type { Edge as DomainEdge } from "@/features/graph-model/types"
import {
  createSelectionState,
  type SelectionState,
} from "@/features/graph-model/selection-state"
import type { GraphNode } from "@/features/graph-model/types"
import { getNodeVisualSpec } from "@/features/graph-model/node-visual-contract"
import { loadSemanticViewState, saveSemanticViewState } from "@/features/persistence/semantic-view-repository"
import { emitSemanticStateLifecycleLog } from "@/features/persistence/workspace-persistence-service"
import {
  DEFAULT_SEMANTIC_BREAKPOINTS,
  resolveSemanticLevel,
  setManualLevel,
  setSemanticMode,
  type SemanticState,
} from "@/features/semantic-levels/state"

const MINIMAP_NODE_COLOR: Record<string, string> = {
  topic: "hsl(200, 85%, 72%)",
  generated: "hsl(140, 60%, 73%)",
  question: "hsl(42, 98%, 72%)",
  summary: "hsl(265, 56%, 73%)",
  keyword: "hsl(350, 76%, 74%)",
  portal: "hsl(216, 72%, 73%)",
}

const COLOR_PRESETS = [
  { label: "Default", value: "" },
  { label: "Blue", value: "hsl(210, 90%, 92%)" },
  { label: "Green", value: "hsl(145, 70%, 90%)" },
  { label: "Yellow", value: "hsl(48, 95%, 88%)" },
  { label: "Purple", value: "hsl(270, 70%, 92%)" },
  { label: "Pink", value: "hsl(340, 80%, 92%)" },
  { label: "Orange", value: "hsl(25, 90%, 90%)" },
]

function parseExpandItems(raw: string): string[] {
  const lines = raw.split("\n").map((l) => l.replace(/^\d+[\.\)]\s*/, "").trim()).filter(Boolean)
  return lines.slice(0, 3)
}

type CanvasBoardProps = {
  onOpenSettings?: () => void
}

function CanvasBoardInner({ onOpenSettings }: CanvasBoardProps) {
  const workspaceId = "local-workspace"
  const canvasId = "root"
  const { setViewport } = useReactFlow()
  const [nodes, setNodes] = useState<GraphNode[]>([])
  const [edges, setEdges] = useState<DomainEdge[]>([])
  const [selection, setSelection] = useState<SelectionState>(createSelectionState())
  const [mode, setMode] = useState<InteractionMode>("select")
  const [zoom, setZoom] = useState(1)
  const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null)
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null)
  const [streamingNodeIds, setStreamingNodeIds] = useState<Set<string>>(new Set())
  const [semanticState, setSemanticStateValue] = useState<SemanticState>({
    mode: "auto",
    level: "all",
    breakpoints: DEFAULT_SEMANTIC_BREAKPOINTS,
  })
  const [semanticHydrated, setSemanticHydrated] = useState(false)
  const [history, setHistory] = useState<Array<{ id: string; label: string }>>([])
  const [historyCursor, setHistoryCursor] = useState(-1)

  const generation = useGeneration({
    provider: "bedrock",
    model: "us.anthropic.claude-opus-4-6-v1",
    credential: "cline",
  })

  const displayLevel = resolveSemanticLevel(semanticState, zoom)
  const focusedNode = focusedNodeId ? nodes.find((n) => n.id === focusedNodeId) ?? null : null

  // Callbacks for nodes (stable refs for memoization)
  const handleAddChild = useCallback((parentNodeId: string) => {
    const parent = nodes.find((n) => n.id === parentNodeId)
    if (!parent) return

    const child = createConversationNode({
      workspaceId,
      canvasId,
      prompt: "",
      content: "",
      x: parent.position.x + (Math.random() - 0.5) * 200,
      y: parent.position.y + 180 + Math.random() * 60,
      sourceNodeId: parent.id,
    })

    setNodes((current) => [...current, child])
    setEdges((current) => [
      ...current,
      createEdge({ workspaceId, canvasId, fromNodeId: parent.id, toNodeId: child.id }),
    ])
    setEditingNodeId(child.id)
    setFocusedNodeId(null)
    appendHistory("Add follow-up node")
  }, [nodes, canvasId, workspaceId])

  // Build conversation context by walking parent chain
  function buildConversationContext(nodeId: string): string {
    const chain: GraphNode[] = []
    let current = nodes.find((n) => n.id === nodeId)
    while (current?.sourceNodeId) {
      const parent = nodes.find((n) => n.id === current!.sourceNodeId)
      if (!parent) break
      chain.unshift(parent)
      current = parent
    }
    if (chain.length === 0) return ""
    return chain.map((n) => {
      const parts: string[] = []
      if (n.prompt) parts.push(`User: ${n.prompt}`)
      if (n.content) parts.push(`Assistant: ${n.content}`)
      return parts.join("\n")
    }).join("\n\n")
  }

  const handleNodeResize = useCallback((nodeId: string, width: number, height: number, isFinal: boolean = true) => {
    setNodes((current) => current.map((n) =>
      n.id === nodeId
        ? { ...n, dimensions: { width, height }, ...(isFinal ? { updatedAt: new Date().toISOString() } : {}) }
        : n
    ))
  }, [])

  const handlePromptSubmit = useCallback(async (nodeId: string, prompt: string) => {
    setNodes((current) => current.map((n) =>
      n.id === nodeId ? { ...n, prompt, updatedAt: new Date().toISOString() } : n
    ))
    setEditingNodeId(null)
    setStreamingNodeIds((s) => new Set(s).add(nodeId))

    const node = nodes.find((n) => n.id === nodeId)
    const overrides = node?.providerOverride
      ? { provider: node.providerOverride.provider as "bedrock", model: node.providerOverride.model, credential: "cline" }
      : undefined

    // Build context from parent conversation chain
    const context = buildConversationContext(nodeId)
    const fullPrompt = context
      ? `${context}\n\nUser: ${prompt}`
      : prompt

    const text = await generation.runIntent("prompt", fullPrompt, {
      overrides,
      onDelta: (chunk) => {
        setNodes((current) => current.map((n) =>
          n.id === nodeId ? { ...n, content: n.content + chunk } : n
        ))
      },
    })

    setNodes((current) => current.map((n) =>
      n.id === nodeId ? { ...n, content: text, updatedAt: new Date().toISOString() } : n
    ))
    setStreamingNodeIds((s) => { const next = new Set(s); next.delete(nodeId); return next })
    appendHistory("Generated response")
  }, [nodes, generation])

  const rfNodes = useMemo(
    () =>
      toRFNodes(nodes, {
        semanticLevel: displayLevel,
        semanticMode: semanticState.mode,
        selectedIds: selection.nodeIds,
        onAddChild: handleAddChild,
        onPromptSubmit: handlePromptSubmit,
        onResize: handleNodeResize,
        streamingNodeIds,
        editingNodeId,
      }),
    [nodes, displayLevel, semanticState.mode, selection.nodeIds, handleAddChild, handlePromptSubmit, handleNodeResize, streamingNodeIds, editingNodeId]
  )

  const rfEdges = useMemo(() => toRFEdges(edges), [edges])

  // Hydrate semantic state
  useEffect(() => {
    let cancelled = false
    void (async () => {
      const saved = await loadSemanticViewState(workspaceId, canvasId)
      if (cancelled) return
      if (saved) {
        setSemanticStateValue((current) => ({
          ...current,
          mode: saved.mode,
          level: saved.manualLevel ?? current.level,
        }))
      }
      setSemanticHydrated(true)
    })()
    return () => { cancelled = true }
  }, [canvasId, workspaceId])

  useEffect(() => {
    if (!semanticHydrated) return
    void saveSemanticViewState({
      workspaceId, canvasId,
      mode: semanticState.mode,
      manualLevel: semanticState.mode === "manual" ? semanticState.level : undefined,
    })
  }, [canvasId, semanticHydrated, semanticState.level, semanticState.mode, workspaceId])

  useEffect(() => {
    if (!semanticHydrated) return
    void emitSemanticStateLifecycleLog({
      workspaceId, canvasId,
      mode: semanticState.mode,
      activeLevel: displayLevel,
      zoom,
    })
  }, [canvasId, displayLevel, semanticHydrated, semanticState.mode, workspaceId, zoom])

  function appendHistory(label: string) {
    setHistory((current) => {
      const next = [...current, { id: crypto.randomUUID(), label }]
      setHistoryCursor(next.length - 1)
      return next
    })
  }

  // --- Initial prompt from central bar ---
  async function handleInitialPrompt(prompt: string) {
    const nodeId = crypto.randomUUID()
    const now = new Date().toISOString()
    const newNode: GraphNode = {
      id: nodeId,
      workspaceId,
      canvasId,
      type: "topic",
      prompt,
      content: "",
      position: { x: 400, y: 300 },
      createdAt: now,
      updatedAt: now,
    }
    setNodes([newNode])
    setStreamingNodeIds(new Set([nodeId]))

    const text = await generation.runIntent("prompt", prompt, {
      onDelta: (chunk) => {
        setNodes((current) => current.map((n) =>
          n.id === nodeId ? { ...n, content: n.content + chunk } : n
        ))
      },
    })

    setNodes((current) => current.map((n) =>
      n.id === nodeId ? { ...n, content: text, updatedAt: new Date().toISOString() } : n
    ))
    setStreamingNodeIds(new Set())
    appendHistory("Initial exploration")
  }

  // --- Batch expand (Questions / Subtopics) ---
  async function handleBatchExpand(intent: "questions" | "subtopics", sourceNode: GraphNode) {
    const raw = await generation.runIntent(intent, sourceNode.content)
    const items = parseExpandItems(raw)

    for (let i = 0; i < Math.min(items.length, 3); i++) {
      const angle = (2 * Math.PI * i) / 3 - Math.PI / 2
      const radius = 250 + Math.random() * 50
      const childX = sourceNode.position.x + Math.cos(angle) * radius + (Math.random() - 0.5) * 40
      const childY = sourceNode.position.y + Math.sin(angle) * radius + (Math.random() - 0.5) * 40

      const child = createConversationNode({
        workspaceId, canvasId,
        prompt: items[i],
        content: "",
        x: childX,
        y: childY,
        sourceNodeId: sourceNode.id,
      })

      setNodes((current) => [...current, child])
      setEdges((current) => [
        ...current,
        createEdge({ workspaceId, canvasId, fromNodeId: sourceNode.id, toNodeId: child.id }),
      ])
      setStreamingNodeIds((s) => new Set(s).add(child.id))

      // Fire concurrent generation for each child
      void (async () => {
        const text = await generation.runIntent("prompt", items[i], {
          onDelta: (chunk) => {
            setNodes((current) => current.map((n) =>
              n.id === child.id ? { ...n, content: n.content + chunk } : n
            ))
          },
        })
        setNodes((current) => current.map((n) =>
          n.id === child.id ? { ...n, content: text, updatedAt: new Date().toISOString() } : n
        ))
        setStreamingNodeIds((s) => { const next = new Set(s); next.delete(child.id); return next })
      })()
    }
    appendHistory(`Expand ${intent}`)
  }

  // --- Summarize ---
  async function handleSummarize(nodeId: string) {
    const node = nodes.find((n) => n.id === nodeId)
    if (!node) return
    setStreamingNodeIds((s) => new Set(s).add(nodeId))
    setNodes((current) => current.map((n) => n.id === nodeId ? { ...n, content: "" } : n))

    const text = await generation.runIntent("summarize", node.content, {
      onDelta: (chunk) => {
        setNodes((current) => current.map((n) =>
          n.id === nodeId ? { ...n, content: n.content + chunk } : n
        ))
      },
    })

    setNodes((current) => current.map((n) =>
      n.id === nodeId ? { ...n, content: text, updatedAt: new Date().toISOString() } : n
    ))
    setStreamingNodeIds((s) => { const next = new Set(s); next.delete(nodeId); return next })
    appendHistory("Summarize")
  }

  // --- Regenerate ---
  async function handleRegenerate(nodeId: string) {
    const node = nodes.find((n) => n.id === nodeId)
    if (!node?.prompt) return
    setStreamingNodeIds((s) => new Set(s).add(nodeId))
    setNodes((current) => current.map((n) => n.id === nodeId ? { ...n, content: "" } : n))

    const overrides = node.providerOverride
      ? { provider: node.providerOverride.provider as "bedrock", model: node.providerOverride.model, credential: "cline" }
      : undefined

    const text = await generation.runIntent("prompt", node.prompt, {
      overrides,
      onDelta: (chunk) => {
        setNodes((current) => current.map((n) =>
          n.id === nodeId ? { ...n, content: n.content + chunk } : n
        ))
      },
    })

    setNodes((current) => current.map((n) =>
      n.id === nodeId ? { ...n, content: text, updatedAt: new Date().toISOString() } : n
    ))
    setStreamingNodeIds((s) => { const next = new Set(s); next.delete(nodeId); return next })
    appendHistory("Regenerate")
  }

  // --- Delete node ---
  function handleDeleteNode(nodeId: string) {
    setNodes((current) => current.filter((n) => n.id !== nodeId))
    setEdges((current) => current.filter((e) => e.fromNodeId !== nodeId && e.toNodeId !== nodeId))
    if (focusedNodeId === nodeId) setFocusedNodeId(null)
    appendHistory("Delete node")
  }

  // --- React Flow event handlers ---
  const onNodesChange: OnNodesChange = useCallback((changes) => {
    for (const change of changes) {
      if (change.type === "position" && change.position) {
        // Update position on every frame during drag for smooth movement
        const isFinal = !change.dragging
        setNodes((current) => current.map((n) =>
          n.id === change.id
            ? { ...n, position: { x: change.position!.x, y: change.position!.y }, ...(isFinal ? { updatedAt: new Date().toISOString() } : {}) }
            : n
        ))
      }
      if (change.type === "select") {
        setSelection((current) => {
          const ids = change.selected
            ? [...new Set([...current.nodeIds, change.id])]
            : current.nodeIds.filter((id) => id !== change.id)
          return { ...current, nodeIds: ids }
        })
      }
      if (change.type === "remove") {
        handleDeleteNode(change.id)
      }
      // Capture initial auto-measurement from React Flow to make nodes resizable
      // User resize drags are handled by NodeResizer onResize/onResizeEnd callbacks
      if (change.type === "dimensions" && change.dimensions) {
        setNodes((current) => current.map((n) => {
          // Only store measured dimensions if node doesn't already have explicit dimensions
          // This captures the initial measurement but ignores subsequent auto-measurements
          if (n.id === change.id && !n.dimensions) {
            return { ...n, dimensions: { width: change.dimensions!.width, height: change.dimensions!.height } }
          }
          return n
        }))
      }
    }
  }, [focusedNodeId])

  const onEdgesChange: OnEdgesChange = useCallback((changes) => {
    for (const change of changes) {
      if (change.type === "remove") {
        setEdges((current) => current.filter((e) => e.id !== change.id))
      }
    }
  }, [])

  const onConnect: OnConnect = useCallback((connection) => {
    if (!connection.source || !connection.target) return
    setEdges((current) => [
      ...current,
      createEdge({ workspaceId, canvasId, fromNodeId: connection.source!, toNodeId: connection.target! }),
    ])
    appendHistory("Connect nodes")
  }, [canvasId, workspaceId])

  const onViewportChange = useCallback((viewport: Viewport) => { setZoom(viewport.zoom) }, [])

  const onNodeClick: NodeMouseHandler = useCallback((_event, node) => {
    if (editingNodeId === node.id) return // don't open panel while editing
    setFocusedNodeId((current) => (current === node.id ? null : node.id))
  }, [editingNodeId])

  const onPaneClick = useCallback(() => { setFocusedNodeId(null) }, [])

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Ignore when typing in an input/textarea
      const tag = (e.target as HTMLElement).tagName
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return

      const mod = e.metaKey || e.ctrlKey

      // Backspace — delete selected nodes (Mac-friendly alternative to Delete)
      if (e.key === "Backspace" && !mod) {
        for (const id of selection.nodeIds) {
          handleDeleteNode(id)
        }
        return
      }

      // Ctrl/Cmd+A — select all nodes
      if (mod && e.key === "a") {
        e.preventDefault()
        setSelection({ nodeIds: nodes.map((n) => n.id), edgeIds: [], lassoBounds: null })
        return
      }

      // Escape — deselect all, close detail panel
      if (e.key === "Escape") {
        setSelection(createSelectionState())
        setFocusedNodeId(null)
        return
      }

      // Ctrl/Cmd+Z — undo
      if (mod && e.key === "z" && !e.shiftKey) {
        e.preventDefault()
        setHistoryCursor((c) => Math.max(-1, c - 1))
        return
      }

      // Ctrl/Cmd+Shift+Z — redo
      if (mod && e.key === "z" && e.shiftKey) {
        e.preventDefault()
        setHistoryCursor((c) => Math.min(history.length - 1, c + 1))
        return
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [selection.nodeIds, nodes, history.length])

  return (
    <div className="relative h-full">
      {/* Central prompt bar when canvas is empty */}
      {nodes.length === 0 ? (
        <CentralPromptBar onSubmit={handleInitialPrompt} disabled={generation.isStreaming} />
      ) : null}

      {/* Canvas */}
      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onViewportChange={onViewportChange}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        deleteKeyCode="Delete"
        defaultEdgeOptions={{ type: "smoothstep", animated: false }}
        panOnDrag
        nodesDraggable
        selectionOnDrag={mode === "lasso"}
        connectOnClick={mode === "connect"}
        fitView={nodes.length > 0}
        proOptions={{ hideAttribution: true }}
      >
        <MiniMap
          nodeColor={(node) => MINIMAP_NODE_COLOR[node.type ?? "topic"] ?? "#94a3b8"}
          zoomable
          pannable
        />
        <Background variant={BackgroundVariant.Dots} />
      </ReactFlow>

      {/* Floating toolbar */}
      {nodes.length > 0 ? (
        <div className="absolute left-1/2 top-3 z-10 -translate-x-1/2 flex items-center gap-2 rounded-lg border border-[hsl(var(--border))] bg-white/95 px-3 py-2 shadow-lg backdrop-blur-sm">
          <div className="flex gap-1">
            {(["connect", "lasso"] as const).map((nextMode) => (
              <button
                key={nextMode}
                type="button"
                className={`rounded border px-2 py-1 text-xs ${mode === nextMode ? "bg-slate-200" : "bg-white"}`}
                onClick={() => {
                  if (mode === nextMode) { setMode("select") } else {
                    setMode((current) => transitionMode(current, nextMode, {
                      hasSelection: selection.nodeIds.length > 0, isPointerDown: false,
                    }))
                  }
                }}
              >
                {nextMode}
              </button>
            ))}
          </div>
          <div className="mx-1 h-5 w-px bg-slate-200" />
          <SemanticLevelSelector
            mode={semanticState.mode}
            level={semanticState.level}
            resolvedLevel={displayLevel}
            onModeChange={(m) => setSemanticStateValue((s) => setSemanticMode(s, m))}
            onLevelChange={(l) => setSemanticStateValue((s) => setManualLevel(s, l))}
          />
          {onOpenSettings ? (
            <>
              <div className="mx-1 h-5 w-px bg-slate-200" />
              <button
                type="button"
                className="rounded border bg-white px-2 py-1 text-xs hover:bg-slate-50"
                onClick={onOpenSettings}
                aria-label="Settings"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
              </button>
            </>
          ) : null}
        </div>
      ) : null}

      {/* Generation notices */}
      {generation.error ? (
        <div className="absolute left-1/2 top-16 z-10 -translate-x-1/2 rounded-lg border border-red-200 bg-red-50/95 px-3 py-1 text-xs text-red-600 shadow-lg backdrop-blur-sm">
          {generation.error}
        </div>
      ) : null}
      {generation.failureNotice ? (
        <div className="absolute left-1/2 top-16 z-10 -translate-x-1/2 rounded-lg border border-amber-300 bg-amber-50/95 px-3 py-1 text-xs text-amber-900 shadow-lg backdrop-blur-sm" role="status">
          <p>{generation.failureNotice.category}: {generation.failureNotice.message}</p>
          <p>Actions: {generation.failureNotice.actions.join(" / ")}</p>
        </div>
      ) : null}

      {/* Node detail panel */}
      {focusedNode ? (
        <aside
          className="absolute right-3 top-3 z-20 w-80 max-h-[calc(100%-1.5rem)] overflow-y-auto rounded-lg border border-[hsl(var(--border))] bg-white/95 shadow-xl backdrop-blur-sm"
          aria-label="Node detail panel"
        >
          {/* Header */}
          <div className="flex items-center gap-2 border-b border-[hsl(var(--border))] px-3 py-2">
            <span className="text-sm">{getNodeVisualSpec(focusedNode.type).icon}</span>
            <span className="text-xs font-semibold">{getNodeVisualSpec(focusedNode.type).typeLabel}</span>
            <button
              type="button"
              className="ml-auto rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              onClick={() => setFocusedNodeId(null)}
              aria-label="Close panel"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
            </button>
          </div>

          {/* Prompt (read-only) */}
          {focusedNode.prompt ? (
            <div className="border-b border-[hsl(var(--border))] px-3 py-2">
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500">Prompt</label>
              <p className="text-xs text-slate-700">{focusedNode.prompt}</p>
            </div>
          ) : null}

          {/* Full response */}
          <div className="border-b border-[hsl(var(--border))] p-3">
            <div className="mb-1 flex items-center justify-between">
              <label className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Response</label>
              <button
                type="button"
                className="text-[10px] text-sky-600 hover:underline"
                onClick={() => {
                  const el = document.getElementById("sensecape-response-editor")
                  if (el) {
                    el.classList.toggle("hidden")
                    document.getElementById("sensecape-response-markdown")?.classList.toggle("hidden")
                  }
                }}
              >
                Toggle edit
              </button>
            </div>
            <div id="sensecape-response-markdown" className="sensecape-markdown max-h-60 overflow-y-auto rounded border border-[hsl(var(--border))] bg-white p-2 text-sm">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{focusedNode.content || "_No response yet_"}</ReactMarkdown>
            </div>
            <textarea
              id="sensecape-response-editor"
              className="hidden h-40 w-full resize-y rounded border border-[hsl(var(--border))] bg-white p-2 text-sm outline-none focus:ring-1 focus:ring-sky-300"
              value={focusedNode.content}
              aria-label="Node content"
              onChange={(e) => {
                const next = e.target.value
                setNodes((current) => current.map((n) =>
                  n.id === focusedNode.id ? { ...n, content: next, updatedAt: new Date().toISOString() } : n
                ))
              }}
            />
          </div>

          {/* Expand actions */}
          <div className="border-b border-[hsl(var(--border))] p-3">
            <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-slate-500">Explore</label>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                className="rounded border px-2 py-1 text-xs hover:bg-slate-50 disabled:opacity-50"
                disabled={generation.isStreaming || !focusedNode.content}
                onClick={() => void handleBatchExpand("questions", focusedNode)}
              >
                Questions
              </button>
              <button
                type="button"
                className="rounded border px-2 py-1 text-xs hover:bg-slate-50 disabled:opacity-50"
                disabled={generation.isStreaming || !focusedNode.content}
                onClick={() => void handleBatchExpand("subtopics", focusedNode)}
              >
                Subtopics
              </button>
              <button
                type="button"
                className="rounded border px-2 py-1 text-xs hover:bg-slate-50 disabled:opacity-50"
                disabled={generation.isStreaming || !focusedNode.content}
                onClick={() => void handleSummarize(focusedNode.id)}
              >
                Summarize
              </button>
              <button
                type="button"
                className="rounded border px-2 py-1 text-xs hover:bg-slate-50 disabled:opacity-50"
                disabled={generation.isStreaming || !focusedNode.prompt}
                onClick={() => void handleRegenerate(focusedNode.id)}
              >
                Regenerate
              </button>
            </div>
          </div>

          {/* Color picker */}
          <div className="border-b border-[hsl(var(--border))] p-3">
            <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-slate-500">Color</label>
            <div className="flex flex-wrap gap-1.5">
              {COLOR_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  className={`h-6 w-6 rounded-full border-2 ${focusedNode.colorToken === preset.value || (!focusedNode.colorToken && !preset.value) ? "border-sky-500" : "border-slate-200"}`}
                  style={{ background: preset.value || "hsl(var(--node-topic-bg))" }}
                  title={preset.label}
                  onClick={() => {
                    setNodes((current) => current.map((n) =>
                      n.id === focusedNode.id ? { ...n, colorToken: preset.value || undefined, updatedAt: new Date().toISOString() } : n
                    ))
                  }}
                />
              ))}
            </div>
          </div>

          {/* Model override */}
          <div className="border-b border-[hsl(var(--border))] p-3">
            <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-slate-500">Model</label>
            <select
              className="w-full rounded border p-1 text-xs"
              value={focusedNode.providerOverride?.model ?? "us.anthropic.claude-opus-4-6-v1"}
              onChange={(e) => {
                const model = e.target.value
                setNodes((current) => current.map((n) =>
                  n.id === focusedNode.id
                    ? { ...n, providerOverride: model === "us.anthropic.claude-opus-4-6-v1" ? undefined : { provider: "bedrock", model }, updatedAt: new Date().toISOString() }
                    : n
                ))
              }}
            >
              <option value="us.anthropic.claude-opus-4-6-v1">Claude Opus 4.6</option>
              <option value="us.anthropic.claude-sonnet-4-6-v1">Claude Sonnet 4.6</option>
              <option value="us.anthropic.claude-haiku-4-5-20251001">Claude Haiku 4.5</option>
            </select>
          </div>

          {/* Delete */}
          <div className="p-3">
            <button
              type="button"
              className="w-full rounded border border-red-200 px-2 py-1.5 text-xs text-red-600 hover:bg-red-50"
              onClick={() => handleDeleteNode(focusedNode.id)}
            >
              Delete node
            </button>
            <div className="mt-2 text-[10px] text-slate-400">
              <p>ID: {focusedNode.id.slice(0, 8)}...</p>
              <p>Position: ({Math.round(focusedNode.position.x)}, {Math.round(focusedNode.position.y)})</p>
            </div>
          </div>
        </aside>
      ) : null}

      {/* Bottom-left panels */}
      <div className="absolute bottom-3 left-3 z-10 flex items-end gap-2">
        <div className="rounded-lg border border-[hsl(var(--border))] bg-white/95 px-3 py-2 shadow-lg backdrop-blur-sm">
          <SemanticLegend
            mode={semanticState.mode}
            resolvedLevel={displayLevel}
            zoom={zoom}
            breakpoints={semanticState.breakpoints ?? DEFAULT_SEMANTIC_BREAKPOINTS}
          />
        </div>
        <div className="rounded-lg border border-[hsl(var(--border))] bg-white/95 px-3 py-2 shadow-lg backdrop-blur-sm">
          <HistoryPanel
            entries={history}
            canUndo={historyCursor >= 0}
            canRedo={historyCursor < history.length - 1}
            onUndo={() => setHistoryCursor((c) => Math.max(-1, c - 1))}
            onRedo={() => setHistoryCursor((c) => Math.min(history.length - 1, c + 1))}
          />
        </div>
      </div>
    </div>
  )
}

export function CanvasBoard(props: CanvasBoardProps) {
  return (
    <ReactFlowProvider>
      <CanvasBoardInner {...props} />
    </ReactFlowProvider>
  )
}
