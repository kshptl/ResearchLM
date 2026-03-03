import React from "react"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { ProviderCredentialsForm } from "@/components/workspace/provider-settings/provider-credentials-form"

describe("focus restoration", () => {
  it("restores focus to saved-credentials trigger after panel closure", async () => {
    render(
      <ProviderCredentialsForm
        onSave={() => undefined}
        credentials={[
          {
            id: "cred-1",
            provider: "openai",
            status: "active",
            updatedAt: new Date().toISOString()
          }
        ]}
      />
    )

    const trigger = screen.getByRole("button", { name: "Hide saved credentials" })
    trigger.focus()

    fireEvent.click(screen.getByRole("button", { name: "Close panel" }))

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Manage saved credentials" })).toHaveFocus()
    })
  })
})
