"use client"

import React, { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList } from "@/components/ui/combobox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { credentialPrimarySecret, type ProviderAuthCredential } from "@/lib/auth/auth-types"
import { getCredentialAuth } from "@/lib/auth/credential-store"
import { getProviderAuthMethods, type ProviderAuthMethod } from "@/lib/auth/method-registry"

type CredentialSummary = {
  id: string
  provider: string
  status: "active" | "invalid" | "revoked"
  updatedAt: string
  authType?: string
  authPayload?: ProviderAuthCredential
}

type ProviderOption = {
  id: string
  name: string
}

type SavePayload = {
  provider: string
  type: "api-key" | "oauth" | "aws-profile"
  credential: string
  authPayload?: ProviderAuthCredential
}

type Props = {
  onSave: (value: SavePayload) => void
  onRevoke?: (credentialId: string) => void
  credentials?: CredentialSummary[]
}

type OAuthState = {
  sessionId: string
  method: ProviderAuthMethod
  verificationUrl?: string
  userCode?: string
  callbackInput?: string
  intervalSeconds?: number
  message?: string
}

const FALLBACK_PROVIDERS: ProviderOption[] = [
  { id: "openai", name: "OpenAI" },
  { id: "anthropic", name: "Anthropic" },
  { id: "google", name: "Google" },
  { id: "openrouter", name: "OpenRouter" },
  { id: "github", name: "GitHub" },
  { id: "amazon-bedrock", name: "Amazon Bedrock" },
]

function normalizeProviderOption(input: { id: string; name: string }): ProviderOption {
  if (input.id === "github-models" || input.id === "github-copilot") {
    return { id: "github", name: "GitHub" }
  }
  return input
}

function mapMethodToLegacyType(method: ProviderAuthMethod): "api-key" | "oauth" | "aws-profile" {
  if (method.type === "oauth") {
    return "oauth"
  }
  if (method.type === "aws-profile") {
    return "aws-profile"
  }
  return "api-key"
}

function mapAuthToLegacyCredential(auth: ProviderAuthCredential): string {
  switch (auth.type) {
    case "api":
      return auth.key
    case "oauth":
      return auth.refresh || auth.access
    case "aws-profile":
      return auth.profile
    case "wellknown":
      return auth.token
    case "aws-env-chain":
      return auth.region ?? "aws-env-chain"
    default:
      return ""
  }
}

function compactMethodLabel(providerId: string, method: ProviderAuthMethod): string {
  if (method.type === "oauth") {
    if (providerId === "openai") {
      return "ChatGPT OAuth"
    }
    if (providerId === "anthropic") {
      return "Claude OAuth"
    }
    if (providerId === "github") {
      return "Copilot OAuth"
    }
    return "OAuth"
  }

  if (method.type === "aws-profile") {
    return "AWS Profile"
  }

  if (method.type === "aws-env-chain") {
    return "Env Chain"
  }

  return "API Key"
}

function authMethodLabel(authType?: string, authPayload?: ProviderAuthCredential): string {
  const resolvedType = authPayload?.type ?? authType

  switch (resolvedType) {
    case "api":
    case "api-key":
      return "API Key"
    case "oauth":
      return "OAuth"
    case "aws-profile":
      return "AWS Profile"
    case "aws-env-chain":
      return "AWS Env Chain"
    case "wellknown":
      return "Token"
    default:
      return "Unknown"
  }
}

function maskSecret(secret: string): string {
  const trimmed = secret.trim()
  if (!trimmed) {
    return "—"
  }

  if (trimmed.length <= 8) {
    return "••••"
  }

  return `${trimmed.slice(0, 4)}…${trimmed.slice(-4)}`
}

function resolveCredentialSecret(credential: CredentialSummary): string {
  const auth = credential.authPayload ?? getCredentialAuth(credential.id)
  if (!auth) {
    return "—"
  }

  return maskSecret(credentialPrimarySecret(auth))
}

export function ProviderCredentialsForm({ onSave, onRevoke, credentials = [] }: Props) {
  const [providerOptions, setProviderOptions] = useState<ProviderOption[]>(FALLBACK_PROVIDERS)
  const [provider, setProvider] = useState(FALLBACK_PROVIDERS[0]?.id ?? "openai")
  const [selectedMethodId, setSelectedMethodId] = useState<string>("")
  const [credential, setCredential] = useState("")
  const [oauthState, setOauthState] = useState<OAuthState | null>(null)
  const [oauthInput, setOauthInput] = useState("")
  const [copilotDeploymentType, setCopilotDeploymentType] = useState<"github.com" | "enterprise">("github.com")
  const [copilotEnterpriseUrl, setCopilotEnterpriseUrl] = useState("")

  useEffect(() => {
    if (typeof fetch !== "function") {
      return
    }

    let cancelled = false
    void fetch("/api/providers/catalog")
      .then(async (response) => {
        if (!response.ok) {
          return
        }
        const body = (await response.json()) as { providers?: Array<{ id: string; name: string }> }
        if (!body.providers || body.providers.length === 0 || cancelled) {
          return
        }
        setProviderOptions(
          Array.from(
            body.providers.reduce<Map<string, ProviderOption>>((accumulator, entry) => {
              const normalized = normalizeProviderOption({ id: entry.id, name: entry.name })
              if (!accumulator.has(normalized.id)) {
                accumulator.set(normalized.id, normalized)
              }
              return accumulator
            }, new Map()).values(),
          ),
        )
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [])

  const providerMethods = useMemo(() => getProviderAuthMethods(provider), [provider])
  const visibleMethods = useMemo(() => {
    const byType = new Map<ProviderAuthMethod["type"], ProviderAuthMethod>()
    for (const method of providerMethods) {
      if (!byType.has(method.type)) {
        byType.set(method.type, method)
      }
    }
    return Array.from(byType.values())
  }, [providerMethods])
  const selectedMethod = useMemo(
    () => visibleMethods.find((method) => method.id === selectedMethodId) ?? visibleMethods[0],
    [visibleMethods, selectedMethodId],
  )
  const selectedProviderOption = useMemo(
    () => providerOptions.find((option) => option.id === provider) ?? null,
    [provider, providerOptions],
  )
  const providerNameById = useMemo(
    () =>
      new Map(
        providerOptions.map((option) => [option.id, option.name] as const),
      ),
    [providerOptions],
  )
  const visibleCredentials = useMemo(
    () => credentials.filter((item) => item.status !== "revoked"),
    [credentials],
  )

  useEffect(() => {
    setSelectedMethodId(visibleMethods[0]?.id ?? "")
    setOauthState(null)
    setOauthInput("")
    setCredential("")
  }, [provider, visibleMethods])

  useEffect(() => {
    setCredential("")
    setOauthInput("")
    if (oauthState && oauthState.method.id !== selectedMethodId) {
      setOauthState(null)
    }
  }, [selectedMethodId, oauthState])

  async function startOauthFlow(method: ProviderAuthMethod): Promise<void> {
    if (!method.oauthFlow) {
      return
    }

    const body: Record<string, string> = {
      action: method.oauthFlow.startAction,
    }

    if (provider === "github") {
      body.deploymentType = copilotDeploymentType
      if (copilotDeploymentType === "enterprise") {
        body.enterpriseUrl = copilotEnterpriseUrl
      }
    }

    const response = await fetch(`/api/auth/providers/${provider}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })

    const payload = (await response.json()) as {
      status: "pending" | "ready" | "failed"
      message?: string
      sessionId?: string
      verificationUrl?: string
      authorizationUrl?: string
      userCode?: string
      intervalSeconds?: number
    }

    if (payload.status === "failed" || !payload.sessionId) {
      setOauthState({
        sessionId: "",
        method,
        message: payload.message ?? "Unable to start OAuth flow.",
      })
      return
    }

    setOauthState({
      sessionId: payload.sessionId,
      method,
      verificationUrl: payload.authorizationUrl ?? payload.verificationUrl,
      userCode: payload.userCode,
      intervalSeconds: payload.intervalSeconds,
      message: payload.message,
    })
  }

  async function completeOauthFlow(): Promise<void> {
    if (!oauthState?.method.oauthFlow?.completeAction || !oauthState.sessionId) {
      return
    }

    const response = await fetch(`/api/auth/providers/${provider}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: oauthState.method.oauthFlow.completeAction,
        sessionId: oauthState.sessionId,
        callbackInput: oauthInput,
      }),
    })

    const payload = (await response.json()) as {
      status: "success" | "failed"
      message?: string
      provider?: string
      auth?: ProviderAuthCredential
    }

    if (payload.status !== "success" || !payload.auth) {
      setOauthState((current) => (current ? { ...current, message: payload.message ?? "OAuth authorization failed." } : current))
      return
    }

    const resolvedProvider = payload.provider ?? provider
    onSave({
      provider: resolvedProvider,
      type: mapMethodToLegacyType(oauthState.method),
      credential: mapAuthToLegacyCredential(payload.auth),
      authPayload: payload.auth,
    })
    setOauthState(null)
    setOauthInput("")
  }

  async function pollOauthFlow(): Promise<void> {
    if (!oauthState?.method.oauthFlow?.pollAction || !oauthState.sessionId) {
      return
    }

    const response = await fetch(`/api/auth/providers/${provider}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: oauthState.method.oauthFlow.pollAction,
        sessionId: oauthState.sessionId,
      }),
    })

    const payload = (await response.json()) as {
      status: "success" | "pending" | "failed"
      message?: string
      intervalSeconds?: number
      provider?: string
      auth?: ProviderAuthCredential
    }

    if (payload.status === "success" && payload.auth) {
      const resolvedProvider = payload.provider ?? provider
      onSave({
        provider: resolvedProvider,
        type: mapMethodToLegacyType(oauthState.method),
        credential: mapAuthToLegacyCredential(payload.auth),
        authPayload: payload.auth,
      })
      setOauthState(null)
      setOauthInput("")
      return
    }

    setOauthState((current) =>
      current
        ? {
            ...current,
            intervalSeconds: payload.intervalSeconds ?? current.intervalSeconds,
            message: payload.message,
          }
        : current,
    )
  }

  function saveManualCredential(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault()

    if (!selectedMethod) {
      return
    }
    if (selectedMethod.type === "oauth") {
      return
    }

    if (selectedMethod.type === "aws-env-chain") {
      onSave({
        provider,
        type: "aws-profile",
        credential: "aws-env-chain",
        authPayload: {
          type: "aws-env-chain",
        },
      })
      setCredential("")
      return
    }

    if (!credential.trim()) {
      return
    }

    const payload: ProviderAuthCredential =
      selectedMethod.type === "aws-profile"
        ? { type: "aws-profile", profile: credential.trim() }
        : { type: "api", key: credential.trim() }

    onSave({
      provider,
      type: mapMethodToLegacyType(selectedMethod),
      credential: credential.trim(),
      authPayload: payload,
    })
    setCredential("")
  }

  return (
    <form onSubmit={saveManualCredential} className="text-xs">
      <Card className="gap-0 border-border py-0">
        <CardContent className="space-y-2.5 px-2.5 py-2.5">
          <div className="space-y-1">
            <Label className="text-[11px] font-semibold text-muted-foreground">Provider</Label>
            <Combobox
              value={selectedProviderOption}
              onValueChange={(value) => {
                if (!value) {
                  return
                }
                setProvider(value.id)
              }}
              items={providerOptions}
              autoHighlight
              itemToStringLabel={(value) => value.name}
              itemToStringValue={(value) => value.id}
            >
              <ComboboxInput
                className="h-8 w-full [&_[data-slot=input]]:h-8 [&_[data-slot=input]]:text-xs"
                placeholder="Select a provider"
              />
              <ComboboxContent>
                <ComboboxEmpty>No provider found.</ComboboxEmpty>
                <ComboboxList>
                  {(option: ProviderOption) => (
                    <ComboboxItem key={option.id} value={option}>
                      {option.name}
                    </ComboboxItem>
                  )}
                </ComboboxList>
              </ComboboxContent>
            </Combobox>
          </div>

          {visibleMethods.length > 0 ? (
            <div className="space-y-2">
              <Label className="text-[11px] font-semibold text-muted-foreground">Connect With</Label>
              <Tabs value={selectedMethod?.id} onValueChange={setSelectedMethodId} className="w-full">
                <TabsList className="h-8 w-full justify-start p-1">
                  {visibleMethods.map((method) => (
                    <TabsTrigger key={method.id} value={method.id} className="text-xs">
                      {compactMethodLabel(provider, method)}
                    </TabsTrigger>
                  ))}
                </TabsList>
                {visibleMethods.map((method) => {
                  const methodState = oauthState?.method.id === method.id ? oauthState : null
                  return (
                    <TabsContent key={method.id} value={method.id} className="mt-1.5 space-y-1.5 rounded-md border border-border p-2">
                      {provider === "github" && method.id === "github-copilot-oauth" ? (
                        <div className="space-y-1">
                          <Label className="text-[11px] font-semibold text-muted-foreground">GitHub deployment</Label>
                          <Select value={copilotDeploymentType} onValueChange={(value) => setCopilotDeploymentType(value as "github.com" | "enterprise")}>
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="github.com">GitHub.com</SelectItem>
                              <SelectItem value="enterprise">GitHub Enterprise</SelectItem>
                            </SelectContent>
                          </Select>
                          {copilotDeploymentType === "enterprise" ? (
                            <Input
                              type="text"
                              value={copilotEnterpriseUrl}
                              onChange={(event) => setCopilotEnterpriseUrl(event.target.value)}
                              className="h-8 text-xs"
                              placeholder="company.ghe.com"
                            />
                          ) : null}
                        </div>
                      ) : null}

                      {method.type === "oauth" ? (
                        <>
                          <Button type="button" variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={() => void startOauthFlow(method)}>
                            Start OAuth
                          </Button>
                          {methodState?.verificationUrl ? (
                            <p className="break-all text-[11px] text-foreground">
                              Open:{" "}
                              <a className="text-primary underline" href={methodState.verificationUrl} target="_blank" rel="noreferrer">
                                {methodState.verificationUrl}
                              </a>
                            </p>
                          ) : null}
                          {methodState?.userCode ? <p className="text-[11px] text-foreground">Code: {methodState.userCode}</p> : null}
                          {method.oauthFlow?.completeAction ? (
                            <div className="space-y-1">
                              <Input
                                type="text"
                                value={oauthInput}
                                onChange={(event) => setOauthInput(event.target.value)}
                                className="h-8 text-xs"
                                placeholder={method.oauthFlow.callbackInputLabel ?? "Authorization code"}
                              />
                              <Button type="button" variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={() => void completeOauthFlow()}>
                                Complete OAuth
                              </Button>
                            </div>
                          ) : null}
                          {method.oauthFlow?.pollAction ? (
                            <Button type="button" variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={() => void pollOauthFlow()}>
                              Poll Authorization
                            </Button>
                          ) : null}
                          {methodState?.message ? <p className="text-[11px] text-destructive">{methodState.message}</p> : null}
                        </>
                      ) : (
                        <>
                          {method.type !== "aws-env-chain" ? (
                            <Input
                              type="password"
                              value={credential}
                              onChange={(event) => setCredential(event.target.value)}
                              className="h-8 text-xs"
                              placeholder={method.placeholder ?? "Enter credential"}
                            />
                          ) : (
                            <p className="text-[11px] text-muted-foreground">Uses AWS environment variables, IAM role, or metadata chain.</p>
                          )}
                          <Button type="submit" variant="outline" size="sm" className="h-7 px-2 text-xs">
                            Save credential
                          </Button>
                        </>
                      )}
                    </TabsContent>
                  )
                })}
              </Tabs>
            </div>
          ) : null}

          <Separator />

          <section className="space-y-1.5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Saved Providers</p>
            {visibleCredentials.length > 0 ? (
              <Table className="text-xs">
                <TableHeader>
                  <TableRow>
                    <TableHead className="h-8 px-2 text-[11px] font-semibold text-muted-foreground">Provider</TableHead>
                    <TableHead className="h-8 px-2 text-[11px] font-semibold text-muted-foreground">Auth Method</TableHead>
                    <TableHead className="h-8 px-2 text-[11px] font-semibold text-muted-foreground">Key</TableHead>
                    <TableHead className="h-8 w-20 px-2 text-[11px] font-semibold text-muted-foreground">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleCredentials.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="py-1.5 text-xs">{providerNameById.get(item.provider) ?? item.provider}</TableCell>
                      <TableCell className="py-1.5 text-xs">
                        {authMethodLabel(item.authType, item.authPayload ?? getCredentialAuth(item.id))}
                      </TableCell>
                      <TableCell className="py-1.5 font-mono text-[11px]">{resolveCredentialSecret(item)}</TableCell>
                      <TableCell className="py-1.5">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={() => onRevoke?.(item.id)}
                          disabled={!onRevoke}
                        >
                          Revoke
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-xs text-muted-foreground">No saved providers yet.</p>
            )}
          </section>
        </CardContent>
      </Card>
    </form>
  )
}
