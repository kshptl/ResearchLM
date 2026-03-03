import type { ConflictEventRecord } from "@/features/persistence/repository"

export interface ConflictNoticeLifecycleState {
  activeNoticeId: string | null
  dismissedNoticeIds: string[]
}

export function createConflictNoticeLifecycleState(): ConflictNoticeLifecycleState {
  return {
    activeNoticeId: null,
    dismissedNoticeIds: []
  }
}

export function persistConflictNotice(
  state: ConflictNoticeLifecycleState,
  conflict: ConflictEventRecord
): ConflictNoticeLifecycleState {
  if (state.dismissedNoticeIds.includes(conflict.id)) {
    return state
  }

  return {
    ...state,
    activeNoticeId: conflict.id
  }
}

export function dismissConflictNotice(
  state: ConflictNoticeLifecycleState,
  noticeId: string
): ConflictNoticeLifecycleState {
  return {
    activeNoticeId: state.activeNoticeId === noticeId ? null : state.activeNoticeId,
    dismissedNoticeIds: state.dismissedNoticeIds.includes(noticeId)
      ? state.dismissedNoticeIds
      : [...state.dismissedNoticeIds, noticeId]
  }
}

export function replaceConflictNotice(
  state: ConflictNoticeLifecycleState,
  nextConflict: ConflictEventRecord
): ConflictNoticeLifecycleState {
  return {
    ...state,
    activeNoticeId: nextConflict.id
  }
}
