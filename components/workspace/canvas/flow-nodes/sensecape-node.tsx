"use client"

import React, { useState, useRef } from "react"
import { Handle, Position, NodeResizer } from "@xyflow/react"
import type { NodeProps } from "@xyflow/react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import type { SensecapeNodeData } from "@/features/graph-model/react-flow-adapters"

export function SensecapeNode({ data, selected, id }: NodeProps) {
  const { graphNode, isStreaming, isEditing, onAddChild, onPromptSubmit, onResize } = data as SensecapeNodeData
  const [hovered, setHovered] = useState(false)
  const [inputValue, setInputValue] = useState("")
  const throttleRef = useRef<number | null>(null)

  const bgColor = graphNode.colorToken ?? "hsl(var(--node-topic-bg))"
  const fgColor = graphNode.colorToken ? undefined : "hsl(var(--node-topic-fg))"

  return (
    <div
      className="relative h-full w-full"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Only show resize handles when selected AND not streaming */}
      <NodeResizer
        minWidth={200}
        minHeight={80}
        isVisible={!!selected && !isStreaming}
        lineClassName="!border-slate-300"
        handleClassName="!bg-slate-400 !w-2.5 !h-2.5"
        onResize={(_event, params) => {
          // Throttle intermediate updates to every 50ms for smooth but performant resizing
          if (throttleRef.current) return
          throttleRef.current = window.setTimeout(() => {
            throttleRef.current = null
          }, 50)
          onResize?.(id, params.width, params.height, false)
        }}
        onResizeEnd={(_event, params) => {
          // Clear throttle and send final update
          if (throttleRef.current) {
            clearTimeout(throttleRef.current)
            throttleRef.current = null
          }
          onResize?.(id, params.width, params.height, true)
        }}
      />
      <Handle type="target" position={Position.Top} className="!left-1/2 !bg-slate-300" />

      <article
        className={`min-h-[80px] min-w-[200px] h-full w-full overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-xl transition-all hover:shadow-2xl ${selected ? "ring-2 ring-slate-400" : ""}`}
        style={graphNode.colorToken ? { background: bgColor, color: fgColor } : {}}
      >
        {/* Editing mode: show input for new prompt */}
        {isEditing ? (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (inputValue.trim()) {
                onPromptSubmit?.(id, inputValue.trim())
                setInputValue("")
              }
            }}
          >
            <input
              autoFocus
              className="nodrag w-full border-b border-sky-300 bg-transparent pb-1 text-sm outline-none placeholder:text-slate-400"
              placeholder="Ask a follow-up question..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
            />
          </form>
        ) : (
          <>
            {/* Prompt */}
            {graphNode.prompt ? (
              <div className="mb-2 border-b border-slate-200 pb-2 text-xs font-medium text-slate-500">
                {graphNode.prompt}
              </div>
            ) : null}

            {/* Response content - rendered as markdown */}
            {graphNode.content ? (
              <div className="sensecape-markdown text-[11px] leading-relaxed text-slate-700">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{graphNode.content}</ReactMarkdown>
              </div>
            ) : isStreaming ? (
              <p className="animate-pulse text-sm text-slate-400">Generating...</p>
            ) : (
              <p className="text-sm italic text-slate-300">Empty node</p>
            )}

            {/* Streaming indicator */}
            {isStreaming && graphNode.content ? (
              <div className="mt-1 flex gap-0.5">
                <span className="h-1 w-1 animate-bounce rounded-full bg-sky-500" style={{ animationDelay: "0ms" }} />
                <span className="h-1 w-1 animate-bounce rounded-full bg-sky-500" style={{ animationDelay: "150ms" }} />
                <span className="h-1 w-1 animate-bounce rounded-full bg-sky-500" style={{ animationDelay: "300ms" }} />
              </div>
            ) : null}
          </>
        )}
      </article>

      <Handle type="source" position={Position.Bottom} className="!left-1/2 !bg-slate-300" />

      {/* Hover + button */}
      {hovered && !isStreaming && !isEditing ? (
        <button
          className="nodrag absolute -bottom-3.5 left-1/2 z-10 flex h-7 w-7 -translate-x-1/2 items-center justify-center rounded-full bg-slate-600 text-sm font-bold text-white shadow-lg transition-all hover:bg-slate-700 hover:shadow-xl"
          onClick={(e) => {
            e.stopPropagation()
            onAddChild?.(id)
          }}
          aria-label="Add follow-up node"
        >
          +
        </button>
      ) : null}
    </div>
  )
}
