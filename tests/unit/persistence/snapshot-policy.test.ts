import { describe, expect, it } from "vitest"
import {
  createAdaptiveSnapshotScheduler,
  shouldPersistAdaptiveSnapshot
} from "@/features/persistence/workspace-persistence-service"

describe("adaptive snapshot policy", () => {
  it("triggers snapshot when command threshold is reached", () => {
    const should = shouldPersistAdaptiveSnapshot({
      commandCountSinceSnapshot: 12,
      elapsedMsSinceSnapshot: 2000,
      hasUnsavedChanges: true
    })

    expect(should).toBe(true)
  })

  it("does not trigger when there are no unsaved changes", () => {
    const should = shouldPersistAdaptiveSnapshot({
      commandCountSinceSnapshot: 50,
      elapsedMsSinceSnapshot: 120000,
      hasUnsavedChanges: false
    })

    expect(should).toBe(false)
  })

  it("scheduler resets command count after snapshot", () => {
    const scheduler = createAdaptiveSnapshotScheduler({
      maxCommandsBetweenSnapshots: 2,
      maxElapsedMsBetweenSnapshots: 999999
    })

    scheduler.signalCommand()
    expect(scheduler.shouldSnapshot()).toBe(false)

    scheduler.signalCommand()
    expect(scheduler.shouldSnapshot()).toBe(true)

    scheduler.markSnapshotSaved()
    expect(scheduler.shouldSnapshot()).toBe(false)
  })
})
