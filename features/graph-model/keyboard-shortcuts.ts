export type ShortcutAction =
  | "undo"
  | "redo"
  | "select-mode"
  | "pan-mode"
  | "connect-mode"
  | "lasso-mode"
  | "delete-selection"

type KeyMatcher = {
  key: string
  meta?: boolean
  shift?: boolean
  alt?: boolean
  ctrl?: boolean
}

const shortcuts: Array<{ matcher: KeyMatcher; action: ShortcutAction }> = [
  { matcher: { key: "z", meta: true }, action: "undo" },
  { matcher: { key: "z", meta: true, shift: true }, action: "redo" },
  { matcher: { key: "1" }, action: "select-mode" },
  { matcher: { key: "2" }, action: "pan-mode" },
  { matcher: { key: "3" }, action: "connect-mode" },
  { matcher: { key: "4" }, action: "lasso-mode" },
  { matcher: { key: "Backspace" }, action: "delete-selection" },
  { matcher: { key: "Delete" }, action: "delete-selection" }
]

function matches(event: Pick<KeyboardEvent, "key" | "metaKey" | "shiftKey" | "altKey" | "ctrlKey">, matcher: KeyMatcher) {
  return (
    event.key.toLowerCase() === matcher.key.toLowerCase() &&
    event.metaKey === Boolean(matcher.meta) &&
    event.shiftKey === Boolean(matcher.shift) &&
    event.altKey === Boolean(matcher.alt) &&
    event.ctrlKey === Boolean(matcher.ctrl)
  )
}

export function resolveShortcutAction(
  event: Pick<KeyboardEvent, "key" | "metaKey" | "shiftKey" | "altKey" | "ctrlKey">
): ShortcutAction | null {
  for (const entry of shortcuts) {
    if (matches(event, entry.matcher)) {
      return entry.action
    }
  }
  return null
}
