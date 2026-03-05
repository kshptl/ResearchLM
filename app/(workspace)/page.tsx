"use client"

import React from "react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Moon, Sun } from "lucide-react"
import { CanvasBoard, type CanvasGraphState, type CatalogProviderOption } from "@/components/workspace/canvas/canvas-board"
import { ProviderCredentialsForm } from "@/components/workspace/provider-settings/provider-credentials-form"
import { Button } from "@/components/ui/button"
import { Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList } from "@/components/ui/combobox"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { useTheme } from "next-themes"
import {
  DEFAULT_WORKSPACE_MODEL_PREFERENCE,
  readWorkspaceDefaultModelPreference,
  subscribeWorkspaceDefaultModelPreference,
  writeWorkspaceDefaultModelPreference,
  type WorkspaceDefaultModelPreference,
} from "@/features/generation/default-model-preference"
import { consumeGenerationStream } from "@/features/generation/stream-consumer"
import type { Canvas, Edge as DomainEdge, GraphNode, HierarchyLink } from "@/features/graph-model/types"
import { persistenceRepository } from "@/features/persistence/repository"
import { createWorkspaceSnapshotRecord, loadLatestWorkspaceSnapshot } from "@/features/persistence/workspace-persistence-service"
import {
  getCredentialAuth,
  listCredentials,
  revokeCredential,
  saveCredential,
  saveCredentialAuth,
  type StoredCredential
} from "@/lib/auth/credential-store"
import type { GenerationRequestAuth, ProviderAuthCredential } from "@/lib/auth/auth-types"
import type { ChatSessionRecord } from "@/lib/idb/database"
import { toast } from "sonner"

const ACTIVE_CHAT_SETTING_ID = "researchlm:active-chat-id"
const DEFAULT_CHAT_TITLE = "New Chat"
const TITLE_GENERATION_PLACEHOLDER = "Generating title..."
const AUTOSAVE_DEBOUNCE_MS = 300
const SETTINGS_PANEL_WIDTH_DEFAULT = 320

type SnapshotPayload = {
  canvases?: unknown
  links?: unknown
  nodes?: unknown
  edges?: unknown
  activeCanvasId?: unknown
  workspaceModelPreference?: unknown
}

function createId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }
  return `chat:${Math.random().toString(36).slice(2, 10)}`
}

function rootCanvas(workspaceId: string): Canvas {
  const now = new Date().toISOString()
  return {
    id: "root",
    workspaceId,
    topic: "Root Topic",
    depth: 0,
    createdAt: now,
    updatedAt: now
  }
}

function createEmptyGraphState(workspaceId: string): CanvasGraphState {
  return {
    workspaceId,
    activeCanvasId: "root",
    canvases: [rootCanvas(workspaceId)],
    links: [],
    nodes: [],
    edges: [],
  }
}

function normalizeProviderId(providerId: string): string {
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

function toStreamAuth(auth: ProviderAuthCredential): GenerationRequestAuth {
  switch (auth.type) {
    case "api":
      return { type: "api-key", credential: auth.key }
    case "oauth":
      return {
        type: "oauth",
        access: auth.access,
        refresh: auth.refresh,
        expires: auth.expires,
        accountId: auth.accountId,
        enterpriseUrl: auth.enterpriseUrl,
      }
    case "wellknown":
      return {
        type: "wellknown",
        key: auth.key,
        token: auth.token,
      }
    case "aws-profile":
      return {
        type: "aws-profile",
        profile: auth.profile,
        region: auth.region,
      }
    case "aws-env-chain":
      return {
        type: "aws-env-chain",
        region: auth.region,
      }
    default:
      return { type: "api-key", credential: "" }
  }
}

function resolveProviderAuth(credentials: StoredCredential[], providerId: string): GenerationRequestAuth | undefined {
  const canonical = normalizeProviderId(providerId)
  const active = credentials
    .filter((credential) => credential.status === "active")
    .map((credential) => ({ credential, canonicalProvider: normalizeProviderId(credential.provider) }))
    .filter((entry) => entry.canonicalProvider === canonical)
    .sort((left, right) => right.credential.updatedAt.localeCompare(left.credential.updatedAt))

  const auth = active.length > 0 ? getCredentialAuth(active[0].credential) : undefined
  if (!auth) {
    return undefined
  }
  return toStreamAuth(auth)
}

function fallbackTitleFromPrompt(prompt: string): string {
  const compact = prompt.replace(/\s+/g, " ").trim()
  if (!compact) {
    return "Untitled Chat"
  }
  if (compact.length <= 72) {
    return compact
  }
  return `${compact.slice(0, 69)}...`
}

function sanitizeGeneratedTitle(raw: string, fallbackPrompt: string): string {
  const cleaned = raw
    .replace(/^[\"'`]+|[\"'`]+$/g, "")
    .replace(/\s+/g, " ")
    .trim()

  if (!cleaned) {
    return fallbackTitleFromPrompt(fallbackPrompt)
  }

  if (cleaned.length <= 72) {
    return cleaned
  }

  return `${cleaned.slice(0, 69)}...`
}

function parseSnapshot(workspaceId: string, payload: SnapshotPayload | undefined): CanvasGraphState {
  const canvases = Array.isArray(payload?.canvases) ? (payload.canvases as Canvas[]) : [rootCanvas(workspaceId)]
  const links = Array.isArray(payload?.links) ? (payload.links as HierarchyLink[]) : []
  const nodes = Array.isArray(payload?.nodes) ? (payload.nodes as GraphNode[]) : []
  const edges = Array.isArray(payload?.edges) ? (payload.edges as DomainEdge[]) : []
  const activeCanvasId = typeof payload?.activeCanvasId === "string" ? payload.activeCanvasId : "root"
  const workspaceModelPreference =
    payload?.workspaceModelPreference &&
    typeof payload.workspaceModelPreference === "object" &&
    payload.workspaceModelPreference !== null &&
    typeof (payload.workspaceModelPreference as { provider?: unknown }).provider === "string" &&
    typeof (payload.workspaceModelPreference as { model?: unknown }).model === "string"
      ? {
          provider: (payload.workspaceModelPreference as { provider: string }).provider,
          model: (payload.workspaceModelPreference as { model: string }).model,
        }
      : undefined

  return {
    workspaceId,
    activeCanvasId,
    canvases: canvases.length > 0 ? canvases : [rootCanvas(workspaceId)],
    links,
    nodes,
    edges,
    workspaceModelPreference,
  }
}

function upsertSortedSessions(current: ChatSessionRecord[], next: ChatSessionRecord): ChatSessionRecord[] {
  const byId = new Map(current.map((session) => [session.id, session]))
  byId.set(next.id, next)
  return Array.from(byId.values()).sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
}

export default function WorkspacePage() {
  const { resolvedTheme, setTheme } = useTheme()
  const draftChatIdRef = useRef(createId())
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settingsPanelWidthPx, setSettingsPanelWidthPx] = useState(SETTINGS_PANEL_WIDTH_DEFAULT)
  const [credentials, setCredentials] = useState<StoredCredential[]>([])
  const [chatSessions, setChatSessions] = useState<ChatSessionRecord[]>([])
  const [activeChatId, setActiveChatId] = useState<string>(draftChatIdRef.current)
  const [activeChatTitle, setActiveChatTitle] = useState(DEFAULT_CHAT_TITLE)
  const [initialGraphState, setInitialGraphState] = useState<CanvasGraphState | null>(
    createEmptyGraphState(draftChatIdRef.current),
  )
  const [boardKey, setBoardKey] = useState<string>(`chat:${draftChatIdRef.current}:bootstrap`)
  const [isHydrated, setIsHydrated] = useState(true)
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState("")
  const [autosaveStatus, setAutosaveStatus] = useState<"idle" | "saving" | "error">("idle")
  const [catalogProviders, setCatalogProviders] = useState<CatalogProviderOption[]>([])
  const [workspaceDefaultModel, setWorkspaceDefaultModel] = useState<WorkspaceDefaultModelPreference>(
    () => readWorkspaceDefaultModelPreference(DEFAULT_WORKSPACE_MODEL_PREFERENCE),
  )
  const settingsPanelRef = useRef<HTMLElement | null>(null)
  const autosaveTimerRef = useRef<number | null>(null)
  const latestGraphRef = useRef<CanvasGraphState | null>(null)
  const persistCurrentChatRef = useRef(false)
  const activeChatIdRef = useRef(draftChatIdRef.current)
  const activeChatTitleRef = useRef(DEFAULT_CHAT_TITLE)
  const workspaceModelRef = useRef(workspaceDefaultModel)
  const titleGenerationPendingRef = useRef<Promise<void> | null>(null)

  const workspaceDefaultModelValue = `${workspaceDefaultModel.provider}::${workspaceDefaultModel.model}`
  const modelValueToDescriptor = useMemo(() => {
    const map = new Map<string, { providerId: string; modelId: string }>()
    for (const provider of catalogProviders) {
      for (const model of provider.models) {
        map.set(`${provider.id}::${model.id}`, { providerId: provider.id, modelId: model.id })
      }
    }
    return map
  }, [catalogProviders])
  const defaultModelOptions = useMemo(
    () =>
      catalogProviders.flatMap((provider) =>
        provider.models.map((model) => ({
          id: `${provider.id}::${model.id}`,
          label: `${provider.name} / ${model.name}`,
        })),
      ),
    [catalogProviders],
  )
  const selectedDefaultModelOption = useMemo(
    () => defaultModelOptions.find((option) => option.id === workspaceDefaultModelValue) ?? null,
    [defaultModelOptions, workspaceDefaultModelValue],
  )
  const recentChatOptions = useMemo(
    () =>
      chatSessions
        .filter((session) => session.id !== activeChatId)
        .map((session) => ({
          id: session.id,
          title: session.title,
          updatedAt: session.updatedAt,
          nodeCount: session.nodeCount,
          edgeCount: session.edgeCount,
        })),
    [activeChatId, chatSessions],
  )

  const refreshCredentials = useCallback(() => {
    setCredentials(listCredentials())
  }, [])

  const handleOpenSettings = useCallback(() => {
    setSettingsOpen(true)
  }, [])

  const clearAutosaveTimer = useCallback(() => {
    if (autosaveTimerRef.current !== null) {
      window.clearTimeout(autosaveTimerRef.current)
      autosaveTimerRef.current = null
    }
  }, [])

  const updateWorkspaceDefaultModel = useCallback((next: WorkspaceDefaultModelPreference): void => {
    setWorkspaceDefaultModel(next)
    workspaceModelRef.current = next
    writeWorkspaceDefaultModelPreference(next)
  }, [])

  useEffect(() => {
    activeChatIdRef.current = activeChatId
  }, [activeChatId])

  useEffect(() => {
    activeChatTitleRef.current = activeChatTitle
  }, [activeChatTitle])

  useEffect(() => {
    workspaceModelRef.current = workspaceDefaultModel
  }, [workspaceDefaultModel])

  const flushAutosave = useCallback(async () => {
    clearAutosaveTimer()
    const currentChatId = activeChatIdRef.current
    const latestGraph = latestGraphRef.current
    if (!currentChatId || !latestGraph) {
      return
    }

    const hasContent = latestGraph.nodes.length > 0 || latestGraph.edges.length > 0
    if (hasContent) {
      persistCurrentChatRef.current = true
    }
    if (!persistCurrentChatRef.current) {
      setAutosaveStatus("idle")
      return
    }

    setAutosaveStatus("saving")
    const now = new Date().toISOString()

    try {
      await persistenceRepository.saveWorkspaceSnapshot(
        createWorkspaceSnapshotRecord({
          workspaceId: currentChatId,
          reason: "autosave",
          commandCount: 1,
          payload: {
            canvases: latestGraph.canvases,
            links: latestGraph.links,
            nodes: latestGraph.nodes,
            edges: latestGraph.edges,
            activeCanvasId: latestGraph.activeCanvasId,
            workspaceModelPreference: latestGraph.workspaceModelPreference ?? workspaceModelRef.current,
          },
        }),
      )

      const existing = await persistenceRepository.getChatSession(currentChatId)
      const sessionRecord: ChatSessionRecord = {
        id: currentChatId,
        workspaceId: currentChatId,
        title: activeChatTitleRef.current.trim() || DEFAULT_CHAT_TITLE,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
        lastOpenedAt: now,
        lastSnapshotAt: now,
        nodeCount: latestGraph.nodes.length,
        edgeCount: latestGraph.edges.length,
        provider: latestGraph.workspaceModelPreference?.provider ?? workspaceModelRef.current.provider,
        model: latestGraph.workspaceModelPreference?.model ?? workspaceModelRef.current.model,
      }

      await persistenceRepository.saveChatSession(sessionRecord)
      await persistenceRepository.saveSetting(ACTIVE_CHAT_SETTING_ID, currentChatId)
      setChatSessions((current) => upsertSortedSessions(current, sessionRecord))
      setAutosaveStatus("idle")
    } catch {
      setAutosaveStatus("error")
      toast.error("Failed to save current chat state")
    }
  }, [clearAutosaveTimer])

  const scheduleAutosave = useCallback(() => {
    clearAutosaveTimer()
    autosaveTimerRef.current = window.setTimeout(() => {
      void flushAutosave()
    }, AUTOSAVE_DEBOUNCE_MS)
  }, [clearAutosaveTimer, flushAutosave])

  const openExistingChat = useCallback(async (chatId: string) => {
    await flushAutosave()
    const session = await persistenceRepository.getChatSession(chatId)
    if (!session) {
      return
    }

    const snapshot = await loadLatestWorkspaceSnapshot(chatId)
    const graphState = parseSnapshot(chatId, snapshot?.payload as SnapshotPayload | undefined)

    setActiveChatId(chatId)
    setActiveChatTitle(session.title || DEFAULT_CHAT_TITLE)
    setTitleDraft(session.title || DEFAULT_CHAT_TITLE)
    setIsEditingTitle(false)
    setInitialGraphState(graphState)
    setBoardKey(`chat:${chatId}:${snapshot?.id ?? "empty"}`)
    latestGraphRef.current = graphState
    persistCurrentChatRef.current = true
    setAutosaveStatus("idle")
    await persistenceRepository.saveSetting(ACTIVE_CHAT_SETTING_ID, chatId)
  }, [flushAutosave])

  const generateChatTitle = useCallback(
    async (prompt: string, provider: string, model: string): Promise<string> => {
      const auth = resolveProviderAuth(credentials, provider)
      if (!auth) {
        return fallbackTitleFromPrompt(prompt)
      }

      const response = await fetch("/api/llm/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          model,
          intent: "prompt",
          messages: [
            {
              role: "user",
              content:
                "Create a concise chat title (3-7 words) for this research prompt. Return title text only.\n\nPrompt:\n" +
                prompt,
            },
          ],
          auth,
          workspaceContext: {
            workspaceId: activeChatIdRef.current,
            canvasId: "root",
          },
        }),
      })

      if (!response.ok || !response.body) {
        return fallbackTitleFromPrompt(prompt)
      }

      try {
        const { text } = await consumeGenerationStream(response.body, prompt)
        return sanitizeGeneratedTitle(text, prompt)
      } catch {
        return fallbackTitleFromPrompt(prompt)
      }
    },
    [credentials],
  )

  const commitChatTitle = useCallback((value: string) => {
    const normalized = value.trim()
    const nextTitle = normalized.length > 0 ? normalized : DEFAULT_CHAT_TITLE
    setActiveChatTitle(nextTitle)
    setTitleDraft(nextTitle)
    setIsEditingTitle(false)
    persistCurrentChatRef.current = true
    scheduleAutosave()
  }, [scheduleAutosave])

  const handleResumeChat = useCallback((chatId: string) => {
    void openExistingChat(chatId)
  }, [openExistingChat])

  const handleGraphStateChange = useCallback((state: CanvasGraphState) => {
    latestGraphRef.current = state
    if (state.nodes.length > 0 || state.edges.length > 0) {
      persistCurrentChatRef.current = true
    }
    scheduleAutosave()
  }, [scheduleAutosave])

  const handleFirstPromptSubmitted = useCallback(({ prompt, provider, model }: { prompt: string; provider: string; model: string }) => {
    if (activeChatTitleRef.current !== DEFAULT_CHAT_TITLE) {
      return
    }
    setActiveChatTitle(TITLE_GENERATION_PLACEHOLDER)
    setTitleDraft(TITLE_GENERATION_PLACEHOLDER)

    const chatIdAtStart = activeChatIdRef.current
    titleGenerationPendingRef.current = (async () => {
      const generated = await generateChatTitle(prompt, provider, model)
      if (activeChatIdRef.current !== chatIdAtStart) {
        return
      }
      setActiveChatTitle(generated)
      setTitleDraft(generated)
      persistCurrentChatRef.current = true
      scheduleAutosave()
    })()
  }, [generateChatTitle, scheduleAutosave])

  useEffect(() => {
    return subscribeWorkspaceDefaultModelPreference((preference) => {
      setWorkspaceDefaultModel(preference)
      workspaceModelRef.current = preference
    })
  }, [])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      refreshCredentials()
      let sessions = await persistenceRepository.listChatSessions()

      if (sessions.length === 0) {
        const legacySnapshot = await loadLatestWorkspaceSnapshot("local-workspace")
        if (legacySnapshot) {
          const restored = parseSnapshot("local-workspace", legacySnapshot.payload as SnapshotPayload | undefined)
          const now = new Date().toISOString()
          const migrated: ChatSessionRecord = {
            id: "local-workspace",
            workspaceId: "local-workspace",
            title: "Recovered Chat",
            createdAt: now,
            updatedAt: now,
            lastOpenedAt: now,
            lastSnapshotAt: legacySnapshot.createdAt,
            nodeCount: restored.nodes.length,
            edgeCount: restored.edges.length,
            provider: restored.workspaceModelPreference?.provider,
            model: restored.workspaceModelPreference?.model,
          }
          await persistenceRepository.saveChatSession(migrated)
          sessions = [migrated]
        }
      }

      if (!cancelled) {
        setChatSessions(sessions)
        setIsHydrated(true)
      }
    })()

    return () => {
      cancelled = true
      clearAutosaveTimer()
      void flushAutosave()
    }
  }, [clearAutosaveTimer, flushAutosave, refreshCredentials])

  useEffect(() => {
    if (catalogProviders.length === 0) {
      return
    }

    const currentProvider = catalogProviders.find((provider) => provider.id === workspaceDefaultModel.provider)
    const currentModelExists = currentProvider?.models.some((model) => model.id === workspaceDefaultModel.model) ?? false
    if (currentProvider && currentModelExists) {
      return
    }

    const preferredProvider = catalogProviders.find((provider) => provider.id === "openai") ?? catalogProviders[0]
    const preferredModel = preferredProvider?.models[0]
    if (!preferredProvider || !preferredModel) {
      return
    }

    updateWorkspaceDefaultModel({ provider: preferredProvider.id, model: preferredModel.id })
  }, [catalogProviders, updateWorkspaceDefaultModel, workspaceDefaultModel.model, workspaceDefaultModel.provider])

  useEffect(() => {
    if (!settingsOpen) {
      return
    }

    const panel = settingsPanelRef.current
    if (!panel) {
      return
    }

    const updateWidth = () => {
      setSettingsPanelWidthPx(Math.round(panel.getBoundingClientRect().width))
    }

    updateWidth()
    if (typeof ResizeObserver === "undefined") {
      return
    }

    const observer = new ResizeObserver(() => updateWidth())
    observer.observe(panel)
    return () => observer.disconnect()
  }, [settingsOpen])

  useEffect(() => {
    function handleBeforeUnload(): void {
      void flushAutosave()
    }

    function handleVisibilityChange(): void {
      if (document.visibilityState === "hidden") {
        void flushAutosave()
      }
    }

    window.addEventListener("beforeunload", handleBeforeUnload)
    document.addEventListener("visibilitychange", handleVisibilityChange)
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [flushAutosave])

  if (!isHydrated || !initialGraphState || !activeChatId) {
    return <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Loading workspace...</div>
  }

  return (
    <div className="relative h-full">
      <div className="absolute inset-0">
        <CanvasBoard
          key={boardKey}
          workspaceId={activeChatId}
          initialState={initialGraphState}
          recentChats={recentChatOptions}
          onResumeChat={handleResumeChat}
          onGraphStateChange={handleGraphStateChange}
          onFirstPromptSubmitted={handleFirstPromptSubmitted}
          onOpenSettings={handleOpenSettings}
          credentials={credentials}
          settingsPanelOpen={settingsOpen}
          settingsPanelWidthPx={settingsPanelWidthPx}
          onCatalogProvidersChange={setCatalogProviders}
        />
      </div>

      <div className="absolute left-3 top-3 z-20 flex max-w-[min(48vw,34rem)] items-center px-1 py-0.5">
        {isEditingTitle ? (
          <Input
            aria-label="Chat title"
            value={titleDraft}
            autoFocus
            className="h-8 border-border/40 bg-transparent text-base font-semibold shadow-none"
            onChange={(event) => setTitleDraft(event.target.value)}
            onBlur={() => commitChatTitle(titleDraft)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault()
                commitChatTitle(titleDraft)
              }
              if (event.key === "Escape") {
                event.preventDefault()
                setIsEditingTitle(false)
                setTitleDraft(activeChatTitle)
              }
            }}
          />
        ) : (
          <button
            type="button"
            className="truncate text-left text-lg font-semibold text-foreground"
            onDoubleClick={() => {
              setTitleDraft(activeChatTitle)
              setIsEditingTitle(true)
            }}
            title="Double click to rename chat"
          >
            {activeChatTitle}
          </button>
        )}
      </div>

      <Button
        type="button"
        size="icon"
        variant="outline"
        className="absolute right-14 top-3 z-20 rounded-lg border-border bg-background/95 shadow-lg backdrop-blur-xs transition-transform hover:scale-105"
        onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
        aria-label="Toggle theme"
      >
        {resolvedTheme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </Button>

      <Button
        type="button"
        size="icon"
        variant="outline"
        className="absolute right-3 top-3 z-20 rounded-lg border-border bg-background/95 shadow-lg backdrop-blur-xs transition-transform hover:scale-105"
        onClick={handleOpenSettings}
        aria-label="Open settings"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
      </Button>

      {settingsOpen ? (
        <aside
          ref={settingsPanelRef}
          className="absolute right-3 top-3 z-30 flex h-[calc(100%-1.5rem)] w-[clamp(18rem,28vw,24rem)] flex-col overflow-hidden rounded-lg border border-border bg-background/95 shadow-2xl backdrop-blur-xs animate-in fade-in-0 slide-in-from-right-2 duration-200"
          aria-label="Settings"
        >
          <div className="flex shrink-0 items-center gap-1.5 border-b border-border px-3 py-2">
            <h2 className="text-xs font-semibold leading-none">Settings</h2>
            <div className="ml-auto flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground">
                {autosaveStatus === "saving" ? "Saving..." : autosaveStatus === "error" ? "Save failed" : "Saved"}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-5 w-5 p-0 text-muted-foreground hover:text-foreground"
                onClick={() => setSettingsOpen(false)}
                aria-label="Close"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </Button>
            </div>
          </div>
          <ScrollArea className="min-h-0 flex-1 px-3 py-3">
            <div className="space-y-3">
              <section className="space-y-1.5">
                <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Default Model</h3>
                {catalogProviders.length > 0 ? (
                  <Combobox
                    value={selectedDefaultModelOption}
                    onValueChange={(value) => {
                      if (!value) {
                        return
                      }
                      const descriptor = modelValueToDescriptor.get(value.id)
                      if (!descriptor) {
                        return
                      }
                      updateWorkspaceDefaultModel({
                        provider: descriptor.providerId,
                        model: descriptor.modelId,
                      })
                    }}
                    items={defaultModelOptions}
                    autoHighlight
                    itemToStringLabel={(value) => value.label}
                    itemToStringValue={(value) => value.id}
                  >
                    <ComboboxInput
                      aria-label="Default model"
                      className="h-8 [&_[data-slot=input]]:h-8 [&_[data-slot=input]]:text-xs"
                      placeholder="Select default model"
                    />
                    <ComboboxContent>
                      <ComboboxEmpty>No models found.</ComboboxEmpty>
                      <ComboboxList>
                        {(option: { id: string; label: string }) => (
                          <ComboboxItem key={option.id} value={option}>
                            {option.label}
                          </ComboboxItem>
                        )}
                      </ComboboxList>
                    </ComboboxContent>
                  </Combobox>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    No active provider credentials yet. Add credentials below to choose a default model.
                  </p>
                )}
              </section>

              <Separator />

              <section>
                <ProviderCredentialsForm
                  onSave={({ provider, type, credential, authPayload }) => {
                    if (authPayload) {
                      saveCredentialAuth(provider, authPayload)
                    } else {
                      saveCredential(provider, type, credential)
                    }
                    refreshCredentials()
                    setAutosaveStatus("idle")
                  }}
                  onRevoke={(credentialId) => { revokeCredential(credentialId); refreshCredentials() }}
                  credentials={credentials}
                />
              </section>
            </div>
          </ScrollArea>
        </aside>
      ) : null}
    </div>
  )
}
