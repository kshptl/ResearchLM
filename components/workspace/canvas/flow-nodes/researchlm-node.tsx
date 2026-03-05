"use client"

import React, { useCallback, useEffect, useRef, useState } from "react"
import { Handle, Position, NodeResizer } from "@xyflow/react"
import type { NodeProps } from "@xyflow/react"
import { Palette, Plus, RefreshCw, Trash2 } from "lucide-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { createNodeThemeStyle } from "@/features/graph-model/node-color-theme"
import type { ResearchlmNodeData } from "@/features/graph-model/react-flow-adapters"
import { cn } from "@/lib/utils"

const NODE_COLOR_PRESETS = [
  { label: "Default", value: "" },
  { label: "Blue", value: "hsl(210, 90%, 92%)" },
  { label: "Green", value: "hsl(145, 70%, 90%)" },
  { label: "Yellow", value: "hsl(48, 95%, 88%)" },
  { label: "Purple", value: "hsl(270, 70%, 92%)" },
  { label: "Pink", value: "hsl(340, 80%, 92%)" },
  { label: "Orange", value: "hsl(25, 90%, 90%)" },
]

type FooterActionButtonProps = React.ComponentProps<typeof Button> & {
  icon: React.ReactNode
  label: string
}

const FooterActionButton = React.forwardRef<HTMLButtonElement, FooterActionButtonProps>(
  ({ icon, label, className, ["aria-label"]: ariaLabel, ...props }, ref) => (
    <Button
      ref={ref}
      {...props}
      aria-label={ariaLabel ?? label}
      className={cn("nodrag h-7 w-7 p-0", className)}
    >
      {icon}
    </Button>
  ),
)
FooterActionButton.displayName = "FooterActionButton"

function ResearchlmNodeComponent({ data, selected, id }: NodeProps) {
  const {
    graphNode,
    isStreaming,
    isEditing,
    isFocused,
    onAddChild,
    onRegenerate,
    onDeleteNode,
    onSetColor,
    onPromptEditStart,
    onPromptSubmit,
    onResize,
  } = data as ResearchlmNodeData
  const [inputValue, setInputValue] = useState("")
  const [colorPickerOpen, setColorPickerOpen] = useState(false)
  const resizeRafRef = useRef<number | null>(null)
  const pendingResizeRef = useRef<{ width: number; height: number } | null>(null)
  const promptContextBlocks = (graphNode.promptContextBlocks ?? [])
    .map((block) => block.trim())
    .filter((block) => block.length > 0)
  const nodeThemeStyle = graphNode.colorToken ? createNodeThemeStyle(graphNode.colorToken) : undefined
  const defaultNodeStyle = graphNode.colorToken
    ? undefined
    : ({
        background: "var(--node-topic-bg)",
        color: "var(--node-topic-fg)",
      } as React.CSSProperties)

  useEffect(() => {
    // When edit mode opens, seed the textarea with the current prompt text.
    // This lets users keep editing from where they left off.
    if (isEditing) {
      setInputValue(graphNode.prompt ?? "")
    }
  }, [graphNode.prompt, isEditing])

  const submitPrompt = useCallback(() => {
    // We treat blank/whitespace-only prompts as "no-op".
    const nextPrompt = inputValue.trim()
    if (!nextPrompt) {
      return
    }
    onPromptSubmit?.(id, nextPrompt)
    setInputValue("")
  }, [id, inputValue, onPromptSubmit])

  const flushResizeFrame = useCallback(() => {
    // Resize events can fire many times per drag.
    // We only apply the latest size once per animation frame for smoother dragging.
    resizeRafRef.current = null
    const pending = pendingResizeRef.current
    if (!pending) {
      return
    }
    pendingResizeRef.current = null
    onResize?.(id, pending.width, pending.height, false)
  }, [id, onResize])

  useEffect(() => {
    return () => {
      // Safety cleanup: cancel pending animation frame if the node unmounts.
      if (resizeRafRef.current !== null) {
        window.cancelAnimationFrame(resizeRafRef.current)
      }
    }
  }, [])

  const contextBlocksMarkup = promptContextBlocks.length > 0 ? (
    <div
      className="mb-2 rounded-md border border-border/70 bg-muted/40 px-2 py-1.5"
      data-testid={isEditing ? "node-inline-context-blocks" : "node-view-context-blocks"}
    >
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        Context
      </p>
      <div className="max-h-20 space-y-1 overflow-y-auto">
        {promptContextBlocks.map((contextBlock, index) => (
          <blockquote
            key={`${id}:context:${index}`}
            className="rounded-sm border-l-2 border-primary/40 pl-2 text-[11px] leading-relaxed text-muted-foreground whitespace-pre-wrap"
          >
            {contextBlock}
          </blockquote>
        ))}
      </div>
    </div>
  ) : null

  return (
    <div className="relative h-full w-full" data-node-editor-id={id} style={nodeThemeStyle}>
      {/* Hide handles while streaming so drag/resize affordances don't compete with generation state. */}
      <NodeResizer
        minWidth={260}
        minHeight={140}
        isVisible={!!selected && !isStreaming}
        lineClassName="border-transparent!"
        handleClassName="researchlm-node-resize-handle h-3! w-3! rounded-full! border! border-border! bg-background! shadow-xs!"
        onResize={(_event, params) => {
          pendingResizeRef.current = { width: params.width, height: params.height }
          if (resizeRafRef.current !== null) {
            return
          }
          resizeRafRef.current = window.requestAnimationFrame(flushResizeFrame)
        }}
        onResizeEnd={(_event, params) => {
          if (resizeRafRef.current !== null) {
            window.cancelAnimationFrame(resizeRafRef.current)
            resizeRafRef.current = null
          }
          pendingResizeRef.current = null
          onResize?.(id, params.width, params.height, true)
        }}
      />
      <Handle type="target" position={Position.Top} className="left-1/2! h-4! w-4! bg-border!" />

      <Card
        role="article"
        className={`group flex h-full w-full min-h-[180px] min-w-[280px] flex-col gap-0 overflow-hidden rounded-2xl border border-border bg-card py-0 shadow-xl transition-all duration-200 hover:-translate-y-[1px] hover:shadow-2xl animate-in fade-in-0 zoom-in-[0.99] ${selected ? "ring-2 ring-ring" : ""}`}
        style={defaultNodeStyle}
        onWheelCapture={(event) => {
          if (isFocused) {
            event.stopPropagation()
          }
        }}
      >
        <CardHeader className="shrink-0 gap-1 p-2.5 [border-bottom:1px_solid_var(--border)]">
          {isEditing ? (
            <form
              onSubmit={(e) => {
                e.preventDefault()
                submitPrompt()
              }}
            >
              {/* Context stays visible while editing so users remember what text the prompt refers to. */}
              {contextBlocksMarkup}
              <Textarea
                autoFocus
                className="nodrag min-h-0 w-full resize-none border-x-0 border-t-0 border-b-primary/40 bg-transparent px-2 pb-1 text-xs font-medium text-foreground shadow-none placeholder:text-muted-foreground focus-visible:ring-0"
                rows={3}
                aria-label="Node prompt editor"
                placeholder="Ask or edit prompt..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    submitPrompt()
                  }
                }}
              />
            </form>
          ) : (
            <>
              {contextBlocksMarkup}
              {/* Prompt area is always readable, and double-click switches to inline editing. */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="nodrag h-auto w-full cursor-text justify-start rounded px-0 py-0 text-left text-xs font-semibold text-foreground hover:bg-transparent"
                    onClick={(event) => event.stopPropagation()}
                    onDoubleClick={(event) => {
                      event.stopPropagation()
                      onPromptEditStart?.(id)
                    }}
                  >
                    <span className="whitespace-pre-wrap">
                      {graphNode.prompt && graphNode.prompt.trim().length > 0
                        ? graphNode.prompt
                        : "Double-click to add prompt..."}
                    </span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">Double-click to edit prompt</TooltipContent>
              </Tooltip>
            </>
          )}
        </CardHeader>

        <CardContent className="flex min-h-0 flex-1 flex-col overflow-hidden px-2.5 py-2">
          {graphNode.content ? (
            <div className="researchlm-markdown min-h-0 flex-1 overflow-y-auto pr-1 text-[11px] leading-relaxed text-foreground">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{graphNode.content}</ReactMarkdown>
            </div>
          ) : isStreaming ? (
            <p className="animate-pulse text-sm text-muted-foreground">Generating...</p>
          ) : (
            <p className="text-sm italic text-muted-foreground/70">Empty node</p>
          )}

        </CardContent>

        <CardFooter className="shrink-0 p-1.5 [border-top:1px_solid_var(--border)]">
          {/* Footer stays fixed while only the content area scrolls. */}
          <div className="flex w-full flex-wrap items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <FooterActionButton
                    type="button"
                    variant="outline"
                    size="sm"
                    aria-label="Footer regenerate"
                    icon={<RefreshCw className="h-3.5 w-3.5" />}
                    label="Regenerate"
                    disabled={isStreaming || !graphNode.prompt}
                    onClick={(event) => {
                      event.stopPropagation()
                      onRegenerate?.(id)
                    }}
                  />
                </TooltipTrigger>
                <TooltipContent side="top">Regenerate</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <FooterActionButton
                    type="button"
                    variant="outline"
                    size="sm"
                    aria-label="Footer follow up"
                    icon={<Plus className="h-3.5 w-3.5" />}
                    label="Follow up"
                    disabled={isStreaming || isEditing}
                    onClick={(event) => {
                      event.stopPropagation()
                      onAddChild?.(id)
                    }}
                  />
                </TooltipTrigger>
                <TooltipContent side="top">Follow up</TooltipContent>
              </Tooltip>

              <Popover open={colorPickerOpen} onOpenChange={setColorPickerOpen}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <PopoverTrigger asChild>
                      <FooterActionButton
                        type="button"
                        variant="outline"
                        size="sm"
                        aria-label="Footer color"
                        icon={<Palette className="h-3.5 w-3.5" />}
                        label="Color"
                        onClick={(event) => event.stopPropagation()}
                      />
                    </PopoverTrigger>
                  </TooltipTrigger>
                  <TooltipContent side="top">Color</TooltipContent>
                </Tooltip>
                <PopoverContent
                  align="start"
                  className="w-auto p-2"
                  onPointerDownOutside={() => setColorPickerOpen(false)}
                >
                  <div className="flex flex-wrap gap-1.5">
                    {NODE_COLOR_PRESETS.map((preset) => (
                      <Button
                        key={preset.label}
                        type="button"
                        size="icon"
                        variant="outline"
                        className={cn(
                          "h-6 w-6 rounded-full border-2",
                          graphNode.colorToken === preset.value || (!graphNode.colorToken && !preset.value)
                            ? "border-primary"
                            : "border-border",
                        )}
                        style={{ background: preset.value || "var(--node-topic-bg)" }}
                        aria-label={`Set ${preset.label} color`}
                        onClick={(event) => {
                          event.stopPropagation()
                          onSetColor?.(id, preset.value || undefined)
                          setColorPickerOpen(false)
                        }}
                      />
                    ))}
                  </div>
                </PopoverContent>
              </Popover>

              {isStreaming ? <Spinner className="ml-0.5 size-4 text-muted-foreground" aria-label="Generating response" /> : null}

              <Tooltip>
                <TooltipTrigger asChild>
                  <FooterActionButton
                    type="button"
                    variant="outline"
                    size="sm"
                    aria-label="Footer delete"
                    icon={<Trash2 className="h-3.5 w-3.5" />}
                    label="Delete"
                    className="ml-auto border-destructive/40 text-destructive hover:bg-destructive/10"
                    onClick={(event) => {
                      event.stopPropagation()
                      onDeleteNode?.(id)
                    }}
                  />
                </TooltipTrigger>
                <TooltipContent side="top">Delete</TooltipContent>
              </Tooltip>
          </div>
        </CardFooter>
      </Card>

      <Handle type="source" position={Position.Bottom} className="left-1/2! h-4! w-4! bg-border!" />
    </div>
  )
}

ResearchlmNodeComponent.displayName = "ResearchlmNode"

// Memo keeps untouched nodes from re-rendering when other nodes update.
export const ResearchlmNode = React.memo(ResearchlmNodeComponent)
