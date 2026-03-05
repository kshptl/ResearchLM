import React from "react"
import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { ProviderCredentialsForm } from "@/components/workspace/provider-settings/provider-credentials-form"

describe("provider credentials table", () => {
  it("renders saved providers and supports revoke action", () => {
    const revoke = vi.fn()
    render(
      <ProviderCredentialsForm
        onSave={() => undefined}
        onRevoke={revoke}
        credentials={[
          {
            id: "cred-1",
            provider: "openai",
            status: "active",
            authType: "api-key",
            updatedAt: new Date().toISOString()
          }
        ]}
      />
    )

    expect(screen.getByText("Saved Providers")).toBeInTheDocument()
    expect(screen.getByRole("cell", { name: "OpenAI" })).toBeInTheDocument()
    expect(screen.getByRole("cell", { name: "API Key" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Revoke" })).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Revoke" }))

    expect(revoke).toHaveBeenCalledWith("cred-1")
  })
})
