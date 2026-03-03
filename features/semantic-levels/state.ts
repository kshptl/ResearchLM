import type { SemanticLevel } from "@/features/graph-model/types"

export interface SemanticBreakpoints {
  keywordsMaxZoom: number
  summaryMaxZoom: number
  linesMaxZoom: number
}

export interface SemanticState {
  mode: "auto" | "manual"
  level: SemanticLevel
  breakpoints?: SemanticBreakpoints
}

export const DEFAULT_SEMANTIC_BREAKPOINTS: SemanticBreakpoints = {
  keywordsMaxZoom: 0.35,
  summaryMaxZoom: 0.55,
  linesMaxZoom: 0.75
}

function normalizeZoom(zoom: number): number {
  if (!Number.isFinite(zoom)) {
    return 1
  }
  return Math.max(0, Math.min(2, zoom))
}

function normalizeBreakpoints(breakpoints?: SemanticBreakpoints): SemanticBreakpoints {
  if (!breakpoints) {
    return DEFAULT_SEMANTIC_BREAKPOINTS
  }

  const keywordsMaxZoom = Math.max(0.05, breakpoints.keywordsMaxZoom)
  const summaryMaxZoom = Math.max(keywordsMaxZoom + 0.01, breakpoints.summaryMaxZoom)
  const linesMaxZoom = Math.max(summaryMaxZoom + 0.01, breakpoints.linesMaxZoom)
  return {
    keywordsMaxZoom,
    summaryMaxZoom,
    linesMaxZoom
  }
}

export function levelFromZoom(zoom: number, breakpoints?: SemanticBreakpoints): SemanticLevel {
  const normalizedZoom = normalizeZoom(zoom)
  const thresholds = normalizeBreakpoints(breakpoints)

  if (normalizedZoom < thresholds.keywordsMaxZoom) {
    return "keywords"
  }
  if (normalizedZoom < thresholds.summaryMaxZoom) {
    return "summary"
  }
  if (normalizedZoom < thresholds.linesMaxZoom) {
    return "lines"
  }
  return "all"
}

export function resolveSemanticLevel(state: SemanticState, zoom: number): SemanticLevel {
  if (state.mode === "manual") {
    return state.level
  }
  return levelFromZoom(zoom, state.breakpoints)
}

export function setSemanticMode(state: SemanticState, mode: "auto" | "manual"): SemanticState {
  return {
    ...state,
    mode
  }
}

export function setManualLevel(state: SemanticState, level: SemanticLevel): SemanticState {
  return {
    ...state,
    mode: "manual",
    level
  }
}
