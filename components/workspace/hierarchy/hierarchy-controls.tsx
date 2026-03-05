"use client"

import React from "react"
import { Button } from "@/components/ui/button"

type Props = {
  onAddBroadTopic: () => void
  onAddSubtopic: () => void
  onAddSibling: () => void
}

export function HierarchyControls({ onAddBroadTopic, onAddSubtopic, onAddSibling }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button type="button" variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={onAddBroadTopic}>
        Broad topic
      </Button>
      <Button type="button" variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={onAddSubtopic}>
        Subtopic
      </Button>
      <Button type="button" variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={onAddSibling}>
        Sibling
      </Button>
    </div>
  )
}
