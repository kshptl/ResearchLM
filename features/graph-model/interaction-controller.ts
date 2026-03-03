import { resolveShortcutAction } from "@/features/graph-model/keyboard-shortcuts"
import { transitionMode, type InteractionMode } from "@/features/graph-model/interaction-mode"

export type InteractionControllerState = {
  mode: InteractionMode
  hasSelection: boolean
  isPointerDown: boolean
}

export function handleKeyboardShortcut(
  state: InteractionControllerState,
  event: Pick<KeyboardEvent, "key" | "metaKey" | "shiftKey" | "altKey" | "ctrlKey">
): InteractionControllerState {
  const action = resolveShortcutAction(event)
  if (!action) {
    return state
  }

  if (action === "select-mode") {
    return { ...state, mode: transitionMode(state.mode, "select", state) }
  }
  if (action === "pan-mode") {
    return { ...state, mode: transitionMode(state.mode, "pan", state) }
  }
  if (action === "connect-mode") {
    return { ...state, mode: transitionMode(state.mode, "connect", state) }
  }
  if (action === "lasso-mode") {
    return { ...state, mode: transitionMode(state.mode, "lasso", state) }
  }

  return state
}

export function setPointerState(state: InteractionControllerState, isPointerDown: boolean): InteractionControllerState {
  return {
    ...state,
    isPointerDown
  }
}
