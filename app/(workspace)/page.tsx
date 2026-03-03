"use client"

import React from "react"
import { useEffect, useMemo, useState } from "react"
import { CanvasBoard } from "@/components/workspace/canvas/canvas-board"
import { HierarchyControls } from "@/components/workspace/hierarchy/hierarchy-controls"
import { SubtopicCandidatePicker } from "@/components/workspace/hierarchy/subtopic-candidate-picker"
import { HierarchyView } from "@/components/workspace/hierarchy/hierarchy-view"
import { PersistenceStatus } from "@/components/workspace/provider-settings/persistence-status"
import { ProviderCredentialsForm } from "@/components/workspace/provider-settings/provider-credentials-form"
import { persistenceRepository } from "@/features/persistence/repository"
import {
  candidatesForCanvas,
  createChildCanvas,
  setSubtopicCandidateLifecycle,
  upsertSubtopicCandidate,
  type GeneratedSubtopicCandidate
} from "@/features/hierarchy-model/state"
import { setActiveCanvas, synchronizeHierarchySelection } from "@/features/hierarchy-model/navigation"
import { saveCredential } from "@/lib/auth/credential-store"
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
  const title = useMemo(() => "Sensecape Exploration Workspace", [])
  const [canvases, setCanvases] = useState<Canvas[]>([rootCanvas()])
  const [links, setLinks] = useState<HierarchyLink[]>([])
  const [candidates, setCandidates] = useState<GeneratedSubtopicCandidate[]>([])
  const [navigation, setNavigation] = useState({ activeCanvasId: "root" })
  const [persistenceStatus, setPersistenceStatus] = useState<"idle" | "saving" | "error">("idle")

  const activeCanvas = canvases.find((canvas) => canvas.id === navigation.activeCanvasId) ?? canvases[0]

  useEffect(() => {
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
      const [savedLinks, savedCandidates] = await Promise.all([
        persistenceRepository.loadHierarchyLinks("local-workspace"),
        persistenceRepository.loadGeneratedSubtopicCandidates("local-workspace")
      ])
      if (savedLinks.length) {
        setLinks(savedLinks)
      }
      if (savedCandidates.length) {
        setCandidates(savedCandidates)
      }
    })()
  }, [])

  return (
    <section className="mx-auto max-w-6xl space-y-4">
      <header className="rounded-md border border-[hsl(var(--border))] bg-white p-4">
        <h1 className="text-xl font-semibold">{title}</h1>
        <p className="text-sm text-slate-600">Local-first multilevel exploration and sensemaking.</p>
      </header>
      <div className="grid gap-4 md:grid-cols-[2fr_1fr]">
        <div className="rounded-md border border-[hsl(var(--border))] bg-white p-4">
          <HierarchyControls
            onAddBroadTopic={() => {
              const now = new Date().toISOString()
              const canvas: Canvas = {
                id: crypto.randomUUID(),
                workspaceId: "local-workspace",
                topic: "Broad Topic",
                depth: 0,
                createdAt: now,
                updatedAt: now
              }
              setCanvases((current) => [...current, canvas])
            }}
            onAddSubtopic={() => {
              if (!activeCanvas) {
                return
              }
              const child = createChildCanvas(activeCanvas, `Subtopic ${canvases.length}`)
              setCanvases((current) => [...current, child])
              setLinks((current) => {
                const link: HierarchyLink = {
                  id: crypto.randomUUID(),
                  workspaceId: activeCanvas.workspaceId,
                  parentCanvasId: activeCanvas.id,
                  childCanvasId: child.id,
                  linkType: "subtopic" as const,
                  createdAt: new Date().toISOString()
                }
                void persistenceRepository.saveHierarchyLink(link)
                return [...current, link]
              })
            }}
            onAddSibling={() => {
              const now = new Date().toISOString()
              setCanvases((current) => [
                ...current,
                {
                  id: crypto.randomUUID(),
                  workspaceId: "local-workspace",
                  topic: "Sibling Topic",
                  depth: activeCanvas?.depth ?? 0,
                  parentCanvasId: activeCanvas?.parentCanvasId,
                  createdAt: now,
                  updatedAt: now
                }
              ])

              const candidate: GeneratedSubtopicCandidate = {
                id: crypto.randomUUID(),
                workspaceId: "local-workspace",
                parentCanvasId: activeCanvas?.id ?? "root",
                label: `Sibling candidate ${canvases.length}`,
                lifecycle: "presented",
                createdAt: now,
                updatedAt: now
              }
              setCandidates((current) => {
                const next = upsertSubtopicCandidate(current, candidate)
                void persistenceRepository.saveGeneratedSubtopicCandidate(candidate)
                return next
              })
            }}
          />
          <div className="mt-4">
            <CanvasBoard />
          </div>
          <div className="mt-4">
            <PersistenceStatus status={persistenceStatus} onRetry={() => setPersistenceStatus("saving")} />
          </div>
        </div>
        <div className="space-y-3">
          <HierarchyView
            canvases={canvases}
            links={links}
            activeCanvasId={navigation.activeCanvasId}
            onSelectCanvas={(id) => setNavigation((current) => synchronizeHierarchySelection(current, id))}
          />
          <SubtopicCandidatePicker
            candidates={candidatesForCanvas(candidates, navigation.activeCanvasId)}
            onSelect={(candidateId) => {
              setCandidates((current) => {
                const next = setSubtopicCandidateLifecycle(current, candidateId, "selected")
                const changed = next.find((candidate) => candidate.id === candidateId)
                if (changed) {
                  void persistenceRepository.saveGeneratedSubtopicCandidate(changed)
                }
                return next
              })
            }}
            onDismiss={(candidateId) => {
              setCandidates((current) => {
                const next = setSubtopicCandidateLifecycle(current, candidateId, "dismissed")
                const changed = next.find((candidate) => candidate.id === candidateId)
                if (changed) {
                  void persistenceRepository.saveGeneratedSubtopicCandidate(changed)
                }
                return next
              })
            }}
          />
          <ProviderCredentialsForm
            onSave={({ provider, type, credential }) => {
              saveCredential(provider, type, credential)
              setPersistenceStatus("idle")
            }}
          />
        </div>
      </div>
    </section>
  )
}
