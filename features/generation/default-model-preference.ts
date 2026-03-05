export type WorkspaceDefaultModelPreference = {
  provider: string
  model: string
}

const STORAGE_KEY = "researchlm:workspace-default-model"
const CHANGE_EVENT = "researchlm:workspace-default-model:change"

export const DEFAULT_WORKSPACE_MODEL_PREFERENCE: WorkspaceDefaultModelPreference = {
  provider: "openai",
  model: "gpt-5.2",
}

function parsePreference(raw: string | null): WorkspaceDefaultModelPreference | null {
  if (!raw) {
    return null
  }

  try {
    const parsed = JSON.parse(raw) as Partial<WorkspaceDefaultModelPreference>
    if (!parsed || typeof parsed.provider !== "string" || typeof parsed.model !== "string") {
      return null
    }
    if (!parsed.provider.trim() || !parsed.model.trim()) {
      return null
    }

    return {
      provider: parsed.provider,
      model: parsed.model,
    }
  } catch {
    return null
  }
}

export function readWorkspaceDefaultModelPreference(
  fallback: WorkspaceDefaultModelPreference = DEFAULT_WORKSPACE_MODEL_PREFERENCE,
): WorkspaceDefaultModelPreference {
  if (typeof window === "undefined" || typeof window.localStorage === "undefined") {
    return fallback
  }

  const parsed = parsePreference(window.localStorage.getItem(STORAGE_KEY))
  return parsed ?? fallback
}

export function writeWorkspaceDefaultModelPreference(preference: WorkspaceDefaultModelPreference): void {
  if (typeof window === "undefined" || typeof window.localStorage === "undefined") {
    return
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preference))
  window.dispatchEvent(
    new CustomEvent<WorkspaceDefaultModelPreference>(CHANGE_EVENT, {
      detail: preference,
    }),
  )
}

export function subscribeWorkspaceDefaultModelPreference(
  listener: (preference: WorkspaceDefaultModelPreference) => void,
): () => void {
  if (typeof window === "undefined") {
    return () => undefined
  }

  const onStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY) {
      return
    }
    const parsed = parsePreference(event.newValue)
    if (parsed) {
      listener(parsed)
    }
  }

  const onCustom = (event: Event) => {
    const detail = (event as CustomEvent<WorkspaceDefaultModelPreference | undefined>).detail
    if (!detail || typeof detail.provider !== "string" || typeof detail.model !== "string") {
      return
    }
    listener(detail)
  }

  window.addEventListener("storage", onStorage)
  window.addEventListener(CHANGE_EVENT, onCustom as EventListener)

  return () => {
    window.removeEventListener("storage", onStorage)
    window.removeEventListener(CHANGE_EVENT, onCustom as EventListener)
  }
}

