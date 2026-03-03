export type InteractionMode = "select" | "pan" | "connect" | "lasso"

type TransitionContext = {
  hasSelection: boolean
  isPointerDown: boolean
}

const allowedTransitions: Record<InteractionMode, InteractionMode[]> = {
  select: ["pan", "connect", "lasso"],
  pan: ["select", "lasso"],
  connect: ["select"],
  lasso: ["select", "pan"]
}

export function canTransitionMode(
  current: InteractionMode,
  next: InteractionMode,
  context: TransitionContext
): boolean {
  if (current === next) {
    return true
  }

  if (context.isPointerDown) {
    return false
  }

  if (current === "connect" && next === "lasso" && !context.hasSelection) {
    return false
  }

  return allowedTransitions[current].includes(next)
}

export function transitionMode(
  current: InteractionMode,
  next: InteractionMode,
  context: TransitionContext
): InteractionMode {
  return canTransitionMode(current, next, context) ? next : current
}
