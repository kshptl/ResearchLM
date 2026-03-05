import { randomUUID } from "crypto"

type OpenAiBrowserSession = {
  providerId: "openai"
  verifier: string
  state: string
  createdAt: number
}

type OpenAiHeadlessSession = {
  providerId: "openai"
  deviceAuthId: string
  userCode: string
  intervalSeconds: number
  createdAt: number
}

type CopilotSession = {
  providerId: "github"
  domain: string
  deviceCode: string
  intervalSeconds: number
  enterpriseUrl?: string
  createdAt: number
}

type AnthropicSession = {
  providerId: "anthropic"
  mode: "max" | "console"
  verifier: string
  createdAt: number
}

const SESSION_TTL_MS = 10 * 60 * 1000

const openAiBrowserSessions = new Map<string, OpenAiBrowserSession>()
const openAiHeadlessSessions = new Map<string, OpenAiHeadlessSession>()
const copilotSessions = new Map<string, CopilotSession>()
const anthropicSessions = new Map<string, AnthropicSession>()

function cleanupExpired<T extends { createdAt: number }>(store: Map<string, T>): void {
  const now = Date.now()
  for (const [key, value] of store.entries()) {
    if (now - value.createdAt > SESSION_TTL_MS) {
      store.delete(key)
    }
  }
}

function randomString(length: number): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~"
  const bytes = crypto.getRandomValues(new Uint8Array(length))
  return Array.from(bytes)
    .map((byte) => chars[byte % chars.length])
    .join("")
}

function base64UrlEncode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  if (typeof btoa === "function") {
    const binary = String.fromCharCode(...bytes)
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
  }
  return Buffer.from(bytes).toString("base64url")
}

export async function createPkceChallenge(): Promise<{ verifier: string; challenge: string }> {
  const verifier = randomString(43)
  const data = new TextEncoder().encode(verifier)
  const hash = await crypto.subtle.digest("SHA-256", data)
  const challenge = base64UrlEncode(hash)
  return { verifier, challenge }
}

export function createState(): string {
  return base64UrlEncode(crypto.getRandomValues(new Uint8Array(32)).buffer)
}

export function putOpenAiBrowserSession(payload: Omit<OpenAiBrowserSession, "createdAt">): string {
  cleanupExpired(openAiBrowserSessions)
  const id = randomUUID()
  openAiBrowserSessions.set(id, { ...payload, createdAt: Date.now() })
  return id
}

export function getOpenAiBrowserSession(id: string): OpenAiBrowserSession | undefined {
  cleanupExpired(openAiBrowserSessions)
  return openAiBrowserSessions.get(id)
}

export function deleteOpenAiBrowserSession(id: string): void {
  openAiBrowserSessions.delete(id)
}

export function putOpenAiHeadlessSession(payload: Omit<OpenAiHeadlessSession, "createdAt">): string {
  cleanupExpired(openAiHeadlessSessions)
  const id = randomUUID()
  openAiHeadlessSessions.set(id, { ...payload, createdAt: Date.now() })
  return id
}

export function getOpenAiHeadlessSession(id: string): OpenAiHeadlessSession | undefined {
  cleanupExpired(openAiHeadlessSessions)
  return openAiHeadlessSessions.get(id)
}

export function deleteOpenAiHeadlessSession(id: string): void {
  openAiHeadlessSessions.delete(id)
}

export function putCopilotSession(payload: Omit<CopilotSession, "createdAt">): string {
  cleanupExpired(copilotSessions)
  const id = randomUUID()
  copilotSessions.set(id, { ...payload, createdAt: Date.now() })
  return id
}

export function getCopilotSession(id: string): CopilotSession | undefined {
  cleanupExpired(copilotSessions)
  return copilotSessions.get(id)
}

export function deleteCopilotSession(id: string): void {
  copilotSessions.delete(id)
}

export function putAnthropicSession(payload: Omit<AnthropicSession, "createdAt">): string {
  cleanupExpired(anthropicSessions)
  const id = randomUUID()
  anthropicSessions.set(id, { ...payload, createdAt: Date.now() })
  return id
}

export function getAnthropicSession(id: string): AnthropicSession | undefined {
  cleanupExpired(anthropicSessions)
  return anthropicSessions.get(id)
}

export function deleteAnthropicSession(id: string): void {
  anthropicSessions.delete(id)
}
