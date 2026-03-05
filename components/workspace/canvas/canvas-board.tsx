"use client"

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  MiniMap,
  Background,
  BackgroundVariant,
  ConnectionMode,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
  type OnConnectEnd,
  type Connection,
  type Node,
  type Edge as RFEdge,
  type OnNodeDrag,
  type NodeMouseHandler,
  type FinalConnectionState,
} from "@xyflow/react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { CentralPromptBar, type RecentChatOption } from "@/components/workspace/canvas/central-prompt-bar"
import { edgeTypes } from "@/components/workspace/canvas/flow-edges"
import { nodeTypes } from "@/components/workspace/canvas/flow-nodes"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { toRFNodes, toRFEdges } from "@/features/graph-model/react-flow-adapters"
import {
  DEFAULT_WORKSPACE_MODEL_PREFERENCE,
  readWorkspaceDefaultModelPreference,
  subscribeWorkspaceDefaultModelPreference,
  writeWorkspaceDefaultModelPreference,
} from "@/features/generation/default-model-preference"
import { useGeneration } from "@/features/generation/use-generation"
import { composePromptWithConversationContext } from "@/features/generation/conversation-context"
import { createFollowUpContextBlocks } from "@/features/generation/context-block"
import { isValidGraphConnection, isValidReactFlowConnection } from "@/features/graph-model/edge-validation"
import {
  collectForcePositions,
  createForceLayoutSimulation,
  pinForceNode,
  releaseForceNode,
  reheatSimulation,
  updateForceNodePosition,
  type ForceLayoutNode,
  type ForceLayoutSimulation,
} from "@/features/graph-model/force-layout"
import { createConversationNode, createEdge } from "@/features/graph-model/mutations"
import type { Canvas, Edge as DomainEdge, HierarchyLink } from "@/features/graph-model/types"
import {
  createSelectionState,
  type SelectionState,
} from "@/features/graph-model/selection-state"
import type { GraphNode } from "@/features/graph-model/types"
import { getNodeVisualSpec } from "@/features/graph-model/node-visual-contract"
import { getCredentialAuth, type StoredCredential } from "@/lib/auth/credential-store"
import {
  getCachedProviderModels,
  isProviderModelCacheStale,
  MODEL_CACHE_TTL_MS,
  pruneProviderModelCache,
  upsertCachedProviderModels,
} from "@/lib/providers/model-cache"
import type { ProviderAuthCredential } from "@/lib/auth/auth-types"
import { toast } from "sonner"

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

const MISSING_AUTH_TOAST_ID = "canvas:missing-auth"
const GENERATION_ERROR_TOAST_ID = "canvas:generation-error"
const GENERATION_FAILURE_TOAST_ID = "canvas:generation-failure"

function parseExpandItems(raw: string): string[] {
  // LLM expand responses often come back as numbered lists.
  // Strip number prefixes and keep up to three non-empty lines.
  const lines = raw.split("\n").map((line) => line.replace(/^\d+[\.\)]\s*/, "").trim()).filter(Boolean)
  return lines.slice(0, 3)
}

function getClientPosition(event: MouseEvent | TouchEvent): { x: number; y: number } | null {
  // We accept both mouse and touch events so edge-drag behavior works on desktop and mobile.
  if ("clientX" in event && "clientY" in event) {
    return { x: event.clientX, y: event.clientY }
  }

  if ("changedTouches" in event && event.changedTouches.length > 0) {
    const touch = event.changedTouches[0]
    return { x: touch.clientX, y: touch.clientY }
  }

  if ("touches" in event && event.touches.length > 0) {
    const touch = event.touches[0]
    return { x: touch.clientX, y: touch.clientY }
  }

  return null
}

type CanvasBoardProps = {
  workspaceId?: string
  initialState?: CanvasGraphState
  recentChats?: RecentChatOption[]
  onResumeChat?: (chatId: string) => void
  onGraphStateChange?: (state: CanvasGraphState, reason: "state" | "model" | "initial-prompt") => void
  onFirstPromptSubmitted?: (payload: { prompt: string; provider: string; model: string }) => void
  onOpenSettings?: () => void
  credentials?: StoredCredential[]
  settingsPanelOpen?: boolean
  settingsPanelWidthPx?: number
  onCatalogProvidersChange?: (providers: CatalogProviderOption[]) => void
}

export type CanvasGraphState = {
  workspaceId: string
  activeCanvasId: string
  canvases: Canvas[]
  links: HierarchyLink[]
  nodes: GraphNode[]
  edges: DomainEdge[]
  workspaceModelPreference?: {
    provider: string
    model: string
  }
}

export type CatalogProviderOption = {
  id: string
  name: string
  models: Array<{ id: string; name: string }>
}

type ActiveProviderCredential = {
  providerId: string
  providerName: string
  credentialVersion: string
  auth: ProviderAuthCredential
}

type ResponseFollowUpMenuState = {
  nodeId: string
  selectedText: string
  x: number
  y: number
}

function toCredentialVersion(credential: StoredCredential): string {
  return `${credential.id}:${credential.updatedAt}`
}

function canonicalProviderId(providerId: string): string {
  if (providerId === "github-models" || providerId === "github-copilot" || providerId === "github-copilot-enterprise") {
    return "github"
  }
  if (providerId === "bedrock") {
    return "amazon-bedrock"
  }
  if (providerId === "gemini") {
    return "google"
  }
  return providerId
}

function activeCredentialsByProvider(credentials: StoredCredential[]): ActiveProviderCredential[] {
  const byProvider = new Map<string, { credential: StoredCredential; auth: ProviderAuthCredential }>()
  for (const credential of credentials) {
    if (credential.status !== "active") {
      continue
    }
    const providerId = canonicalProviderId(credential.provider)
    const auth = getCredentialAuth(credential)
    if (!auth) {
      continue
    }
    const current = byProvider.get(providerId)

    if (!current) {
      byProvider.set(providerId, { credential, auth })
      continue
    }

    if (providerId === "github") {
      const currentScore = current.auth.type === "api" || current.auth.type === "wellknown" ? 2 : 1
      const nextScore = auth.type === "api" || auth.type === "wellknown" ? 2 : 1
      if (nextScore > currentScore) {
        byProvider.set(providerId, { credential, auth })
        continue
      }
      if (nextScore < currentScore) {
        continue
      }
    }

    if (credential.updatedAt > current.credential.updatedAt) {
      byProvider.set(providerId, { credential, auth })
    }
  }

  const providers: ActiveProviderCredential[] = []
  for (const [providerId, entry] of byProvider.entries()) {
    providers.push({
      providerId,
      providerName: providerId,
      credentialVersion: toCredentialVersion(entry.credential),
      auth: entry.auth,
    })
  }

  return providers
}

const PROVIDER_SORT_ORDER = ["openai", "anthropic", "github", "openrouter", "google", "amazon-bedrock"] as const

function providerSortIndex(providerId: string): number {
  const index = PROVIDER_SORT_ORDER.indexOf(providerId as (typeof PROVIDER_SORT_ORDER)[number])
  return index === -1 ? 999 : index
}

function sortCatalogProviders(providers: CatalogProviderOption[]): CatalogProviderOption[] {
  return [...providers].sort((left, right) => {
    const leftIndex = providerSortIndex(left.id)
    const rightIndex = providerSortIndex(right.id)
    if (leftIndex !== rightIndex) {
      return leftIndex - rightIndex
    }
    return left.name.localeCompare(right.name)
  })
}

function CanvasBoardInner({
  workspaceId: workspaceIdProp,
  initialState,
  recentChats = [],
  onResumeChat,
  onGraphStateChange,
  onFirstPromptSubmitted,
  onOpenSettings,
  credentials = [],
  settingsPanelOpen = false,
  settingsPanelWidthPx = 320,
  onCatalogProvidersChange,
}: CanvasBoardProps) {
  const workspaceId = workspaceIdProp ?? initialState?.workspaceId ?? "local-workspace"
  const canvasId = initialState?.activeCanvasId ?? "root"
  const [canvases] = useState<Canvas[]>(() => initialState?.canvases ?? [])
  const [links] = useState<HierarchyLink[]>(() => initialState?.links ?? [])
  const [nodes, setNodes] = useState<GraphNode[]>(() => initialState?.nodes ?? [])
  const [edges, setEdges] = useState<DomainEdge[]>(() => initialState?.edges ?? [])
  const [selection, setSelection] = useState<SelectionState>(createSelectionState())
  const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null)
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null)
  const [streamingNodeIds, setStreamingNodeIds] = useState<Set<string>>(new Set())
  const [catalogProviders, setCatalogProviders] = useState<CatalogProviderOption[]>([])
  const [workspaceProvider, setWorkspaceProvider] = useState(
    () => initialState?.workspaceModelPreference?.provider ?? readWorkspaceDefaultModelPreference(DEFAULT_WORKSPACE_MODEL_PREFERENCE).provider,
  )
  const [workspaceModel, setWorkspaceModel] = useState(
    () => initialState?.workspaceModelPreference?.model ?? readWorkspaceDefaultModelPreference(DEFAULT_WORKSPACE_MODEL_PREFERENCE).model,
  )
  const [dismissedMissingCredentialsNotice, setDismissedMissingCredentialsNotice] = useState(false)
  const [responseFollowUpMenu, setResponseFollowUpMenu] = useState<ResponseFollowUpMenuState | null>(null)
  // `topologyVersion` tracks node/edge structure changes (add/remove/connect).
  // `forceLayoutNonce` tracks "same structure, but sizing changed" refreshes.
  const [topologyVersion, setTopologyVersion] = useState(0)
  const [forceLayoutNonce, setForceLayoutNonce] = useState(0)
  const forceSimulationRef = useRef<ForceLayoutSimulation | null>(null)
  const forceNodeLookupRef = useRef<Map<string, ForceLayoutNode>>(new Map())
  const forceTickRafRef = useRef<number | null>(null)
  const pendingForcePositionsRef = useRef<Map<string, { x: number; y: number }> | null>(null)
  const latestNodesRef = useRef<GraphNode[]>(nodes)
  const latestEdgesRef = useRef<DomainEdge[]>(edges)
  // Stream buffers let us batch tiny token updates into one paint-time state write.
  const streamDeltaBufferRef = useRef<Map<string, string>>(new Map())
  const streamFlushRafRef = useRef<number | null>(null)
  const { screenToFlowPosition } = useReactFlow()

  const activeProviders = useMemo(() => activeCredentialsByProvider(credentials), [credentials])
  const hasActiveCredentials = activeProviders.length > 0

  const updateWorkspaceModelSelection = useCallback((provider: string, model: string) => {
    setWorkspaceProvider(provider)
    setWorkspaceModel(model)
    writeWorkspaceDefaultModelPreference({ provider, model })
  }, [])

  const generation = useGeneration({
    provider: workspaceProvider,
    model: workspaceModel,
  })

  const modelValueToDescriptor = useMemo(() => {
    const map = new Map<string, { providerId: string; modelId: string }>()
    for (const provider of catalogProviders) {
      for (const model of provider.models) {
        map.set(`${provider.id}::${model.id}`, { providerId: provider.id, modelId: model.id })
      }
    }
    return map
  }, [catalogProviders])

  const initialModelOptions = useMemo(() => {
    const options: Array<{ value: string; label: string }> = []
    for (const provider of catalogProviders) {
      for (const model of provider.models) {
        options.push({
          value: `${provider.id}::${model.id}`,
          label: `${provider.name} / ${model.name}`,
        })
      }
    }
    return options
  }, [catalogProviders])

  const focusedNode = focusedNodeId ? nodes.find((node) => node.id === focusedNodeId) ?? null : null
  const focusedNodeContextBlocks = (focusedNode?.promptContextBlocks ?? [])
    .map((block) => block.trim())
    .filter((block) => block.length > 0)
  const nodePanelRightPx = settingsPanelOpen ? settingsPanelWidthPx + 24 : 12
  const forceLayoutSignature = useMemo(() => `${topologyVersion}::${forceLayoutNonce}`, [forceLayoutNonce, topologyVersion])

  useEffect(() => {
    return subscribeWorkspaceDefaultModelPreference((preference) => {
      setWorkspaceProvider(preference.provider)
      setWorkspaceModel(preference.model)
    })
  }, [])

  useEffect(() => {
    onCatalogProvidersChange?.(catalogProviders)
  }, [catalogProviders, onCatalogProvidersChange])

  useEffect(() => {
    if (hasActiveCredentials) {
      setDismissedMissingCredentialsNotice(false)
    }
  }, [hasActiveCredentials])

  useEffect(() => {
    if (!hasActiveCredentials && !dismissedMissingCredentialsNotice) {
      toast.warning("No active provider credentials. Open Settings to authenticate and enable model selection.", {
        id: MISSING_AUTH_TOAST_ID,
        duration: Number.POSITIVE_INFINITY,
        action: onOpenSettings
          ? {
              label: "Open settings panel",
              onClick: onOpenSettings,
            }
          : undefined,
        cancel: {
          label: "Dismiss auth notice",
          onClick: () => setDismissedMissingCredentialsNotice(true),
        },
      })
      return
    }

    toast.dismiss(MISSING_AUTH_TOAST_ID)
  }, [dismissedMissingCredentialsNotice, hasActiveCredentials, onOpenSettings])

  useEffect(() => {
    if (generation.failureNotice) {
      const failureNoticeMessage =
        generation.failureNotice.category === "auth" || generation.failureNotice.category === "permission"
          ? `${generation.failureNotice.category}: ${generation.failureNotice.message}\n\nActions: ${generation.failureNotice.actions.join(" / ")}`
          : generation.failureNotice.message
      toast.dismiss(GENERATION_ERROR_TOAST_ID)
      toast.warning(failureNoticeMessage, {
        id: GENERATION_FAILURE_TOAST_ID,
      })
      return
    }

    toast.dismiss(GENERATION_FAILURE_TOAST_ID)
    if (generation.error) {
      toast.error(generation.error, { id: GENERATION_ERROR_TOAST_ID })
      return
    }
    toast.dismiss(GENERATION_ERROR_TOAST_ID)
  }, [generation.error, generation.failureNotice])

  useEffect(() => {
    return () => {
      toast.dismiss(MISSING_AUTH_TOAST_ID)
      toast.dismiss(GENERATION_ERROR_TOAST_ID)
      toast.dismiss(GENERATION_FAILURE_TOAST_ID)
    }
  }, [])

  useEffect(() => {
    setResponseFollowUpMenu(null)
  }, [focusedNodeId])

  useEffect(() => {
    if (!responseFollowUpMenu) {
      return
    }

    function handlePointerDown(event: MouseEvent): void {
      const target = event.target as HTMLElement | null
      if (target?.closest("[data-response-followup-menu='true']")) {
        return
      }
      setResponseFollowUpMenu(null)
    }

    function handleEscape(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        setResponseFollowUpMenu(null)
      }
    }

    window.addEventListener("mousedown", handlePointerDown)
    window.addEventListener("keydown", handleEscape)
    return () => {
      window.removeEventListener("mousedown", handlePointerDown)
      window.removeEventListener("keydown", handleEscape)
    }
  }, [responseFollowUpMenu])

  useEffect(() => {
    if (!editingNodeId) {
      return
    }

    function handlePointerDown(event: MouseEvent): void {
      const target = event.target as HTMLElement | null
      if (target?.closest(`[data-node-editor-id="${editingNodeId}"]`)) {
        return
      }
      setEditingNodeId(null)
    }

    window.addEventListener("mousedown", handlePointerDown)
    return () => {
      window.removeEventListener("mousedown", handlePointerDown)
    }
  }, [editingNodeId])

  useEffect(() => {
    // Keep current graph refs fresh so async callbacks read the latest state
    // without forcing new callback instances on every render.
    latestNodesRef.current = nodes
    latestEdgesRef.current = edges
  }, [edges, nodes])

  const flushStreamDeltas = useCallback(() => {
    // We group tiny token chunks and apply them once per animation frame.
    // This keeps typing/dragging smooth while text is streaming in.
    streamFlushRafRef.current = null
    if (streamDeltaBufferRef.current.size === 0) {
      return
    }

    const pending = new Map(streamDeltaBufferRef.current)
    streamDeltaBufferRef.current.clear()

    setNodes((currentNodes) => {
      let changed = false
      const nextNodes = currentNodes.map((node) => {
        const chunk = pending.get(node.id)
        if (!chunk) {
          return node
        }
        changed = true
        return {
          ...node,
          content: node.content + chunk,
        }
      })
      return changed ? nextNodes : currentNodes
    })
  }, [])

  const queueStreamDelta = useCallback(
    (nodeId: string, chunk: string) => {
      // Save incoming text by node id so one node update can include many chunks.
      if (!chunk) {
        return
      }
      const pending = streamDeltaBufferRef.current
      pending.set(nodeId, `${pending.get(nodeId) ?? ""}${chunk}`)
      if (streamFlushRafRef.current !== null) {
        return
      }
      // Schedule a single paint-time flush instead of updating on every token.
      streamFlushRafRef.current = window.requestAnimationFrame(flushStreamDeltas)
    },
    [flushStreamDeltas],
  )

  const clearQueuedStreamDelta = useCallback((nodeId: string) => {
    // When a request finishes, clear leftover buffered text for that node.
    streamDeltaBufferRef.current.delete(nodeId)
  }, [])

  useEffect(() => {
    const streamDeltaBuffer = streamDeltaBufferRef.current
    return () => {
      if (streamFlushRafRef.current !== null) {
        window.cancelAnimationFrame(streamFlushRafRef.current)
        streamFlushRafRef.current = null
      }
      streamDeltaBuffer.clear()
    }
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }

    const latestNodes = latestNodesRef.current
    const latestEdges = latestEdgesRef.current

    if (latestNodes.length < 2) {
      forceSimulationRef.current?.stop()
      forceSimulationRef.current = null
      forceNodeLookupRef.current = new Map()
      if (forceTickRafRef.current !== null) {
        window.cancelAnimationFrame(forceTickRafRef.current)
        forceTickRafRef.current = null
      }
      return
    }

    const { simulation, nodeLookup } = createForceLayoutSimulation(latestNodes, latestEdges)
    forceSimulationRef.current?.stop()
    forceSimulationRef.current = simulation
    forceNodeLookupRef.current = nodeLookup

    const flushTick = () => {
      // Apply force-layout position updates once per animation frame.
      // This keeps movement smooth and avoids overwhelming React with tiny updates.
      forceTickRafRef.current = null
      const nextPositions = pendingForcePositionsRef.current
      if (!nextPositions || nextPositions.size === 0) {
        return
      }

      setNodes((current) => {
        let changed = false
        const nextNodes = current.map((node) => {
          const position = nextPositions.get(node.id)
          if (!position) {
            return node
          }
          if (Math.abs(node.position.x - position.x) < 0.5 && Math.abs(node.position.y - position.y) < 0.5) {
            return node
          }
          changed = true
          return {
            ...node,
            position: { x: position.x, y: position.y },
          }
        })
        return changed ? nextNodes : current
      })
    }

    simulation.on("tick", () => {
      pendingForcePositionsRef.current = collectForcePositions(nodeLookup)
      if (forceTickRafRef.current !== null) {
        return
      }
      forceTickRafRef.current = window.requestAnimationFrame(flushTick)
    })

    reheatSimulation(simulation, 0.6)

    return () => {
      simulation.stop()
      if (forceTickRafRef.current !== null) {
        window.cancelAnimationFrame(forceTickRafRef.current)
        forceTickRafRef.current = null
      }
    }
  }, [forceLayoutSignature])

  useEffect(() => {
    onGraphStateChange?.(
      {
        workspaceId,
        activeCanvasId: canvasId,
        canvases,
        links,
        nodes,
        edges,
        workspaceModelPreference: {
          provider: workspaceProvider,
          model: workspaceModel,
        },
      },
      "state",
    )
  }, [
    canvasId,
    canvases,
    edges,
    links,
    nodes,
    onGraphStateChange,
    workspaceId,
    workspaceModel,
    workspaceProvider,
  ])

  // Callbacks for nodes (stable refs for memoization)
  const handleAddChild = useCallback((parentNodeId: string, initialPrompt = "", promptContextBlocks?: string[]) => {
    const parent = nodes.find((node) => node.id === parentNodeId)
    if (!parent) return

    const child = createConversationNode({
      workspaceId,
      canvasId,
      prompt: initialPrompt,
      promptContextBlocks,
      content: "",
      x: parent.position.x + (Math.random() - 0.5) * 200,
      y: parent.position.y + 180 + Math.random() * 60,
      sourceNodeId: parent.id,
    })

    setNodes((current) => [...current, child])
    // Create a graph edge right away so the child keeps context from its parent.
    setEdges((current) => [
      ...current,
      createEdge({ workspaceId, canvasId, fromNodeId: parent.id, toNodeId: child.id }),
    ])
    setTopologyVersion((version) => version + 1)
    setEditingNodeId(child.id)
    setFocusedNodeId(null)
  }, [nodes, canvasId, workspaceId])

  const handleStartPromptEdit = useCallback((nodeId: string) => {
    setEditingNodeId(nodeId)
    setFocusedNodeId(null)
  }, [])

  const handleResponseContextMenu = useCallback(
    (event: React.MouseEvent<HTMLDivElement>, nodeId: string) => {
      // Only open follow-up menu when selection exists inside this response block.
      const selection = window.getSelection()
      if (!selection || selection.rangeCount === 0) {
        setResponseFollowUpMenu(null)
        return
      }

      const selectedText = selection.toString().trim()
      const anchorNode = selection.anchorNode
      const focusNode = selection.focusNode
      if (
        !selectedText ||
        !anchorNode ||
        !focusNode ||
        !event.currentTarget.contains(anchorNode) ||
        !event.currentTarget.contains(focusNode)
      ) {
        setResponseFollowUpMenu(null)
        return
      }

      event.preventDefault()
      setResponseFollowUpMenu({
        nodeId,
        selectedText,
        x: Math.max(8, Math.min(event.clientX, window.innerWidth - 176)),
        y: Math.max(8, Math.min(event.clientY, window.innerHeight - 52)),
      })
    },
    []
  )

  const handleFollowUpFromResponseSelection = useCallback(() => {
    if (!responseFollowUpMenu) {
      return
    }
    // We store selected text as context blocks, then keep prompt input clean in the UI.
    handleAddChild(responseFollowUpMenu.nodeId, "", createFollowUpContextBlocks(responseFollowUpMenu.selectedText))
    setResponseFollowUpMenu(null)
  }, [handleAddChild, responseFollowUpMenu])

  const handleNodeResize = useCallback((nodeId: string, width: number, height: number, isFinal: boolean = true) => {
    setNodes((current) => current.map((node) => {
      if (node.id !== nodeId) {
        return node
      }

      const currentWidth = node.dimensions?.width ?? 0
      const currentHeight = node.dimensions?.height ?? 0
      if (Math.abs(currentWidth - width) < 0.5 && Math.abs(currentHeight - height) < 0.5) {
        return node
      }

      return {
        ...node,
        dimensions: { width, height },
        ...(isFinal ? { updatedAt: new Date().toISOString() } : {}),
      }
    }))

    if (isFinal) {
      // Recreate force layout once after resize completes so collision radii reflect final dimensions.
      setTopologyVersion((version) => version + 1)
      setForceLayoutNonce((value) => value + 1)
    }
  }, [])

  const handleNodeColorChange = useCallback((nodeId: string, colorToken?: string) => {
    setNodes((current) =>
      current.map((node) =>
        node.id === nodeId
          ? { ...node, colorToken, updatedAt: new Date().toISOString() }
          : node,
      ),
    )
  }, [])

  const handlePromptSubmit = useCallback(async (nodeId: string, prompt: string) => {
    // Save the newest prompt first so autosave/history reflects what user submitted.
    setNodes((current) => current.map((node) =>
      node.id === nodeId ? { ...node, prompt, updatedAt: new Date().toISOString() } : node
    ))
    setEditingNodeId(null)
    setStreamingNodeIds((streamingIds) => new Set(streamingIds).add(nodeId))

    const node = nodes.find((candidate) => candidate.id === nodeId)
    const overrides = node?.providerOverride
      ? { provider: node.providerOverride.provider, model: node.providerOverride.model }
      : undefined

    // Build full prompt from linked ancestors + manual context blocks.
    const fullPrompt = composePromptWithConversationContext(nodes, edges, nodeId, prompt, node?.promptContextBlocks)
    let text: string | null = null
    try {
      text = await generation.runIntent("prompt", fullPrompt, {
        overrides,
        onDelta: (chunk) => {
          queueStreamDelta(nodeId, chunk)
        },
      })
    } finally {
      clearQueuedStreamDelta(nodeId)
      setStreamingNodeIds((streamingIds) => {
        const next = new Set(streamingIds)
        next.delete(nodeId)
        return next
      })
    }

    if (typeof text !== "string") {
      return
    }

    setNodes((current) => current.map((candidate) =>
      candidate.id === nodeId ? { ...candidate, content: text, updatedAt: new Date().toISOString() } : candidate
    ))
  }, [nodes, edges, generation, queueStreamDelta, clearQueuedStreamDelta])

  useEffect(() => {
    if (typeof fetch !== "function") {
      return
    }

    // Keep cache bounded so stale credential/model entries do not pile up forever.
    pruneProviderModelCache()
    if (activeProviders.length === 0) {
      setCatalogProviders([])
      return
    }

    let cancelled = false
    const cachedProviders: CatalogProviderOption[] = []
    const providersToRefresh: Array<{
      providerId: string
      auth: ProviderAuthCredential
      credentialVersion: string
    }> = []

    for (const provider of activeProviders) {
      const cached = getCachedProviderModels(provider.providerId, provider.credentialVersion)
      if (cached && cached.models.length > 0) {
        cachedProviders.push({
          id: provider.providerId,
          name: cached.providerName,
          models: cached.models,
        })
      }

      if (!cached || isProviderModelCacheStale(cached, MODEL_CACHE_TTL_MS)) {
        providersToRefresh.push({
          providerId: provider.providerId,
          auth: provider.auth,
          credentialVersion: provider.credentialVersion,
        })
      }
    }

    if (cachedProviders.length > 0) {
      setCatalogProviders(sortCatalogProviders(cachedProviders))
    } else {
      setCatalogProviders([])
    }

    if (providersToRefresh.length === 0) {
      return
    }

    // Refresh only providers that are missing cache or have stale cache entries.
    void fetch("/api/providers/models", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        providers: providersToRefresh.map((provider) => ({
          providerId: provider.providerId,
          auth: provider.auth,
        })),
      }),
    })
      .then(async (response) => {
        if (!response.ok) {
          return
        }
        const payload = (await response.json()) as {
          providers?: Array<{
            providerId: string
            providerName: string
            source?: "live" | "catalog-fallback"
            models?: Array<{ id: string; name: string }>
          }>
        }
        if (!payload.providers || cancelled) {
          return
        }

        const fetchedProviders = payload.providers
          .filter((provider) => Array.isArray(provider.models))
          .map((provider) => ({
            id: provider.providerId,
            name: provider.providerName,
            models: (provider.models ?? []).map((model) => ({ id: model.id, name: model.name })),
          }))

        const refreshedProviderIds = new Set<string>()
        for (const provider of payload.providers) {
          const matchedCredential = providersToRefresh.find((entry) => entry.providerId === provider.providerId)
          if (!matchedCredential) {
            continue
          }
          refreshedProviderIds.add(provider.providerId)
          upsertCachedProviderModels({
            providerId: provider.providerId,
            providerName: provider.providerName,
            credentialVersion: matchedCredential.credentialVersion,
            models: (provider.models ?? []).map((model) => ({ id: model.id, name: model.name })),
            source: provider.source === "catalog-fallback" ? "catalog-fallback" : "live",
            updatedAt: Date.now(),
          })
        }

        // Merge fresh results over cache, then remove providers no longer authorized.
        const mergedByProvider = new Map<string, CatalogProviderOption>()
        for (const provider of cachedProviders) {
          mergedByProvider.set(provider.id, provider)
        }
        for (const provider of fetchedProviders) {
          if (provider.models.length === 0 && refreshedProviderIds.has(provider.id)) {
            mergedByProvider.delete(provider.id)
            continue
          }
          if (provider.models.length > 0) {
            mergedByProvider.set(provider.id, provider)
          }
        }

        const allowedProviderIds = new Set(activeProviders.map((provider) => provider.providerId))
        const nextProviders = Array.from(mergedByProvider.values()).filter((provider) => allowedProviderIds.has(provider.id))
        setCatalogProviders(sortCatalogProviders(nextProviders))
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [activeProviders])

  useEffect(() => {
    if (catalogProviders.length === 0) {
      return
    }

    const currentProvider = catalogProviders.find((provider) => provider.id === workspaceProvider)
    const currentModelExists = currentProvider?.models.some((model) => model.id === workspaceModel) ?? false
    if (currentProvider && currentModelExists) {
      return
    }

    const preferredProvider = catalogProviders.find((provider) => provider.id === "openai") ?? catalogProviders[0]
    const preferredModel = preferredProvider?.models[0]
    if (!preferredProvider || !preferredModel) {
      return
    }

    updateWorkspaceModelSelection(preferredProvider.id, preferredModel.id)
  }, [catalogProviders, updateWorkspaceModelSelection, workspaceModel, workspaceProvider])

  const handleInitialPrompt = useCallback(async (prompt: string) => {
    onFirstPromptSubmitted?.({
      prompt,
      provider: workspaceProvider,
      model: workspaceModel,
    })

    // First prompt creates the first canvas node.
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
    setTopologyVersion((version) => version + 1)

    let text: string | null = null
    try {
      text = await generation.runIntent("prompt", prompt, {
        onDelta: (chunk) => {
          queueStreamDelta(nodeId, chunk)
        },
      })
    } finally {
      clearQueuedStreamDelta(nodeId)
      setStreamingNodeIds(new Set())
    }

    if (typeof text !== "string") {
      return
    }

    setNodes((current) => current.map((node) =>
      node.id === nodeId ? { ...node, content: text, updatedAt: new Date().toISOString() } : node
    ))
  }, [
    onFirstPromptSubmitted,
    workspaceProvider,
    workspaceModel,
    workspaceId,
    canvasId,
    generation,
    queueStreamDelta,
    clearQueuedStreamDelta,
  ])

  const handleBatchExpand = useCallback(async (intent: "questions" | "subtopics", sourceNode: GraphNode) => {
    const raw = await generation.runIntent(intent, sourceNode.content)
    const items = parseExpandItems(raw)
    if (items.length === 0) {
      return
    }

    const childEntries = items.slice(0, 3).map((item, index) => {
      const angle = (2 * Math.PI * index) / 3 - Math.PI / 2
      const radius = 250 + Math.random() * 50
      const childX = sourceNode.position.x + Math.cos(angle) * radius + (Math.random() - 0.5) * 40
      const childY = sourceNode.position.y + Math.sin(angle) * radius + (Math.random() - 0.5) * 40

      const child = createConversationNode({
        workspaceId,
        canvasId,
        prompt: item,
        content: "",
        x: childX,
        y: childY,
        sourceNodeId: sourceNode.id,
      })

      return { child, prompt: item }
    })

    setNodes((current) => [...current, ...childEntries.map((entry) => entry.child)])
    setEdges((current) => [
      ...current,
      ...childEntries.map((entry) =>
        createEdge({ workspaceId, canvasId, fromNodeId: sourceNode.id, toNodeId: entry.child.id }),
      ),
    ])
    setStreamingNodeIds((streamingIds) => {
      const next = new Set(streamingIds)
      for (const entry of childEntries) {
        next.add(entry.child.id)
      }
      return next
    })
    setTopologyVersion((version) => version + 1)

    // Generate each child response independently so partial results show up quickly.
    for (const entry of childEntries) {
      void (async () => {
        let text: string | null = null
        try {
          text = await generation.runIntent("prompt", entry.prompt, {
            onDelta: (chunk) => {
              queueStreamDelta(entry.child.id, chunk)
            },
          })
        } finally {
          clearQueuedStreamDelta(entry.child.id)
          setStreamingNodeIds((streamingIds) => {
            const next = new Set(streamingIds)
            next.delete(entry.child.id)
            return next
          })
        }

        if (typeof text !== "string") {
          return
        }

        setNodes((current) => current.map((node) =>
          node.id === entry.child.id ? { ...node, content: text, updatedAt: new Date().toISOString() } : node
        ))
      })()
    }
  }, [generation, workspaceId, canvasId, queueStreamDelta, clearQueuedStreamDelta])

  const handleSummarize = useCallback(async (nodeId: string) => {
    const node = nodes.find((candidate) => candidate.id === nodeId)
    if (!node) return
    setStreamingNodeIds((streamingIds) => new Set(streamingIds).add(nodeId))
    // Clear old response so users can immediately see new summary is in progress.
    setNodes((current) => current.map((candidate) => candidate.id === nodeId ? { ...candidate, content: "" } : candidate))

    let text: string | null = null
    try {
      text = await generation.runIntent("summarize", node.content, {
        onDelta: (chunk) => {
          queueStreamDelta(nodeId, chunk)
        },
      })
    } finally {
      clearQueuedStreamDelta(nodeId)
      setStreamingNodeIds((streamingIds) => {
        const next = new Set(streamingIds)
        next.delete(nodeId)
        return next
      })
    }

    if (typeof text !== "string") {
      return
    }

    setNodes((current) => current.map((candidate) =>
      candidate.id === nodeId ? { ...candidate, content: text, updatedAt: new Date().toISOString() } : candidate
    ))
  }, [nodes, generation, queueStreamDelta, clearQueuedStreamDelta])

  const handleRegenerate = useCallback(async (nodeId: string) => {
    const node = nodes.find((candidate) => candidate.id === nodeId)
    if (!node?.prompt) return
    setStreamingNodeIds((streamingIds) => new Set(streamingIds).add(nodeId))
    // Clear stale content before replaying generation with current context.
    setNodes((current) => current.map((candidate) => candidate.id === nodeId ? { ...candidate, content: "" } : candidate))

    const overrides = node.providerOverride
      ? { provider: node.providerOverride.provider, model: node.providerOverride.model }
      : undefined

    const fullPrompt = composePromptWithConversationContext(
      nodes,
      edges,
      nodeId,
      node.prompt,
      node.promptContextBlocks,
    )

    let text: string | null = null
    try {
      text = await generation.runIntent("prompt", fullPrompt, {
        overrides,
        onDelta: (chunk) => {
          queueStreamDelta(nodeId, chunk)
        },
      })
    } finally {
      clearQueuedStreamDelta(nodeId)
      setStreamingNodeIds((streamingIds) => {
        const next = new Set(streamingIds)
        next.delete(nodeId)
        return next
      })
    }

    if (typeof text !== "string") {
      return
    }

    setNodes((current) => current.map((candidate) =>
      candidate.id === nodeId ? { ...candidate, content: text, updatedAt: new Date().toISOString() } : candidate
    ))
  }, [nodes, edges, generation, queueStreamDelta, clearQueuedStreamDelta])

  const handleDeleteNode = useCallback((nodeId: string) => {
    setNodes((current) => current.filter((node) => node.id !== nodeId))
    setEdges((current) => current.filter((edge) => edge.fromNodeId !== nodeId && edge.toNodeId !== nodeId))
    setTopologyVersion((version) => version + 1)
    setFocusedNodeId((current) => (current === nodeId ? null : current))
  }, [])

  const rfNodes = useMemo(
    () =>
      toRFNodes(nodes, {
        semanticLevel: "all",
        semanticMode: "manual",
        selectedIds: selection.nodeIds,
        onAddChild: handleAddChild,
        onRegenerate: (nodeId) => {
          void handleRegenerate(nodeId)
        },
        onDeleteNode: handleDeleteNode,
        onSetColor: handleNodeColorChange,
        onPromptEditStart: handleStartPromptEdit,
        onPromptSubmit: handlePromptSubmit,
        onResize: handleNodeResize,
        streamingNodeIds,
        editingNodeId,
        focusedNodeId,
      }),
    [
      nodes,
      selection.nodeIds,
      handleAddChild,
      handleRegenerate,
      handleDeleteNode,
      handleNodeColorChange,
      handleStartPromptEdit,
      handlePromptSubmit,
      handleNodeResize,
      streamingNodeIds,
      editingNodeId,
      focusedNodeId,
    ],
  )

  const rfEdges = useMemo(() => toRFEdges(edges), [edges])

  const onNodesChange: OnNodesChange = useCallback((changes) => {
    // React Flow can send many node changes in one event.
    // We collect everything first, then write state once for better performance.
    const positionChanges = new Map<string, { x: number; y: number; isFinal: boolean }>()
    const dimensionChanges = new Map<string, { width: number; height: number }>()
    const removedNodeIds = new Set<string>()
    const selectedIdsToAdd = new Set<string>()
    const selectedIdsToRemove = new Set<string>()

    for (const change of changes) {
      if (change.type === "position" && change.position) {
        const isFinal = !change.dragging
        updateForceNodePosition(forceNodeLookupRef.current, change.id, change.position.x, change.position.y)
        if (change.dragging) {
          pinForceNode(forceNodeLookupRef.current, change.id, change.position.x, change.position.y)
        } else {
          releaseForceNode(forceNodeLookupRef.current, change.id)
          reheatSimulation(forceSimulationRef.current)
        }
        positionChanges.set(change.id, {
          x: change.position.x,
          y: change.position.y,
          isFinal,
        })
      }
      if (change.type === "select") {
        if (change.selected) {
          selectedIdsToAdd.add(change.id)
          selectedIdsToRemove.delete(change.id)
        } else {
          selectedIdsToRemove.add(change.id)
          selectedIdsToAdd.delete(change.id)
        }
      }
      if (change.type === "remove") {
        removedNodeIds.add(change.id)
      }
      if (change.type === "dimensions" && change.dimensions) {
        dimensionChanges.set(change.id, { width: change.dimensions.width, height: change.dimensions.height })
      }
    }

    if (positionChanges.size > 0 || dimensionChanges.size > 0 || removedNodeIds.size > 0) {
      const now = new Date().toISOString()
      setNodes((currentNodes) => {
        let changed = false
        let nextNodes = currentNodes

        if (removedNodeIds.size > 0) {
          const filtered = nextNodes.filter((node) => !removedNodeIds.has(node.id))
          if (filtered.length !== nextNodes.length) {
            changed = true
            nextNodes = filtered
          }
        }

        const mappedNodes = nextNodes.map((node) => {
          const position = positionChanges.get(node.id)
          const dimensions = dimensionChanges.get(node.id)
          let updatedNode = node

          if (position) {
            updatedNode = {
              ...updatedNode,
              position: { x: position.x, y: position.y },
              ...(position.isFinal ? { updatedAt: now } : {}),
            }
          }

          if (dimensions && !updatedNode.dimensions) {
            updatedNode = {
              ...updatedNode,
              dimensions: { width: dimensions.width, height: dimensions.height },
            }
          }

          if (updatedNode !== node) {
            changed = true
          }

          return updatedNode
        })

        return changed ? mappedNodes : currentNodes
      })
    }

    if (selectedIdsToAdd.size > 0 || selectedIdsToRemove.size > 0 || removedNodeIds.size > 0) {
      setSelection((currentSelection) => {
        const nextIds = new Set(currentSelection.nodeIds)
        for (const nodeId of selectedIdsToAdd) {
          nextIds.add(nodeId)
        }
        for (const nodeId of selectedIdsToRemove) {
          nextIds.delete(nodeId)
        }
        for (const nodeId of removedNodeIds) {
          nextIds.delete(nodeId)
        }
        return { ...currentSelection, nodeIds: Array.from(nextIds) }
      })
    }

    if (removedNodeIds.size > 0) {
      setEdges((currentEdges) =>
        currentEdges.filter((edge) => !removedNodeIds.has(edge.fromNodeId) && !removedNodeIds.has(edge.toNodeId)),
      )
      setTopologyVersion((version) => version + 1)
      setFocusedNodeId((currentFocusedNodeId) =>
        currentFocusedNodeId && removedNodeIds.has(currentFocusedNodeId) ? null : currentFocusedNodeId,
      )
    }
  }, [])

  const onEdgesChange: OnEdgesChange = useCallback((changes) => {
    let removed = false
    for (const change of changes) {
      if (change.type === "remove") {
        removed = true
        setEdges((current) => current.filter((edge) => edge.id !== change.id))
      }
    }
    if (removed) {
      // A removed edge changes graph structure, so force layout should re-run.
      setTopologyVersion((version) => version + 1)
    }
  }, [])

  const onConnect: OnConnect = useCallback((connection) => {
    if (!connection.source || !connection.target) return

    let added = false
    setEdges((current) => {
      if (
        !isValidGraphConnection({
          sourceId: connection.source,
          targetId: connection.target,
          edges: current,
        })
      ) {
        return current
      }

      added = true
      return [
        ...current,
        createEdge({ workspaceId, canvasId, fromNodeId: connection.source, toNodeId: connection.target }),
      ]
    })

    if (added) {
      // New edge means a new graph topology; reheat simulation for quick settle.
      setTopologyVersion((version) => version + 1)
      reheatSimulation(forceSimulationRef.current, 0.72)
    }
  }, [canvasId, workspaceId])

  const onConnectEnd: OnConnectEnd = useCallback((event, connectionState: FinalConnectionState) => {
    if (!connectionState.fromNode || connectionState.toNode) {
      return
    }

    const fromNodeId = connectionState.fromNode.id
    if (!fromNodeId) {
      return
    }

    const clientPosition = getClientPosition(event)
    const fromPosition = connectionState.from ?? connectionState.pointer ?? { x: 0, y: 0 }
    // If pointer location is missing, fall back to a reasonable offset from source.
    const dropPosition = clientPosition
      ? screenToFlowPosition(clientPosition)
      : (connectionState.pointer ?? {
          x: fromPosition.x + 220,
          y: fromPosition.y + 140,
        })

    const child = createConversationNode({
      workspaceId,
      canvasId,
      prompt: "",
      content: "",
      x: dropPosition.x - 150,
      y: dropPosition.y - 110,
      sourceNodeId: fromNodeId,
    })

    const isSourceStart = connectionState.fromHandle?.type !== "target"
    const edgeFrom = isSourceStart ? fromNodeId : child.id
    const edgeTo = isSourceStart ? child.id : fromNodeId

    setNodes((current) => [...current, child])
    setEdges((current) => {
      if (!isValidGraphConnection({ sourceId: edgeFrom, targetId: edgeTo, edges: current })) {
        return current
      }
      return [
        ...current,
        createEdge({
          workspaceId,
          canvasId,
          fromNodeId: edgeFrom,
          toNodeId: edgeTo,
        }),
      ]
    })

    setEditingNodeId(child.id)
    setFocusedNodeId(null)
    setTopologyVersion((version) => version + 1)
    reheatSimulation(forceSimulationRef.current, 0.72)
  }, [canvasId, screenToFlowPosition, workspaceId])

  const isValidConnection = useCallback(
    (connection: Connection | RFEdge) => isValidReactFlowConnection(connection, edges),
    [edges]
  )

  const onNodeDragStart: OnNodeDrag = useCallback((_event, node: Node) => {
    pinForceNode(forceNodeLookupRef.current, node.id, node.position.x, node.position.y)
    reheatSimulation(forceSimulationRef.current, 0.75)
  }, [])

  const onNodeDrag: OnNodeDrag = useCallback((_event, node: Node) => {
    pinForceNode(forceNodeLookupRef.current, node.id, node.position.x, node.position.y)
  }, [])

  const onNodeDragStop: OnNodeDrag = useCallback((_event, node: Node) => {
    updateForceNodePosition(forceNodeLookupRef.current, node.id, node.position.x, node.position.y)
    releaseForceNode(forceNodeLookupRef.current, node.id)
    reheatSimulation(forceSimulationRef.current, 0.55)
  }, [])

  const onNodeClick: NodeMouseHandler = useCallback((_event, node) => {
    if (editingNodeId === node.id) return // don't open panel while editing
    setFocusedNodeId((current) => (current === node.id ? null : node.id))
  }, [editingNodeId])

  const onPaneClick = useCallback(() => {
    setFocusedNodeId(null)
    setEditingNodeId(null)
    setResponseFollowUpMenu(null)
  }, [])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return

      const mod = e.metaKey || e.ctrlKey

      if (e.key === "Backspace" && !mod) {
        for (const id of selection.nodeIds) {
          handleDeleteNode(id)
        }
        return
      }

      if (mod && e.key === "a") {
        e.preventDefault()
        setSelection({ nodeIds: nodes.map((node) => node.id), edgeIds: [], lassoBounds: null })
        return
      }

      if (e.key === "Escape") {
        setSelection(createSelectionState())
        setFocusedNodeId(null)
        setEditingNodeId(null)
        return
      }

    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [selection.nodeIds, nodes, handleDeleteNode])

  return (
    <div className="relative h-full">
      {/* Central prompt bar when canvas is empty */}
      {nodes.length === 0 ? (
        <CentralPromptBar
          onSubmit={handleInitialPrompt}
          disabled={generation.isStreaming}
          modelOptions={initialModelOptions}
          selectedModelValue={`${workspaceProvider}::${workspaceModel}`}
          recentChats={recentChats}
          onResumeChat={onResumeChat}
          onSelectModel={(value) => {
            const descriptor = modelValueToDescriptor.get(value)
            if (!descriptor) {
              return
            }
            updateWorkspaceModelSelection(descriptor.providerId, descriptor.modelId)
          }}
        />
      ) : null}

      {/* Canvas */}
      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onConnectEnd={onConnectEnd}
        isValidConnection={isValidConnection}
        connectionMode={ConnectionMode.Loose}
        onNodeClick={onNodeClick}
        onNodeDragStart={onNodeDragStart}
        onNodeDrag={onNodeDrag}
        onNodeDragStop={onNodeDragStop}
        onPaneClick={onPaneClick}
        deleteKeyCode="Delete"
        defaultEdgeOptions={{ type: "floating", animated: false }}
        panOnDrag
        nodesDraggable
        selectionOnDrag={false}
        connectOnClick={false}
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

      {/* Node detail panel */}
      {focusedNode ? (
        <aside
          className="absolute top-3 z-20 w-[min(24rem,calc(100vw-1.5rem))] max-h-[calc(100%-1.5rem)] overflow-y-auto rounded-lg border border-border bg-background/95 shadow-xl backdrop-blur-xs animate-in fade-in-0 slide-in-from-right-2 duration-200"
          aria-label="Node detail panel"
          style={{ right: `${nodePanelRightPx}px` }}
        >
          {/* Header */}
          <div className="flex items-center gap-2 border-b border-border px-3 py-2">
            <span className="text-sm">{getNodeVisualSpec(focusedNode.type).icon}</span>
            <span className="text-xs font-semibold">{getNodeVisualSpec(focusedNode.type).typeLabel}</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="ml-auto h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
              onClick={() => setFocusedNodeId(null)}
              aria-label="Close panel"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
            </Button>
          </div>

          {/* Prompt */}
          <div className="border-b border-border p-3">
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Prompt</label>
            {focusedNodeContextBlocks.length > 0 ? (
              <div className="mb-2 rounded-md border border-border/70 bg-muted/40 px-2 py-1.5" data-testid="node-panel-context-blocks">
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Context
                </p>
                <div className="max-h-28 space-y-1 overflow-y-auto">
                  {focusedNodeContextBlocks.map((contextBlock, index) => (
                    <blockquote
                      key={`${focusedNode.id}:panel-context:${index}`}
                      className="rounded-sm border-l-2 border-primary/40 pl-2 text-[11px] leading-relaxed text-muted-foreground whitespace-pre-wrap"
                    >
                      {contextBlock}
                    </blockquote>
                  ))}
                </div>
              </div>
            ) : null}
            <Textarea
              className="h-24 resize-y text-xs font-medium text-foreground"
              value={focusedNode.prompt ?? ""}
              aria-label="Node prompt"
              onChange={(e) => {
                const next = e.target.value
                setNodes((current) => current.map((n) =>
                  n.id === focusedNode.id ? { ...n, prompt: next, updatedAt: new Date().toISOString() } : n
                ))
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault()
                  const nextPrompt = event.currentTarget.value.trim()
                  if (!nextPrompt) {
                    return
                  }
                  void handlePromptSubmit(focusedNode.id, nextPrompt)
                }
              }}
            />
            <p className="mt-1 text-[10px] text-muted-foreground">Enter to regenerate, Shift+Enter for newline.</p>
          </div>

          {/* Response (read-only) */}
          <div className="border-b border-border p-3">
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Response</label>
            <div
              className="researchlm-markdown max-h-60 overflow-y-auto rounded border border-border bg-card p-2 text-sm"
              data-testid="node-response-markdown"
              onContextMenu={(event) => handleResponseContextMenu(event, focusedNode.id)}
            >
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{focusedNode.content || "_No response yet_"}</ReactMarkdown>
            </div>
            <p className="mt-1 text-[10px] text-muted-foreground">Select response text and right-click to follow up.</p>
          </div>

          {/* Expand actions */}
          <div className="border-b border-border p-3">
            <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Explore</label>
            <div className="flex flex-wrap gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 px-2 text-xs"
                disabled={generation.isStreaming || !focusedNode.content}
                onClick={() => void handleBatchExpand("questions", focusedNode)}
              >
                Questions
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 px-2 text-xs"
                disabled={generation.isStreaming || !focusedNode.content}
                onClick={() => void handleBatchExpand("subtopics", focusedNode)}
              >
                Subtopics
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 px-2 text-xs"
                disabled={generation.isStreaming || !focusedNode.content}
                onClick={() => void handleSummarize(focusedNode.id)}
              >
                Summarize
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 px-2 text-xs"
                disabled={generation.isStreaming || !focusedNode.prompt}
                onClick={() => void handleRegenerate(focusedNode.id)}
              >
                Regenerate
              </Button>
            </div>
          </div>

          {/* Color picker */}
          <div className="border-b border-border p-3">
            <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Color</label>
            <div className="flex flex-wrap gap-1.5">
              {COLOR_PRESETS.map((preset) => (
                <Tooltip key={preset.label}>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      aria-label={`Set ${preset.label} color`}
                      className={`h-6 w-6 rounded-full border-2 ${focusedNode.colorToken === preset.value || (!focusedNode.colorToken && !preset.value) ? "border-primary" : "border-border"}`}
                      style={{ background: preset.value || "var(--node-topic-bg)" }}
                      onClick={() => {
                        setNodes((current) => current.map((n) =>
                          n.id === focusedNode.id ? { ...n, colorToken: preset.value || undefined, updatedAt: new Date().toISOString() } : n
                        ))
                      }}
                    />
                  </TooltipTrigger>
                  <TooltipContent side="top">{preset.label}</TooltipContent>
                </Tooltip>
              ))}
            </div>
          </div>

          {/* Model override */}
          <div className="border-b border-border p-3">
            <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Model</label>
            <Select
              value={
                focusedNode.providerOverride
                  ? `${focusedNode.providerOverride.provider}::${focusedNode.providerOverride.model}`
                  : "__workspace_default__"
              }
              onValueChange={(modelValue) => {
                setNodes((current) => current.map((n) =>
                  n.id === focusedNode.id
                    ? {
                        ...n,
                        providerOverride:
                          modelValue === "__workspace_default__"
                            ? undefined
                            : (() => {
                                const descriptor = modelValueToDescriptor.get(modelValue)
                                if (!descriptor) {
                                  return undefined
                                }
                                return { provider: descriptor.providerId, model: descriptor.modelId }
                              })(),
                        updatedAt: new Date().toISOString(),
                      }
                    : n
                ))
              }}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__workspace_default__">
                  Workspace default ({workspaceProvider}/{workspaceModel})
                </SelectItem>
                {catalogProviders.map((provider) => (
                  <SelectGroup key={provider.id}>
                    <SelectLabel>{provider.name}</SelectLabel>
                    {provider.models.map((model) => (
                      <SelectItem key={`${provider.id}:${model.id}`} value={`${provider.id}::${model.id}`}>
                        {model.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Delete */}
          <div className="p-3">
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="h-8 w-full text-xs"
              onClick={() => handleDeleteNode(focusedNode.id)}
            >
              Delete node
            </Button>
            <div className="mt-2 text-[10px] text-muted-foreground">
              <p>ID: {focusedNode.id.slice(0, 8)}...</p>
              <p>Position: ({Math.round(focusedNode.position.x)}, {Math.round(focusedNode.position.y)})</p>
            </div>
          </div>
        </aside>
      ) : null}

      {responseFollowUpMenu ? (
        <div
          className="fixed z-40 rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-lg animate-in fade-in-0 zoom-in-95 duration-150"
          data-response-followup-menu="true"
          style={{ left: `${responseFollowUpMenu.x}px`, top: `${responseFollowUpMenu.y}px` }}
        >
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={handleFollowUpFromResponseSelection}
              >
                Follow up
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs text-xs">
              {responseFollowUpMenu.selectedText}
            </TooltipContent>
          </Tooltip>
        </div>
      ) : null}

    </div>
  )
}

export function CanvasBoard(props: CanvasBoardProps) {
  return (
    <ReactFlowProvider>
      <TooltipProvider>
        <CanvasBoardInner {...props} />
      </TooltipProvider>
    </ReactFlowProvider>
  )
}
