"use client"

import React, { useState } from "react"

type CredentialSummary = {
  id: string
  provider: string
  status: "active" | "invalid" | "revoked"
  updatedAt: string
}

type Props = {
  onSave: (value: { provider: string; type: "api-key" | "oauth" | "aws-profile"; credential: string }) => void
  onReplace?: (value: { credentialId: string; credential: string }) => void
  onRevoke?: (credentialId: string) => void
  credentials?: CredentialSummary[]
}

export function ProviderCredentialsForm({ onSave, onReplace, onRevoke, credentials = [] }: Props) {
  const [provider, setProvider] = useState("openai")
  const [type, setType] = useState<"api-key" | "oauth" | "aws-profile">("api-key")
  const [credential, setCredential] = useState("")
  const [replacementCredential, setReplacementCredential] = useState("")
  const [selectedCredentialId, setSelectedCredentialId] = useState<string>("")
  const [showSavedCredentials, setShowSavedCredentials] = useState(true)
  const savedCredentialsTriggerRef = React.useRef<HTMLButtonElement>(null)

  return (
    <form
      className="space-y-2 rounded-md border border-[hsl(var(--border))] p-3"
      onSubmit={(event) => {
        event.preventDefault()
        onSave({ provider, type, credential })
      }}
    >
      <p className="text-xs font-semibold">Provider Credentials (BYOK)</p>
      <select value={provider} onChange={(event) => setProvider(event.target.value)} className="w-full rounded border p-1 text-xs">
        <option value="openai">OpenAI</option>
        <option value="anthropic">Anthropic</option>
        <option value="gemini">Gemini</option>
        <option value="openrouter">OpenRouter</option>
        <option value="github-models">GitHub Models</option>
        <option value="bedrock">Amazon Bedrock</option>
      </select>
      <select
        value={type}
        onChange={(event) => setType(event.target.value as "api-key" | "oauth" | "aws-profile")}
        className="w-full rounded border p-1 text-xs"
      >
        <option value="api-key">API key</option>
        <option value="oauth">OAuth token</option>
        <option value="aws-profile">AWS profile</option>
      </select>
      <input
        type="password"
        value={credential}
        onChange={(event) => setCredential(event.target.value)}
        className="w-full rounded border p-1 text-xs"
        placeholder="Enter provider credential"
      />
      <button type="submit" className="rounded border px-2 py-1 text-xs">
        Save credential
      </button>

      {credentials.length > 0 ? (
        <section className="space-y-2 rounded border border-[hsl(var(--border))] p-2">
          <button
            ref={savedCredentialsTriggerRef}
            type="button"
            className="rounded border px-2 py-1 text-xs"
            onClick={() => setShowSavedCredentials((current) => !current)}
          >
            {showSavedCredentials ? "Hide saved credentials" : "Manage saved credentials"}
          </button>

          {showSavedCredentials ? (
            <div className="space-y-2" role="region" aria-label="Saved credentials panel">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-600">Saved credentials</p>
              <ul className="space-y-1">
                {credentials.map((item) => (
                  <li key={item.id} className="flex items-center justify-between gap-2 rounded bg-slate-50 px-2 py-1 text-xs">
                    <span>
                      {item.provider} ({item.status})
                    </span>
                    <button
                      type="button"
                      className="rounded border px-2 py-0.5"
                      onClick={() => setSelectedCredentialId(item.id)}
                    >
                      Select
                    </button>
                  </li>
                ))}
              </ul>

              <input
                type="password"
                value={replacementCredential}
                onChange={(event) => setReplacementCredential(event.target.value)}
                className="w-full rounded border p-1 text-xs"
                placeholder="Replacement credential value"
              />

              <div className="flex gap-2">
                <button
                  type="button"
                  className="rounded border px-2 py-1 text-xs"
                  disabled={!selectedCredentialId || !replacementCredential}
                  onClick={() => {
                    if (!selectedCredentialId || !replacementCredential || !onReplace) {
                      return
                    }
                    onReplace({ credentialId: selectedCredentialId, credential: replacementCredential })
                    setReplacementCredential("")
                  }}
                >
                  Replace selected
                </button>
                <button
                  type="button"
                  className="rounded border px-2 py-1 text-xs"
                  disabled={!selectedCredentialId}
                  onClick={() => {
                    if (!selectedCredentialId || !onRevoke) {
                      return
                    }
                    onRevoke(selectedCredentialId)
                  }}
                >
                  Revoke selected
                </button>
                <button
                  type="button"
                  className="rounded border px-2 py-1 text-xs"
                  onClick={() => {
                    setShowSavedCredentials(false)
                    requestAnimationFrame(() => {
                      savedCredentialsTriggerRef.current?.focus()
                    })
                  }}
                >
                  Close panel
                </button>
              </div>
            </div>
          ) : null}
        </section>
      ) : null}
    </form>
  )
}
