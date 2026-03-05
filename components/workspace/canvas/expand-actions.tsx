"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import type { GenerationIntent } from "@/features/generation/types"

type Props = {
  disabled?: boolean
  onSelect: (intent: GenerationIntent) => void
}

const actions: Array<{ intent: GenerationIntent; label: string }> = [
  { intent: "prompt", label: "Prompt" },
  { intent: "explain", label: "Explain" },
  { intent: "questions", label: "Questions" },
  { intent: "subtopics", label: "Subtopics" }
]

export function ExpandActions({ disabled, onSelect }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((action) => (
        <Button
          key={action.intent}
          type="button"
          disabled={disabled}
          onClick={() => onSelect(action.intent)}
          variant="outline"
          size="sm"
          className="h-7 px-3 text-xs"
        >
          {action.label}
        </Button>
      ))}
    </div>
  )
}
