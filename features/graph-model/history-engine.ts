export const MIN_HISTORY_DEPTH = 100

export type HistoryCommand = {
  id: string
  label: string
  run: () => void
  undo: () => void
}

export type HistoryState = {
  undoStack: HistoryCommand[]
  redoStack: HistoryCommand[]
}

export function createHistoryState(): HistoryState {
  return {
    undoStack: [],
    redoStack: []
  }
}

export function pushHistoryCommand(
  state: HistoryState,
  command: HistoryCommand,
  maxDepth: number = MIN_HISTORY_DEPTH
): HistoryState {
  const undoStack = [...state.undoStack, command]
  const trimmed = undoStack.length > maxDepth ? undoStack.slice(undoStack.length - maxDepth) : undoStack

  return {
    undoStack: trimmed,
    redoStack: []
  }
}

export function undo(state: HistoryState): HistoryState {
  const command = state.undoStack[state.undoStack.length - 1]
  if (!command) {
    return state
  }

  command.undo()
  return {
    undoStack: state.undoStack.slice(0, -1),
    redoStack: [...state.redoStack, command]
  }
}

export function redo(state: HistoryState): HistoryState {
  const command = state.redoStack[state.redoStack.length - 1]
  if (!command) {
    return state
  }

  command.run()
  return {
    undoStack: [...state.undoStack, command],
    redoStack: state.redoStack.slice(0, -1)
  }
}
