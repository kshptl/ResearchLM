import type { NormalizedStreamEvent } from "@/lib/providers/adapter-types"

export function assertMonotonicSequence(previousSequence: number | null, nextSequence: number): number {
  if (previousSequence !== null && nextSequence <= previousSequence) {
    throw new Error(`SSE sequence must be monotonic: prev=${previousSequence}, next=${nextSequence}`)
  }
  return nextSequence
}

export function encodeSseEvent(event: NormalizedStreamEvent): string {
  return `event: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`
}

export function encodeSsePing(): string {
  return ": ping\n\n"
}
