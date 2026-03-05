"use client"

import React, { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"

export type RecentChatOption = {
  id: string
  title: string
  updatedAt: string
  nodeCount: number
  edgeCount: number
}

type Props = {
  onSubmit: (prompt: string) => void
  disabled?: boolean
  modelOptions?: Array<{ value: string; label: string }>
  selectedModelValue?: string
  onSelectModel?: (value: string) => void
  recentChats?: RecentChatOption[]
  onResumeChat?: (chatId: string) => void
}

function toRelativeUpdatedAt(iso: string): string {
  const deltaMs = Date.now() - new Date(iso).getTime()
  if (!Number.isFinite(deltaMs) || deltaMs < 0) {
    return "just now"
  }
  const minutes = Math.floor(deltaMs / 60_000)
  if (minutes < 1) {
    return "just now"
  }
  if (minutes < 60) {
    return `${minutes}m ago`
  }
  const hours = Math.floor(minutes / 60)
  if (hours < 24) {
    return `${hours}h ago`
  }
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export function CentralPromptBar({
  onSubmit,
  disabled,
  modelOptions = [],
  selectedModelValue,
  onSelectModel,
  recentChats = [],
  onResumeChat,
}: Props) {
  const [value, setValue] = useState("")
  const showResumeColumn = recentChats.length > 0 && typeof onResumeChat === "function"

  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
      <div className="pointer-events-auto w-[clamp(24rem,72vw,54rem)] max-w-[94vw] animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-3 duration-300">
        <Card className="rounded-2xl border-border bg-card shadow-2xl">
          <CardContent className="px-5 py-4">
            <div className={showResumeColumn ? "grid gap-4 md:grid-cols-[minmax(0,17rem)_auto_minmax(0,1fr)]" : ""}>
              {showResumeColumn ? (
                <section aria-label="Resume chat" className="min-h-0">
                  <p className="mb-2 text-sm font-semibold text-foreground">Resume chat</p>
                  <ScrollArea className="h-48 rounded-md border border-border">
                    <div className="space-y-1 p-1">
                      {recentChats.map((chat) => (
                        <Button
                          key={chat.id}
                          type="button"
                          variant="ghost"
                          className="h-auto w-full items-start justify-start px-2 py-1.5 text-left"
                          onClick={() => onResumeChat(chat.id)}
                        >
                          <span className="block truncate text-xs font-medium text-foreground">{chat.title}</span>
                          <span className="block text-[10px] text-muted-foreground">
                            {toRelativeUpdatedAt(chat.updatedAt)} • {chat.nodeCount} nodes • {chat.edgeCount} edges
                          </span>
                        </Button>
                      ))}
                    </div>
                  </ScrollArea>
                </section>
              ) : null}

              {showResumeColumn ? <Separator orientation="vertical" className="h-full" /> : null}

              <section>
                <p className="mb-2 text-sm font-medium text-muted-foreground">
                  {showResumeColumn ? "Start new chat" : "What would you like to explore?"}
                </p>
                {modelOptions.length > 0 && onSelectModel ? (
                  <div className="mb-2 space-y-1">
                    <Label htmlFor="initial-model-picker" className="text-xs text-muted-foreground">
                      Model
                    </Label>
                    <Select value={selectedModelValue} onValueChange={onSelectModel} disabled={disabled}>
                      <SelectTrigger id="initial-model-picker" aria-label="Model" className="h-8 text-xs">
                        <SelectValue placeholder="Select model" />
                      </SelectTrigger>
                      <SelectContent>
                        {modelOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    const trimmed = value.trim()
                    if (trimmed && !disabled) {
                      onSubmit(trimmed)
                      setValue("")
                    }
                  }}
                >
                  <Input
                    autoFocus
                    className="h-11 border-none px-3 text-lg shadow-none placeholder:text-muted-foreground/70 focus-visible:ring-0"
                    placeholder="Type a topic or question..."
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    disabled={disabled}
                  />
                  <p className="mt-2 text-xs text-muted-foreground">Press Enter to start exploring</p>
                </form>
              </section>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
