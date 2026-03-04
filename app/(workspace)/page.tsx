"use client"

import React from "react"
import { useEffect, useMemo, useRef, useState } from "react"
import { CanvasBoard } from "@/components/workspace/canvas/canvas-board"
import { HierarchyControls } from "@/components/workspace/hierarchy/hierarchy-controls"
import { SubtopicCandidatePicker } from "@/components/workspace/hierarchy/subtopic-candidate-picker"
import { HierarchyView } from "@/components/workspace/hierarchy/hierarchy-view"
import { ConflictNotice } from "@/components/workspace/persistence/conflict-notice"
import { PersistenceStatus } from "@/components/workspace/provider-settings/persistence-status"
import { ProviderCredentialsForm } from "@/components/workspace/provider-settings/provider-credentials-form"
import { persistenceRepository, type ConflictEventRecord } from "@/features/persistence/repository"
import { conflictFromSync, persistConflictEvents } from "@/features/persistence/conflict-events"
import {
  createConflictNoticeLifecycleState,
  dismissConflictNotice,
  replaceConflictNotice
} from "@/features/persistence/conflict-notice-policy"
import { exportWorkspaceBackup, importWorkspaceBackup } from "@/features/persistence/workspace-backup"
import {
  createWorkspaceSnapshotRecord,
  emitStructuredLocalLog,
  loadLatestWorkspaceSnapshot,
  saveWorkspaceSnapshot,
  shouldPersistAdaptiveSnapshot
} from "@/features/persistence/workspace-persistence-service"
import {
  candidatesForCanvas,
  createChildCanvas,
  setSubtopicCandidateLifecycle,
  upsertSubtopicCandidate,
  type GeneratedSubtopicCandidate
} from "@/features/hierarchy-model/state"
import { setActiveCanvas, synchronizeHierarchySelection } from "@/features/hierarchy-model/navigation"
import {
  listCredentials,
  replaceCredential,
  revokeCredential,
  saveCredential,
  type StoredCredential
} from "@/lib/auth/credential-store"
import type { Canvas, HierarchyLink } from "@/features/graph-model/types"

function rootCanvas(): Canvas {
  const now = new Date().toISOString()
  return {
    id: "root",
    workspaceId: "local-workspace",
    topic: "Root Topic",
    depth: 0,
    createdAt: now,
    updatedAt: now
  }
}

export default function WorkspacePage() {
  const workspaceId = "local-workspace"
  const title = useMemo(() => "Sensecape Exploration Workspace", [])
  const [canvases, setCanvases] = useState<Canvas[]>([rootCanvas()])
  const [links, setLinks] = useState<HierarchyLink[]>([])
  const [candidates, setCandidates] = useState<GeneratedSubtopicCandidate[]>([])
  const [credentials, setCredentials] = useState<StoredCredential[]>([])
  const [noticeLifecycle, setNoticeLifecycle] = useState(createConflictNoticeLifecycleState)
  const [conflictEvents, setConflictEvents] = useState<ConflictEventRecord[]>([])
  const [navigation, setNavigation] = useState({ activeCanvasId: "root" })
  const [persistenceStatus, setPersistenceStatus] = useState<"idle" | "saving" | "error">("idle")
  const [recoveryRequired, setRecoveryRequired] = useState(false)
  const snapshotState = useRef({ hydrated: false, commandCount: 0, lastSnapshotAt: Date.now() })

  const activeCanvas = canvases.find((canvas) => canvas.id === navigation.activeCanvasId) ?? canvases[0]
  const activeConflict = conflictEvents.find((event) => event.id === noticeLifecycle.activeNoticeId) ?? null

  function refreshCredentials() {
    setCredentials(listCredentials())
  }

  useEffect(() => {
    const corruptFlag = localStorage.getItem("sensecape:workspaceStateCorrupt")
    if (corruptFlag === "1") {
      setRecoveryRequired(true)
      return
    }

    const savedCanvasId = localStorage.getItem("sensecape:activeCanvasId")
    if (savedCanvasId) {
      setNavigation((current) => setActiveCanvas(current, savedCanvasId))
    }
  }, [])

  useEffect(() => {
    localStorage.setItem("sensecape:activeCanvasId", navigation.activeCanvasId)
  }, [navigation.activeCanvasId])

  useEffect(() => {
    void (async () => {
      const [savedLinks, savedCandidates, latestSnapshot, savedConflicts] = await Promise.all([
        persistenceRepository.loadHierarchyLinks(workspaceId),
        persistenceRepository.loadGeneratedSubtopicCandidates(workspaceId),
        loadLatestWorkspaceSnapshot(workspaceId),
        persistenceRepository.loadConflictEvents(workspaceId)
      ])

      refreshCredentials()

      if (savedLinks.length) {
        setLinks(savedLinks)
      }
      if (savedCandidates.length) {
        setCandidates(savedCandidates)
      }
      if (savedConflicts.length) {
        setConflictEvents(savedConflicts)
        setNoticeLifecycle((current) => ({ ...current, activeNoticeId: savedConflicts[savedConflicts.length - 1]?.id ?? null }))
      }

      const payload = latestSnapshot?.payload
      if (payload && Array.isArray(payload.canvases) && Array.isArray(payload.links)) {
        setCanvases(payload.canvases as Canvas[])
        setLinks(payload.links as HierarchyLink[])
        if (Array.isArray(payload.candidates)) {
          setCandidates(payload.candidates as GeneratedSubtopicCandidate[])
        }
        const restoredActiveCanvasId = payload.activeCanvasId
        if (typeof restoredActiveCanvasId === "string") {
          setNavigation((current) => setActiveCanvas(current, restoredActiveCanvasId))
        }
      }

      snapshotState.current.hydrated = true
    })()
  }, [workspaceId])

  useEffect(() => {
    if (!snapshotState.current.hydrated) {
      return
    }

    snapshotState.current.commandCount += 1
    const now = Date.now()
    const shouldSnapshot = shouldPersistAdaptiveSnapshot({
      commandCountSinceSnapshot: snapshotState.current.commandCount,
      elapsedMsSinceSnapshot: now - snapshotState.current.lastSnapshotAt,
      hasUnsavedChanges: true
    })

    if (!shouldSnapshot) {
      return
    }

    const snapshot = createWorkspaceSnapshotRecord({
      workspaceId,
      reason: "autosave",
      commandCount: snapshotState.current.commandCount,
      payload: {
        canvases,
        links,
        candidates,
        activeCanvasId: navigation.activeCanvasId
      }
    })

    setPersistenceStatus("saving")
    void saveWorkspaceSnapshot(snapshot)
      .then(() => {
        snapshotState.current.commandCount = 0
        snapshotState.current.lastSnapshotAt = now
        setPersistenceStatus("idle")
      })
      .catch(() => {
        setPersistenceStatus("error")
      })
  }, [candidates, canvases, links, navigation.activeCanvasId, workspaceId])

  async function handleSnapshotNow(): Promise<void> {
    const snapshot = createWorkspaceSnapshotRecord({
      workspaceId,
      reason: "manual",
      commandCount: snapshotState.current.commandCount,
      payload: {
        canvases,
        links,
        candidates,
        activeCanvasId: navigation.activeCanvasId
      }
    })

    setPersistenceStatus("saving")
    try {
      await saveWorkspaceSnapshot(snapshot)
      snapshotState.current.commandCount = 0
      snapshotState.current.lastSnapshotAt = Date.now()
      setPersistenceStatus("idle")
      await emitStructuredLocalLog({
        domain: "persistence",
        eventType: "snapshot_saved",
        outcome: "ok",
        metadata: {
          workspaceId,
          reason: snapshot.reason,
          commandCount: snapshot.commandCount
        }
      })
    } catch {
      setPersistenceStatus("error")
    }
  }

  async function handleExportBackup(): Promise<void> {
    const serialized = exportWorkspaceBackup({
      version: 1,
      exportedAt: new Date().toISOString(),
      workspace: {
        id: workspaceId,
        title,
        rootCanvasId: "root",
        activeCanvasId: navigation.activeCanvasId,
        version: 1,
        createdAt: canvases[0]?.createdAt ?? new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      canvases,
      nodes: [],
      connections: [],
      hierarchyLinks: links
    })

    localStorage.setItem("sensecape:last-backup", serialized)
    await emitStructuredLocalLog({
      domain: "persistence",
      eventType: "backup_exported",
      outcome: "ok",
      metadata: {
        workspaceId,
        bytes: serialized.length
      }
    })
  }

  async function handleImportBackup(): Promise<void> {
    const serialized = localStorage.getItem("sensecape:last-backup")
    if (!serialized) {
      setPersistenceStatus("error")
      return
    }

    try {
      const backup = importWorkspaceBackup(serialized)
      setCanvases(backup.canvases)
      setLinks(backup.hierarchyLinks)
      setNavigation((current) => setActiveCanvas(current, backup.workspace.activeCanvasId))
      setPersistenceStatus("idle")
      await emitStructuredLocalLog({
        domain: "persistence",
        eventType: "backup_imported",
        outcome: "ok",
        metadata: {
          workspaceId,
          canvases: backup.canvases.length,
          hierarchyLinks: backup.hierarchyLinks.length
        }
      })
    } catch {
      setPersistenceStatus("error")
    }
  }

  async function handleSimulateConflict(): Promise<void> {
    const conflict = conflictFromSync({
      workspaceId,
      entityType: "canvas",
      entityId: navigation.activeCanvasId,
      localUpdatedAt: new Date(Date.now() - 1000).toISOString(),
      remoteUpdatedAt: new Date().toISOString(),
      resolution: "remote",
      summary: "A newer edit arrived from another tab and replaced this canvas metadata."
    })

    const persisted = await persistConflictEvents([conflict])
    setConflictEvents((current) => {
      const byId = new Map(current.map((event) => [event.id, event]))
      for (const event of persisted) {
        byId.set(event.id, event)
      }
      return [...byId.values()]
    })
    setNoticeLifecycle((current) => replaceConflictNotice(current, conflict))

    await emitStructuredLocalLog({
      domain: "conflict",
      eventType: "conflict_detected",
      outcome: "ok",
      metadata: {
        workspaceId,
        entityType: conflict.entityType,
        entityId: conflict.entityId
      }
    })
  }

  const [settingsOpen, setSettingsOpen] = useState(false)

  return (
    <div className="relative h-full">
      {/* Canvas is the full-bleed background layer */}
      <div className="absolute inset-0">
        <CanvasBoard onOpenSettings={() => setSettingsOpen(true)} />
      </div>

      {/* Always-visible settings trigger */}
      <button
        type="button"
        className="absolute right-3 top-3 z-20 rounded-lg border border-[hsl(var(--border))] bg-white/95 p-2 shadow-lg backdrop-blur-sm hover:bg-slate-50"
        onClick={() => setSettingsOpen(true)}
        aria-label="Open settings"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
      </button>

      {/* Recovery banner */}
      {recoveryRequired ? (
        <div className="absolute inset-x-0 top-0 z-20 border-b border-red-300 bg-red-50 px-3 py-2 text-xs text-red-800" role="alert">
          <p className="font-semibold">Recovery required</p>
          <p>Workspace state could not be loaded. Reset local state or import a trusted backup.</p>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              className="rounded border border-red-400 bg-white px-2 py-1"
              onClick={() => {
                void Promise.all([
                  persistenceRepository.clearStore("snapshots"),
                  persistenceRepository.clearStore("hierarchyLinks"),
                  persistenceRepository.clearStore("generatedSubtopicCandidates")
                ]).finally(() => {
                  localStorage.removeItem("sensecape:workspaceStateCorrupt")
                  setRecoveryRequired(false)
                  setCanvases([rootCanvas()])
                  setLinks([])
                  setCandidates([])
                  setNavigation({ activeCanvasId: "root" })
                })
              }}
            >
              Reset workspace state
            </button>
            <button
              type="button"
              className="rounded border border-red-400 bg-white px-2 py-1"
              onClick={() => void handleImportBackup()}
            >
              Try backup import
            </button>
          </div>
        </div>
      ) : null}

      {/* Settings drawer */}
      {settingsOpen ? (
        <div className="absolute inset-0 z-30 flex">
          <div className="flex-1" onClick={() => setSettingsOpen(false)} />
          <aside className="w-80 overflow-y-auto border-l border-[hsl(var(--border))] bg-white p-4 shadow-2xl" aria-label="Settings">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold">{title}</h2>
              <button type="button" className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600" onClick={() => setSettingsOpen(false)}>
                <svg width="16" height="16" viewBox="0 0 14 14" fill="none"><path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
              </button>
            </div>

            <div className="space-y-4">
              <section>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Hierarchy</h3>
                <HierarchyControls
                  onAddBroadTopic={() => {
                    const now = new Date().toISOString()
                    const canvas: Canvas = { id: crypto.randomUUID(), workspaceId: "local-workspace", topic: "Broad Topic", depth: 0, createdAt: now, updatedAt: now }
                    setCanvases((current) => [...current, canvas])
                  }}
                  onAddSubtopic={() => {
                    if (!activeCanvas) return
                    const child = createChildCanvas(activeCanvas, `Subtopic ${canvases.length}`)
                    setCanvases((current) => [...current, child])
                    setLinks((current) => {
                      const link: HierarchyLink = { id: crypto.randomUUID(), workspaceId: activeCanvas.workspaceId, parentCanvasId: activeCanvas.id, childCanvasId: child.id, linkType: "subtopic", createdAt: new Date().toISOString() }
                      void persistenceRepository.saveHierarchyLink(link)
                      return [...current, link]
                    })
                  }}
                  onAddSibling={() => {
                    const now = new Date().toISOString()
                    setCanvases((current) => [...current, { id: crypto.randomUUID(), workspaceId: "local-workspace", topic: "Sibling Topic", depth: activeCanvas?.depth ?? 0, parentCanvasId: activeCanvas?.parentCanvasId, createdAt: now, updatedAt: now }])
                    const candidate: GeneratedSubtopicCandidate = { id: crypto.randomUUID(), workspaceId: "local-workspace", parentCanvasId: activeCanvas?.id ?? "root", label: `Sibling candidate ${canvases.length}`, lifecycle: "presented", createdAt: now, updatedAt: now }
                    setCandidates((current) => { const next = upsertSubtopicCandidate(current, candidate); void persistenceRepository.saveGeneratedSubtopicCandidate(candidate); return next })
                  }}
                />
                <div className="mt-2">
                  <HierarchyView canvases={canvases} links={links} activeCanvasId={navigation.activeCanvasId} onSelectCanvas={(id) => setNavigation((current) => synchronizeHierarchySelection(current, id))} />
                </div>
                <div className="mt-2">
                  <SubtopicCandidatePicker
                    candidates={candidatesForCanvas(candidates, navigation.activeCanvasId)}
                    onSelect={(candidateId) => { setCandidates((current) => { const next = setSubtopicCandidateLifecycle(current, candidateId, "selected"); const changed = next.find((c) => c.id === candidateId); if (changed) void persistenceRepository.saveGeneratedSubtopicCandidate(changed); return next }) }}
                    onDismiss={(candidateId) => { setCandidates((current) => { const next = setSubtopicCandidateLifecycle(current, candidateId, "dismissed"); const changed = next.find((c) => c.id === candidateId); if (changed) void persistenceRepository.saveGeneratedSubtopicCandidate(changed); return next }) }}
                  />
                </div>
              </section>

              <section>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Provider Credentials</h3>
                <ProviderCredentialsForm
                  onSave={({ provider, type, credential }) => { saveCredential(provider, type, credential); refreshCredentials(); setPersistenceStatus("idle") }}
                  onReplace={({ credentialId, credential }) => { replaceCredential(credentialId, credential); refreshCredentials() }}
                  onRevoke={(credentialId) => { revokeCredential(credentialId); refreshCredentials() }}
                  credentials={credentials}
                />
              </section>

              <section>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Persistence</h3>
                <PersistenceStatus
                  status={persistenceStatus}
                  onRetry={() => setPersistenceStatus("saving")}
                  onSnapshotNow={() => void handleSnapshotNow()}
                  onExportBackup={() => void handleExportBackup()}
                  onImportBackup={() => void handleImportBackup()}
                  onSimulateConflict={() => void handleSimulateConflict()}
                />
              </section>
            </div>
          </aside>
        </div>
      ) : null}

      {/* Conflict notice floating at bottom */}
      <div className="absolute inset-x-0 bottom-0 z-20 pointer-events-none">
        <div className="pointer-events-auto">
          <ConflictNotice
            conflict={activeConflict}
            onRetrySync={() => setPersistenceStatus("saving")}
            onOpenRecovery={() => void handleSnapshotNow()}
            onDismiss={() => {
              if (!activeConflict) {
                return
              }
              setNoticeLifecycle((current) => dismissConflictNotice(current, activeConflict.id))
            }}
          />
        </div>
      </div>
    </div>
  )
}
