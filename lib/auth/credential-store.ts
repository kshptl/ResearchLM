export type StoredCredential = {
  id: string
  provider: string
  authType: "api-key" | "oauth" | "aws-profile"
  encryptedValue: string
  status: "active" | "invalid" | "revoked"
  lastValidatedAt?: string
  updatedAt: string
}

const STORAGE_KEY = "sensecape:provider-credentials"
const memoryStore = new Map<string, StoredCredential>()

function encode(value: string): string {
  if (typeof btoa === "function") {
    const bytes = new TextEncoder().encode(value)
    let binary = ""
    for (const byte of bytes) {
      binary += String.fromCharCode(byte)
    }
    return btoa(binary)
  }

  return value
}

function persist(): void {
  if (typeof window === "undefined") {
    return
  }

  const records = Array.from(memoryStore.values())
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records))
}

function hydrate(): void {
  if (typeof window === "undefined") {
    return
  }

  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw) {
    return
  }

  try {
    const records = JSON.parse(raw) as StoredCredential[]
    for (const record of records) {
      if (!record.id || !record.provider) {
        continue
      }
      memoryStore.set(record.id, record)
    }
  } catch {
    window.localStorage.removeItem(STORAGE_KEY)
  }
}

hydrate()

export function saveCredential(provider: string, authType: "api-key" | "oauth" | "aws-profile", rawValue: string): StoredCredential {
  const record: StoredCredential = {
    id: crypto.randomUUID(),
    provider,
    authType,
    encryptedValue: encode(rawValue),
    status: "active",
    lastValidatedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
  memoryStore.set(record.id, record)
  persist()
  return record
}

export function getCredentialRef(id: string): StoredCredential | undefined {
  return memoryStore.get(id)
}

export function getActiveCredentialByProvider(provider: string): StoredCredential | undefined {
  return Array.from(memoryStore.values()).find((item) => item.provider === provider && item.status === "active")
}

export function listCredentials(provider?: string): StoredCredential[] {
  const credentials = Array.from(memoryStore.values())
  return credentials
    .filter((credential) => (provider ? credential.provider === provider : true))
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
}

export function replaceCredential(id: string, rawValue: string): StoredCredential | undefined {
  const current = memoryStore.get(id)
  if (!current) {
    return undefined
  }

  const next: StoredCredential = {
    ...current,
    encryptedValue: encode(rawValue),
    status: "active",
    lastValidatedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
  memoryStore.set(id, next)
  persist()
  return next
}

export function markCredentialInvalid(id: string): StoredCredential | undefined {
  const current = memoryStore.get(id)
  if (!current) {
    return undefined
  }

  const next: StoredCredential = {
    ...current,
    status: "invalid",
    updatedAt: new Date().toISOString()
  }
  memoryStore.set(id, next)
  persist()
  return next
}

export function revokeCredential(id: string): StoredCredential | undefined {
  const current = memoryStore.get(id)
  if (!current) {
    return undefined
  }

  const next: StoredCredential = {
    ...current,
    status: "revoked",
    updatedAt: new Date().toISOString()
  }
  memoryStore.set(id, next)
  persist()
  return next
}

export function clearCredentialsForTests(): void {
  memoryStore.clear()
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(STORAGE_KEY)
  }
}
