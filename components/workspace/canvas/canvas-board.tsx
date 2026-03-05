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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
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
  const lines = raw.split("\n").map((l) => l.replace(/^\d+[\.\)]\s*/, "").trim()).filter(Boolean)
  return lines.slice(0, 3)
}

function getClientPosition(event: MouseEvent | TouchEvent): { x: number; y: number } | null {
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
  const [forceLayoutNonce, setForceLayoutNonce] = useState(0)
  const forceSimulationRef = useRef<ForceLayoutSimulation | null>(null)
  const forceNodeLookupRef = useRef<Map<string, ForceLayoutNode>>(new Map())
  const forceTickRafRef = useRef<number | null>(null)
  const pendingForcePositionsRef = useRef<Map<string, { x: number; y: number }> | null>(null)
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

  const focusedNode = focusedNodeId ? nodes.find((n) => n.id === focusedNodeId) ?? null : null
  const focusedNodeContextBlocks = (focusedNode?.promptContextBlocks ?? [])
    .map((block) => block.trim())
    .filter((block) => block.length > 0)
  const nodePanelRightPx = settingsPanelOpen ? settingsPanelWidthPx + 24 : 12
  const forceLayoutSignature = useMemo(() => {
    const nodeShapeSignature = [...nodes]
      .sort((left, right) => left.id.localeCompare(right.id))
      .map((node) => node.id)
      .join("|")

    const edgeSignature = [...edges]
      .sort((left, right) => left.id.localeCompare(right.id))
      .map((edge) => `${edge.fromNodeId}->${edge.toNodeId}`)
      .join("|")

    return `${nodeShapeSignature}::${edgeSignature}::${forceLayoutNonce}`
  }, [edges, forceLayoutNonce, nodes])

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
      toast.dismiss(GENERATION_ERROR_TOAST_ID)
      toast.warning(generation.failureNotice.message, {
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
    if (typeof window === "undefined") {
      return
    }

    if (nodes.length < 2) {
      forceSimulationRef.current?.stop()
      forceSimulationRef.current = null
      forceNodeLookupRef.current = new Map()
      if (forceTickRafRef.current !== null) {
        window.cancelAnimationFrame(forceTickRafRef.current)
        forceTickRafRef.current = null
      }
      return
    }

    const { simulation, nodeLookup } = createForceLayoutSimulation(nodes, edges)
    forceSimulationRef.current?.stop()
    forceSimulationRef.current = simulation
    forceNodeLookupRef.current = nodeLookup

    const flushTick = () => {
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
    const parent = nodes.find((n) => n.id === parentNodeId)
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
    setEdges((current) => [
      ...current,
      createEdge({ workspaceId, canvasId, fromNodeId: parent.id, toNodeId: child.id }),
    ])
    setEditingNodeId(child.id)
    setFocusedNodeId(null)
  }, [nodes, canvasId, workspaceId])

  const handleStartPromptEdit = useCallback((nodeId: string) => {
    setEditingNodeId(nodeId)
    setFocusedNodeId(null)
  }, [])

  const handleResponseContextMenu = useCallback(
    (event: React.MouseEvent<HTMLDivElement>, nodeId: string) => {
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
    handleAddChild(responseFollowUpMenu.nodeId, "", createFollowUpContextBlocks(responseFollowUpMenu.selectedText))
    setResponseFollowUpMenu(null)
  }, [handleAddChild, responseFollowUpMenu])

  const handleNodeResize = useCallback((nodeId: string, width: number, height: number, isFinal: boolean = true) => {
    setNodes((current) => current.map((n) => {
      if (n.id !== nodeId) {
        return n
      }

      const currentWidth = n.dimensions?.width ?? 0
      const currentHeight = n.dimensions?.height ?? 0
      if (Math.abs(currentWidth - width) < 0.5 && Math.abs(currentHeight - height) < 0.5) {
        return n
      }

      return {
        ...n,
        dimensions: { width, height },
        ...(isFinal ? { updatedAt: new Date().toISOString() } : {}),
      }
    }))

    if (isFinal) {
      // Recreate force layout once after resize completes so collision radii reflect final dimensions.
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
    setNodes((current) => current.map((n) =>
      n.id === nodeId ? { ...n, prompt, updatedAt: new Date().toISOString() } : n
    ))
    setEditingNodeId(null)
    setStreamingNodeIds((s) => new Set(s).add(nodeId))

    const node = nodes.find((n) => n.id === nodeId)
    const overrides = node?.providerOverride
      ? { provider: node.providerOverride.provider, model: node.providerOverride.model }
      : undefined

    const fullPrompt = composePromptWithConversationContext(nodes, edges, nodeId, prompt, node?.promptContextBlocks)

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
  }, [nodes, edges, generation])

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
    ]
  )

  const rfEdges = useMemo(() => toRFEdges(edges), [edges])

  useEffect(() => {
    if (typeof fetch !== "function") {
      return
    }

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

  // --- Initial prompt from central bar ---
  async function handleInitialPrompt(prompt: string) {
    onFirstPromptSubmitted?.({
      prompt,
      provider: workspaceProvider,
      model: workspaceModel,
    })

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
  }

  // --- Regenerate ---
  async function handleRegenerate(nodeId: string) {
    const node = nodes.find((n) => n.id === nodeId)
    if (!node?.prompt) return
    setStreamingNodeIds((s) => new Set(s).add(nodeId))
    setNodes((current) => current.map((n) => n.id === nodeId ? { ...n, content: "" } : n))

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
  }

  // --- Delete node ---
  function handleDeleteNode(nodeId: string) {
    setNodes((current) => current.filter((n) => n.id !== nodeId))
    setEdges((current) => current.filter((e) => e.fromNodeId !== nodeId && e.toNodeId !== nodeId))
    if (focusedNodeId === nodeId) setFocusedNodeId(null)
  }

  // --- React Flow event handlers ---
  const onNodesChange: OnNodesChange = useCallback((changes) => {
    for (const change of changes) {
      if (change.type === "position" && change.position) {
        // Update position on every frame during drag for smooth movement
        const isFinal = !change.dragging
        updateForceNodePosition(forceNodeLookupRef.current, change.id, change.position.x, change.position.y)
        if (change.dragging) {
          pinForceNode(forceNodeLookupRef.current, change.id, change.position.x, change.position.y)
        } else {
          releaseForceNode(forceNodeLookupRef.current, change.id)
          reheatSimulation(forceSimulationRef.current)
        }
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
      // Capture initial auto-measurement from React Flow to make nodes resizable.
      // User resize persistence is handled by NodeResizer onResizeEnd.
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

      // Escape — deselect all, close detail panel, and stop inline prompt editing
      if (e.key === "Escape") {
        setSelection(createSelectionState())
        setFocusedNodeId(null)
        setEditingNodeId(null)
        return
      }

    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [selection.nodeIds, nodes])

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
      <CanvasBoardInner {...props} />
    </ReactFlowProvider>
  )
}
