"use client"

import React from "react"
import { useEffect, useState, type ReactNode } from "react"

export default function WorkspaceLayout({ children }: { children: ReactNode }) {
  const [isDesktop, setIsDesktop] = useState(true)

  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)")
    const update = () => setIsDesktop(media.matches)
    update()
    media.addEventListener("change", update)
    return () => media.removeEventListener("change", update)
  }, [])

  return (
    <section className="flex h-screen flex-col">
      {!isDesktop ? (
        <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800" role="status">
          Desktop editing is required for this workspace. Editing actions are disabled on this viewport.
        </div>
      ) : null}
      <div className={`flex-1 min-h-0 ${!isDesktop ? "pointer-events-none opacity-70" : ""}`} aria-disabled={!isDesktop}>
        {children}
      </div>
    </section>
  )
}
