import {
  credentialPrimarySecret,
  mapCredentialToLegacyType,
  type LegacyCredentialType,
  type ProviderAuthCredential,
} from "@/lib/auth/auth-types"

export type StoredCredential = {
  id: string
  provider: string
  authType: LegacyCredentialType | "wellknown" | "aws-env-chain"
  encryptedValue: string
  encryptedPayload: string
  status: "active" | "invalid" | "revoked"
  lastValidatedAt?: string
  updatedAt: string
}

type LegacyStoredCredential = {
  id: string
  provider: string
  authType: LegacyCredentialType
  encryptedValue: string
  status: "active" | "invalid" | "revoked"
  lastValidatedAt?: string
  updatedAt: string
}

const STORAGE_KEY = "researchlm:provider-credentials"
const memoryStore = new Map<string, StoredCredential>()

function canonicalProviderId(provider: string): string {
  if (provider === "github-models" || provider === "github-copilot" || provider === "github-copilot-enterprise") {
    return "github"
  }
  if (provider === "bedrock") {
    return "amazon-bedrock"
  }
  if (provider === "gemini") {
    return "google"
  }
  return provider
}

function encode(value: string): string {
  const bytes = new TextEncoder().encode(value)

  if (typeof btoa === "function") {
    let binary = ""
    for (const byte of bytes) {
      binary += String.fromCharCode(byte)
    }
    return btoa(binary)
  }

  return Buffer.from(bytes).toString("base64")
}

function decode(value: string): string {
  try {
    if (typeof atob === "function") {
      const binary = atob(value)
      const bytes = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i += 1) {
        bytes[i] = binary.charCodeAt(i)
      }
      return new TextDecoder().decode(bytes)
    }
    return Buffer.from(value, "base64").toString("utf8")
  } catch {
    return ""
  }
}

function serializeCredentialPayload(payload: ProviderAuthCredential): string {
  return encode(JSON.stringify(payload))
}

function parseCredentialPayload(value: string): ProviderAuthCredential | undefined {
  try {
    const parsed = JSON.parse(decode(value)) as Partial<ProviderAuthCredential>
    if (!parsed || typeof parsed !== "object" || !("type" in parsed)) {
      return undefined
    }

    switch (parsed.type) {
      case "api":
        if (typeof parsed.key === "string") {
          return { type: "api", key: parsed.key }
        }
        return undefined
      case "oauth":
        if (typeof parsed.access === "string" && typeof parsed.refresh === "string") {
          return {
            type: "oauth",
            access: parsed.access,
            refresh: parsed.refresh,
            expires: typeof parsed.expires === "number" ? parsed.expires : 0,
            accountId: typeof parsed.accountId === "string" ? parsed.accountId : undefined,
            enterpriseUrl: typeof parsed.enterpriseUrl === "string" ? parsed.enterpriseUrl : undefined,
          }
        }
        return undefined
      case "wellknown":
        if (typeof parsed.key === "string" && typeof parsed.token === "string") {
          return { type: "wellknown", key: parsed.key, token: parsed.token }
        }
        return undefined
      case "aws-profile":
        if (typeof parsed.profile === "string") {
          return { type: "aws-profile", profile: parsed.profile, region: typeof parsed.region === "string" ? parsed.region : undefined }
        }
        return undefined
      case "aws-env-chain":
        return { type: "aws-env-chain", region: typeof parsed.region === "string" ? parsed.region : undefined }
      default:
        return undefined
    }
  } catch {
    return undefined
  }
}

function mapLegacyToCredential(record: LegacyStoredCredential): ProviderAuthCredential {
  const raw = decode(record.encryptedValue)

  if (record.authType === "oauth") {
    try {
      const parsed = JSON.parse(raw) as Partial<{ access: string; refresh: string; expires: number; accountId: string }>
      if (typeof parsed.access === "string" && typeof parsed.refresh === "string") {
        return {
          type: "oauth",
          access: parsed.access,
          refresh: parsed.refresh,
          expires: typeof parsed.expires === "number" ? parsed.expires : 0,
          accountId: typeof parsed.accountId === "string" ? parsed.accountId : undefined,
        }
      }
    } catch {}

    return {
      type: "oauth",
      access: raw,
      refresh: raw,
      expires: 0,
    }
  }

  if (record.authType === "aws-profile") {
    return {
      type: "aws-profile",
      profile: raw,
    }
  }

  return {
    type: "api",
    key: raw,
  }
}

function upgradeLegacyRecord(record: LegacyStoredCredential): StoredCredential {
  const payload = mapLegacyToCredential(record)
  return {
    ...record,
    authType: mapCredentialToLegacyType(payload),
    encryptedPayload: serializeCredentialPayload(payload),
    encryptedValue: encode(credentialPrimarySecret(payload)),
  }
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
    const records = JSON.parse(raw) as Array<StoredCredential | LegacyStoredCredential>
    let mutated = false

    for (const record of records) {
      if (!record || typeof record !== "object" || !("id" in record) || !("provider" in record)) {
        continue
      }

      const typed = record as Partial<StoredCredential>
      if (typeof typed.id !== "string" || typeof typed.provider !== "string" || typeof typed.authType !== "string") {
        continue
      }

      if (typeof typed.encryptedPayload === "string") {
        memoryStore.set(typed.id, typed as StoredCredential)
        continue
      }

      mutated = true
      const upgraded = upgradeLegacyRecord(record as LegacyStoredCredential)
      memoryStore.set(upgraded.id, upgraded)
    }

    if (mutated) {
      persist()
    }
  } catch {
    window.localStorage.removeItem(STORAGE_KEY)
  }
}

hydrate()

function createStoredCredential(provider: string, payload: ProviderAuthCredential): StoredCredential {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    provider: canonicalProviderId(provider),
    authType: mapCredentialToLegacyType(payload),
    encryptedValue: encode(credentialPrimarySecret(payload)),
    encryptedPayload: serializeCredentialPayload(payload),
    status: "active",
    lastValidatedAt: now,
    updatedAt: now,
  }
}

function saveStoredCredential(record: StoredCredential): StoredCredential {
  memoryStore.set(record.id, record)
  persist()
  return record
}

export function saveCredential(provider: string, authType: LegacyCredentialType, rawValue: string): StoredCredential {
  if (authType === "oauth") {
    try {
      const parsed = JSON.parse(rawValue) as Partial<ProviderAuthCredential>
      if (parsed && parsed.type === "oauth" && typeof parsed.access === "string" && typeof parsed.refresh === "string") {
        return saveCredentialAuth(provider, {
          type: "oauth",
          access: parsed.access,
          refresh: parsed.refresh,
          expires: typeof parsed.expires === "number" ? parsed.expires : 0,
          accountId: typeof parsed.accountId === "string" ? parsed.accountId : undefined,
          enterpriseUrl: typeof parsed.enterpriseUrl === "string" ? parsed.enterpriseUrl : undefined,
        })
      }
    } catch {}

    return saveCredentialAuth(provider, {
      type: "oauth",
      access: rawValue,
      refresh: rawValue,
      expires: 0,
    })
  }

  if (authType === "aws-profile") {
    return saveCredentialAuth(provider, {
      type: "aws-profile",
      profile: rawValue,
    })
  }

  return saveCredentialAuth(provider, {
    type: "api",
    key: rawValue,
  })
}

export function saveCredentialAuth(provider: string, payload: ProviderAuthCredential): StoredCredential {
  return saveStoredCredential(createStoredCredential(provider, payload))
}

export function getCredentialRef(id: string): StoredCredential | undefined {
  return memoryStore.get(id)
}

export function getCredentialAuth(recordOrId: StoredCredential | string): ProviderAuthCredential | undefined {
  const record = typeof recordOrId === "string" ? memoryStore.get(recordOrId) : recordOrId
  if (!record) {
    return undefined
  }

  return parseCredentialPayload(record.encryptedPayload)
}

export function getActiveCredentialByProvider(provider: string): StoredCredential | undefined {
  const targetProvider = canonicalProviderId(provider)
  const matches = listCredentials().filter(
    (item) => item.status === "active" && canonicalProviderId(item.provider) === targetProvider,
  )
  if (matches.length === 0) {
    return undefined
  }

  // For merged GitHub provider, prefer API/Models credentials when present.
  if (targetProvider === "github") {
    const preferred = matches.find((item) => {
      const auth = getCredentialAuth(item)
      return auth?.type === "api" || auth?.type === "wellknown"
    })
    if (preferred) {
      return preferred
    }
  }

  return matches[0]
}

export function listCredentials(provider?: string): StoredCredential[] {
  const credentials = Array.from(memoryStore.values())
  return credentials
    .filter((credential) => (provider ? credential.provider === provider : true))
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
}

export function replaceCredential(id: string, next: string | ProviderAuthCredential): StoredCredential | undefined {
  const current = memoryStore.get(id)
  if (!current) {
    return undefined
  }

  const payload =
    typeof next === "string"
      ? (() => {
          const currentAuth = getCredentialAuth(current)
          if (!currentAuth) {
            return { type: "api", key: next } satisfies ProviderAuthCredential
          }
          if (currentAuth.type === "oauth") {
            return { ...currentAuth, access: next, refresh: next, expires: 0 } satisfies ProviderAuthCredential
          }
          if (currentAuth.type === "aws-profile") {
            return { type: "aws-profile", profile: next, region: currentAuth.region } satisfies ProviderAuthCredential
          }
          if (currentAuth.type === "wellknown") {
            return { ...currentAuth, token: next } satisfies ProviderAuthCredential
          }
          return { type: "api", key: next } satisfies ProviderAuthCredential
        })()
      : next

  const updated: StoredCredential = {
    ...current,
    authType: mapCredentialToLegacyType(payload),
    encryptedValue: encode(credentialPrimarySecret(payload)),
    encryptedPayload: serializeCredentialPayload(payload),
    status: "active",
    lastValidatedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  return saveStoredCredential(updated)
}

export function markCredentialInvalid(id: string): StoredCredential | undefined {
  const current = memoryStore.get(id)
  if (!current) {
    return undefined
  }

  const next: StoredCredential = {
    ...current,
    status: "invalid",
    updatedAt: new Date().toISOString(),
  }
  return saveStoredCredential(next)
}

export function revokeCredential(id: string): StoredCredential | undefined {
  const current = memoryStore.get(id)
  if (!current) {
    return undefined
  }

  const next: StoredCredential = {
    ...current,
    status: "revoked",
    updatedAt: new Date().toISOString(),
  }
  return saveStoredCredential(next)
}

export function clearCredentialsForTests(): void {
  memoryStore.clear()
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(STORAGE_KEY)
  }
}
