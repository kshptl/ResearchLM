import { NextResponse } from "next/server"
import { z } from "zod"
import {
  createPkceChallenge,
  createState,
  deleteAnthropicSession,
  deleteCopilotSession,
  deleteOpenAiBrowserSession,
  deleteOpenAiHeadlessSession,
  getAnthropicSession,
  getCopilotSession,
  getOpenAiBrowserSession,
  getOpenAiHeadlessSession,
  putAnthropicSession,
  putCopilotSession,
  putOpenAiBrowserSession,
  putOpenAiHeadlessSession,
} from "@/lib/auth/oauth-sessions"

const OPENAI_CLIENT_ID = "app_EMoamEEZ73f0CkXaXp7hrann"
const OPENAI_ISSUER = "https://auth.openai.com"
const OPENAI_BROWSER_REDIRECT = "https://auth.openai.com/deviceauth/callback"

const ANTHROPIC_CLIENT_ID = "9d1c250a-e61b-44d9-88ed-5944d1962f5e"
const ANTHROPIC_REDIRECT_URI = "https://console.anthropic.com/oauth/code/callback"

const GITHUB_COPILOT_CLIENT_ID = "Ov23li8tweQw6odWQebz"

type OAuthTokenResult = {
  access: string
  refresh: string
  expires: number
  accountId?: string
  enterpriseUrl?: string
}

const requestSchema = z.object({
  action: z.string().min(1),
  sessionId: z.string().optional(),
  callbackInput: z.string().optional(),
  deploymentType: z.enum(["github.com", "enterprise"]).optional(),
  enterpriseUrl: z.string().optional(),
})

function normalizeDomain(value: string): string {
  return value.replace(/^https?:\/\//, "").replace(/\/+$/, "")
}

function parseOpenAiAccountId(tokens: { id_token?: string; access_token?: string }): string | undefined {
  const token = tokens.id_token ?? tokens.access_token
  if (!token) {
    return undefined
  }

  try {
    const [, payload] = token.split(".")
    if (!payload) {
      return undefined
    }
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Record<string, unknown>
    const auth = decoded["https://api.openai.com/auth"] as Record<string, unknown> | undefined
    const chatAccountId = auth?.chatgpt_account_id
    if (typeof chatAccountId === "string") {
      return chatAccountId
    }
    const topLevel = decoded.chatgpt_account_id
    if (typeof topLevel === "string") {
      return topLevel
    }
    const organizations = decoded.organizations
    if (Array.isArray(organizations)) {
      const first = organizations[0]
      if (first && typeof first === "object" && !Array.isArray(first)) {
        const orgId = (first as Record<string, unknown>).id
        if (typeof orgId === "string") {
          return orgId
        }
      }
    }
    return undefined
  } catch {
    return undefined
  }
}

async function exchangeOpenAiCodeForTokens(input: { code: string; verifier: string; redirectUri: string }): Promise<OAuthTokenResult | null> {
  const response = await fetch(`${OPENAI_ISSUER}/oauth/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code: input.code,
      redirect_uri: input.redirectUri,
      client_id: OPENAI_CLIENT_ID,
      code_verifier: input.verifier,
    }).toString(),
  })

  if (!response.ok) {
    return null
  }

  const tokens = (await response.json()) as {
    access_token: string
    refresh_token: string
    expires_in?: number
    id_token?: string
  }

  return {
    access: tokens.access_token,
    refresh: tokens.refresh_token,
    expires: Date.now() + (tokens.expires_in ?? 3600) * 1000,
    accountId: parseOpenAiAccountId(tokens),
  }
}

function parseCallbackInput(callbackInput: string): { code?: string; state?: string } {
  const trimmed = callbackInput.trim()
  if (!trimmed) {
    return {}
  }

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const url = new URL(trimmed)
      return {
        code: url.searchParams.get("code") ?? undefined,
        state: url.searchParams.get("state") ?? undefined,
      }
    } catch {
      return {}
    }
  }

  const normalized = trimmed.startsWith("?") ? trimmed.slice(1) : trimmed
  if (normalized.includes("=")) {
    const params = new URLSearchParams(normalized)
    const code = params.get("code") ?? undefined
    const state = params.get("state") ?? undefined
    if (code || state) {
      return { code, state }
    }
  }

  return { code: normalized }
}

function parseAnthropicCallbackInput(callbackInput: string): { code?: string; state?: string } {
  const trimmed = callbackInput.trim()
  if (!trimmed) {
    return {}
  }

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const url = new URL(trimmed)
      const code = url.searchParams.get("code") ?? undefined
      const state = url.searchParams.get("state") ?? undefined
      if (code) {
        return { code, state }
      }
    } catch {
      return {}
    }
  }

  const normalized = trimmed.startsWith("?") ? trimmed.slice(1) : trimmed
  if (normalized.includes("=")) {
    const params = new URLSearchParams(normalized)
    const code = params.get("code") ?? undefined
    const state = params.get("state") ?? undefined
    if (code) {
      return { code, state }
    }
  }

  const split = normalized.split("#")
  if (split[0] && split[0].length > 0) {
    return {
      code: split[0],
      state: split[1],
    }
  }

  return {}
}

async function startOpenAiBrowserFlow(): Promise<Response> {
  const pkce = await createPkceChallenge()
  const state = createState()
  const authorizationUrl = new URL(`${OPENAI_ISSUER}/oauth/authorize`)
  authorizationUrl.searchParams.set("response_type", "code")
  authorizationUrl.searchParams.set("client_id", OPENAI_CLIENT_ID)
  authorizationUrl.searchParams.set("redirect_uri", OPENAI_BROWSER_REDIRECT)
  authorizationUrl.searchParams.set("scope", "openid profile email offline_access")
  authorizationUrl.searchParams.set("code_challenge", pkce.challenge)
  authorizationUrl.searchParams.set("code_challenge_method", "S256")
  authorizationUrl.searchParams.set("id_token_add_organizations", "true")
  authorizationUrl.searchParams.set("codex_cli_simplified_flow", "true")
  authorizationUrl.searchParams.set("state", state)
  authorizationUrl.searchParams.set("originator", "researchlm")

  const sessionId = putOpenAiBrowserSession({
    providerId: "openai",
    verifier: pkce.verifier,
    state,
  })

  return NextResponse.json({
    status: "ready",
    sessionId,
    method: "callback",
    authorizationUrl: authorizationUrl.toString(),
    instructions: "Open the URL, complete auth, then paste callback URL or code.",
  })
}

async function completeOpenAiBrowserFlow(sessionId: string, callbackInput: string): Promise<Response> {
  const session = getOpenAiBrowserSession(sessionId)
  if (!session) {
    return NextResponse.json({ status: "failed", message: "OAuth session not found or expired." }, { status: 404 })
  }

  const parsed = parseCallbackInput(callbackInput)
  if (!parsed.code) {
    return NextResponse.json({ status: "failed", message: "Missing authorization code." }, { status: 400 })
  }

  if (parsed.state && parsed.state !== session.state) {
    return NextResponse.json({ status: "failed", message: "OAuth state mismatch." }, { status: 400 })
  }

  const tokens = await exchangeOpenAiCodeForTokens({
    code: parsed.code,
    verifier: session.verifier,
    redirectUri: OPENAI_BROWSER_REDIRECT,
  })

  if (!tokens) {
    return NextResponse.json({ status: "failed", message: "Failed to exchange OAuth token." }, { status: 401 })
  }

  deleteOpenAiBrowserSession(sessionId)
  return NextResponse.json({
    status: "success",
    provider: "openai",
    auth: {
      type: "oauth",
      access: tokens.access,
      refresh: tokens.refresh,
      expires: tokens.expires,
      accountId: tokens.accountId,
    },
  })
}

async function startOpenAiHeadlessFlow(): Promise<Response> {
  const response = await fetch(`${OPENAI_ISSUER}/api/accounts/deviceauth/usercode`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "researchlm/0.1.0",
    },
    body: JSON.stringify({ client_id: OPENAI_CLIENT_ID }),
  })

  if (!response.ok) {
    return NextResponse.json({ status: "failed", message: "Unable to start OpenAI device auth." }, { status: 502 })
  }

  const payload = (await response.json()) as {
    device_auth_id: string
    user_code: string
    interval: string
  }

  const sessionId = putOpenAiHeadlessSession({
    providerId: "openai",
    deviceAuthId: payload.device_auth_id,
    userCode: payload.user_code,
    intervalSeconds: Math.max(Number.parseInt(payload.interval, 10) || 5, 1),
  })

  return NextResponse.json({
    status: "pending",
    sessionId,
    verificationUrl: `${OPENAI_ISSUER}/codex/device`,
    userCode: payload.user_code,
    intervalSeconds: Math.max(Number.parseInt(payload.interval, 10) || 5, 1),
  })
}

async function pollOpenAiHeadlessFlow(sessionId: string): Promise<Response> {
  const session = getOpenAiHeadlessSession(sessionId)
  if (!session) {
    return NextResponse.json({ status: "failed", message: "OAuth session not found or expired." }, { status: 404 })
  }

  const response = await fetch(`${OPENAI_ISSUER}/api/accounts/deviceauth/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "researchlm/0.1.0",
    },
    body: JSON.stringify({
      device_auth_id: session.deviceAuthId,
      user_code: session.userCode,
    }),
  })

  if (!response.ok) {
    if (response.status === 403 || response.status === 404) {
      return NextResponse.json({
        status: "pending",
        intervalSeconds: session.intervalSeconds,
      })
    }
    return NextResponse.json({ status: "failed", message: "OpenAI device auth failed." }, { status: 401 })
  }

  const payload = (await response.json()) as {
    authorization_code: string
    code_verifier: string
  }

  const tokenResponse = await exchangeOpenAiCodeForTokens({
    code: payload.authorization_code,
    verifier: payload.code_verifier,
    redirectUri: `${OPENAI_ISSUER}/deviceauth/callback`,
  })

  if (!tokenResponse) {
    return NextResponse.json({ status: "failed", message: "OpenAI token exchange failed." }, { status: 401 })
  }

  deleteOpenAiHeadlessSession(sessionId)
  return NextResponse.json({
    status: "success",
    provider: "openai",
    auth: {
      type: "oauth",
      access: tokenResponse.access,
      refresh: tokenResponse.refresh,
      expires: tokenResponse.expires,
      accountId: tokenResponse.accountId,
    },
  })
}

async function startCopilotFlow(input: { deploymentType?: "github.com" | "enterprise"; enterpriseUrl?: string }): Promise<Response> {
  const deploymentType = input.deploymentType ?? "github.com"
  const domain = deploymentType === "enterprise" ? normalizeDomain(input.enterpriseUrl ?? "") : "github.com"
  if (deploymentType === "enterprise" && !domain) {
    return NextResponse.json({ status: "failed", message: "Enterprise URL is required." }, { status: 400 })
  }

  const deviceResponse = await fetch(`https://${domain}/login/device/code`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "User-Agent": "researchlm/0.1.0",
    },
    body: JSON.stringify({
      client_id: GITHUB_COPILOT_CLIENT_ID,
      scope: "read:user",
    }),
  })

  if (!deviceResponse.ok) {
    return NextResponse.json({ status: "failed", message: "Unable to start GitHub device auth." }, { status: 502 })
  }

  const deviceData = (await deviceResponse.json()) as {
    verification_uri: string
    user_code: string
    device_code: string
    interval: number
  }

  const sessionId = putCopilotSession({
    providerId: "github",
    domain,
    deviceCode: deviceData.device_code,
    intervalSeconds: Math.max(deviceData.interval || 5, 1),
    enterpriseUrl: deploymentType === "enterprise" ? domain : undefined,
  })

  return NextResponse.json({
    status: "pending",
    sessionId,
    verificationUrl: deviceData.verification_uri,
    userCode: deviceData.user_code,
    intervalSeconds: Math.max(deviceData.interval || 5, 1),
  })
}

async function pollCopilotFlow(sessionId: string): Promise<Response> {
  const session = getCopilotSession(sessionId)
  if (!session) {
    return NextResponse.json({ status: "failed", message: "OAuth session not found or expired." }, { status: 404 })
  }

  const response = await fetch(`https://${session.domain}/login/oauth/access_token`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "User-Agent": "researchlm/0.1.0",
    },
    body: JSON.stringify({
      client_id: GITHUB_COPILOT_CLIENT_ID,
      device_code: session.deviceCode,
      grant_type: "urn:ietf:params:oauth:grant-type:device_code",
    }),
  })

  if (!response.ok) {
    return NextResponse.json({ status: "failed", message: "GitHub device auth failed." }, { status: 401 })
  }

  const payload = (await response.json()) as {
    access_token?: string
    error?: string
  }

  if (payload.access_token) {
    deleteCopilotSession(sessionId)
    return NextResponse.json({
      status: "success",
      provider: "github",
      auth: {
        type: "oauth",
        access: payload.access_token,
        refresh: payload.access_token,
        expires: 0,
        enterpriseUrl: session.enterpriseUrl,
      },
    })
  }

  if (payload.error === "authorization_pending" || payload.error === "slow_down") {
    return NextResponse.json({
      status: "pending",
      intervalSeconds: session.intervalSeconds + (payload.error === "slow_down" ? 5 : 0),
    })
  }

  return NextResponse.json({ status: "failed", message: "GitHub auth was denied or expired." }, { status: 401 })
}

async function startAnthropicFlow(mode: "max" | "console"): Promise<Response> {
  const pkce = await createPkceChallenge()
  const host = mode === "console" ? "console.anthropic.com" : "claude.ai"
  const url = new URL(`https://${host}/oauth/authorize`)
  url.searchParams.set("code", "true")
  url.searchParams.set("client_id", ANTHROPIC_CLIENT_ID)
  url.searchParams.set("response_type", "code")
  url.searchParams.set("redirect_uri", ANTHROPIC_REDIRECT_URI)
  url.searchParams.set("scope", "org:create_api_key user:profile user:inference")
  url.searchParams.set("code_challenge", pkce.challenge)
  url.searchParams.set("code_challenge_method", "S256")
  url.searchParams.set("state", pkce.verifier)

  const sessionId = putAnthropicSession({
    providerId: "anthropic",
    mode,
    verifier: pkce.verifier,
  })

  return NextResponse.json({
    status: "ready",
    sessionId,
    method: "callback",
    authorizationUrl: url.toString(),
    instructions: "Open URL, authorize, then paste authorization code.",
  })
}

async function completeAnthropicFlow(sessionId: string, callbackInput: string): Promise<Response> {
  const session = getAnthropicSession(sessionId)
  if (!session) {
    return NextResponse.json({ status: "failed", message: "OAuth session not found or expired." }, { status: 404 })
  }

  const parsed = parseAnthropicCallbackInput(callbackInput)
  if (!parsed.code) {
    return NextResponse.json({ status: "failed", message: "Authorization code is required." }, { status: 400 })
  }

  const response = await fetch("https://console.anthropic.com/v1/oauth/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      code: parsed.code,
      state: parsed.state,
      grant_type: "authorization_code",
      client_id: ANTHROPIC_CLIENT_ID,
      redirect_uri: ANTHROPIC_REDIRECT_URI,
      code_verifier: session.verifier,
    }),
  })

  if (!response.ok) {
    return NextResponse.json({ status: "failed", message: "Anthropic token exchange failed." }, { status: 401 })
  }

  const tokens = (await response.json()) as {
    access_token: string
    refresh_token: string
    expires_in: number
  }

  deleteAnthropicSession(sessionId)

  if (session.mode === "console") {
    const apiKeyResponse = await fetch("https://api.anthropic.com/api/oauth/claude_cli/create_api_key", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        authorization: `Bearer ${tokens.access_token}`,
      },
    })

    if (apiKeyResponse.ok) {
      const keyPayload = (await apiKeyResponse.json()) as { raw_key?: string }
      if (typeof keyPayload.raw_key === "string" && keyPayload.raw_key.length > 0) {
        return NextResponse.json({
          status: "success",
          provider: "anthropic",
          auth: {
            type: "api",
            key: keyPayload.raw_key,
          },
        })
      }
    }
  }

  return NextResponse.json({
    status: "success",
    provider: "anthropic",
    auth: {
      type: "oauth",
      access: tokens.access_token,
      refresh: tokens.refresh_token,
      expires: Date.now() + tokens.expires_in * 1000,
    },
  })
}

export async function POST(request: Request, context: { params: Promise<{ providerId: string }> }): Promise<Response> {
  try {
    const { providerId } = await context.params
    const body = requestSchema.parse(await request.json())

    if (providerId === "openai") {
      if (body.action === "openai-browser-start") {
        return await startOpenAiBrowserFlow()
      }
      if (body.action === "openai-browser-complete" && body.sessionId && body.callbackInput) {
        return await completeOpenAiBrowserFlow(body.sessionId, body.callbackInput)
      }
      if (body.action === "openai-headless-start") {
        return await startOpenAiHeadlessFlow()
      }
      if (body.action === "openai-headless-poll" && body.sessionId) {
        return await pollOpenAiHeadlessFlow(body.sessionId)
      }
    }

    if (providerId === "github" || providerId === "github-copilot") {
      if (body.action === "copilot-start") {
        return await startCopilotFlow({
          deploymentType: body.deploymentType,
          enterpriseUrl: body.enterpriseUrl,
        })
      }
      if (body.action === "copilot-poll" && body.sessionId) {
        return await pollCopilotFlow(body.sessionId)
      }
    }

    if (providerId === "anthropic") {
      if (body.action === "anthropic-max-start") {
        return await startAnthropicFlow("max")
      }
      if (body.action === "anthropic-max-complete" && body.sessionId && body.callbackInput) {
        return await completeAnthropicFlow(body.sessionId, body.callbackInput)
      }
      if (body.action === "anthropic-console-start") {
        return await startAnthropicFlow("console")
      }
      if (body.action === "anthropic-console-complete" && body.sessionId && body.callbackInput) {
        return await completeAnthropicFlow(body.sessionId, body.callbackInput)
      }
    }

    return NextResponse.json({ status: "failed", message: "Unsupported provider action." }, { status: 400 })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid request"
    return NextResponse.json({ status: "failed", message }, { status: 400 })
  }
}
