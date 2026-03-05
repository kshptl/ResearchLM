import { expect, test } from "@playwright/test"

const OPENAI_FIXTURE_MODELS = [
  { id: "gpt-5.3-codex", name: "GPT-5.3 Codex" },
  { id: "gpt-5.2", name: "GPT-5.2" },
]

const ANTHROPIC_FIXTURE_MODELS = [{ id: "claude-sonnet-4-5", name: "Claude Sonnet 4.5" }]

type ProviderModelsRequest = {
  providers?: Array<{
    providerId?: string
  }>
}

test("model picker lists models for active auth providers only", async ({ page }) => {
  let lastRequestedProviders: string[] = []
  const settingsPanelForm = () => page.getByLabel("Settings").locator("form").first()

  const pickProvider = async (optionName: string) => {
    const form = settingsPanelForm()
    const trigger = form.getByRole("combobox").first()
    await trigger.click()
    const listbox = page.getByRole("listbox").last()
    await listbox.getByRole("option", { name: optionName, exact: true }).click()
  }

  const pickAuthTab = async (label: string) => {
    const form = settingsPanelForm()
    await form.getByRole("tab", { name: label, exact: true }).click()
  }

  await page.route("**/api/providers/models", async (route) => {
    const payload = route.request().postDataJSON() as ProviderModelsRequest
    const requestedProviders = (payload.providers ?? [])
      .map((provider) => provider.providerId)
      .filter((providerId): providerId is string => typeof providerId === "string")

    lastRequestedProviders = requestedProviders

    const providers = requestedProviders.map((providerId) => {
      if (providerId === "openai") {
        return {
          providerId: "openai",
          providerName: "OpenAI",
          source: "live",
          models: OPENAI_FIXTURE_MODELS,
        }
      }
      if (providerId === "anthropic") {
        return {
          providerId: "anthropic",
          providerName: "Anthropic",
          source: "live",
          models: ANTHROPIC_FIXTURE_MODELS,
        }
      }

      return {
        providerId,
        providerName: providerId,
        source: "catalog-fallback",
        models: [],
      }
    })

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ providers }),
    })
  })

  await page.goto("/")
  await expect(page.getByText("What would you like to explore?")).toBeVisible()
  await expect(page.getByLabel("Model")).toHaveCount(0)

  await page.getByRole("button", { name: "Open settings" }).click()
  const credentialsForm = settingsPanelForm()
  await expect(credentialsForm).toBeVisible()

  await pickProvider("OpenAI")
  await pickAuthTab("API Key")
  await credentialsForm.getByPlaceholder("Enter API key").fill("sk-test-openai")
  await credentialsForm.getByRole("button", { name: "Save credential" }).click()

  await expect.poll(() => lastRequestedProviders.join(",")).toBe("openai")
  await page.getByRole("button", { name: "Close", exact: true }).click()
  const modelTrigger = page.getByRole("combobox", { name: "Model" })
  await expect(modelTrigger).toBeVisible()
  await modelTrigger.click()
  const openAiListbox = page.getByRole("listbox").last()
  const openAiOptions = openAiListbox.getByRole("option")
  await expect(openAiOptions).toHaveCount(OPENAI_FIXTURE_MODELS.length)
  await expect(openAiListbox.getByRole("option", { name: "OpenAI / GPT-5.3 Codex" })).toBeVisible()
  await expect(openAiListbox.getByRole("option", { name: "OpenAI / GPT-5.2" })).toBeVisible()
  await expect(openAiListbox.getByRole("option", { name: /Anthropic/i })).toHaveCount(0)
  await page.keyboard.press("Escape")

  await page.getByRole("button", { name: "Open settings" }).click()
  await expect(credentialsForm).toBeVisible()
  await pickProvider("Anthropic")
  await pickAuthTab("API Key")
  await credentialsForm.getByPlaceholder("Enter API key").fill("sk-ant")
  await credentialsForm.getByRole("button", { name: "Save credential" }).click()

  await expect.poll(() => lastRequestedProviders.includes("anthropic")).toBe(true)
  await page.getByRole("button", { name: "Close", exact: true }).click()
  await modelTrigger.click()
  const mergedListbox = page.getByRole("listbox").last()
  const mergedOptions = mergedListbox.getByRole("option")
  await expect(mergedOptions).toHaveCount(OPENAI_FIXTURE_MODELS.length + ANTHROPIC_FIXTURE_MODELS.length)
  await expect(mergedListbox.getByRole("option", { name: "Anthropic / Claude Sonnet 4.5" })).toHaveCount(1)
})

test("settings default model picker stays in sync with first-node model picker", async ({ page }) => {
  let lastRequestedProviders: string[] = []
  const settingsPanelForm = () => page.getByLabel("Settings").locator("form").first()

  const pickProvider = async (optionName: string) => {
    const form = settingsPanelForm()
    const trigger = form.getByRole("combobox").first()
    await trigger.click()
    const listbox = page.getByRole("listbox").last()
    await listbox.getByRole("option", { name: optionName, exact: true }).click()
  }

  const pickAuthTab = async (label: string) => {
    const form = settingsPanelForm()
    await form.getByRole("tab", { name: label, exact: true }).click()
  }

  await page.route("**/api/providers/models", async (route) => {
    const payload = route.request().postDataJSON() as ProviderModelsRequest
    const requestedProviders = (payload.providers ?? [])
      .map((provider) => provider.providerId)
      .filter((providerId): providerId is string => typeof providerId === "string")
    lastRequestedProviders = requestedProviders

    const providers = requestedProviders.map((providerId) => ({
      providerId,
      providerName: providerId === "openai" ? "OpenAI" : providerId,
      source: providerId === "openai" ? "live" : "catalog-fallback",
      models: providerId === "openai" ? OPENAI_FIXTURE_MODELS : [],
    }))

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ providers }),
    })
  })

  await page.goto("/")
  await page.getByRole("button", { name: "Open settings" }).click()

  const credentialsForm = settingsPanelForm()
  await pickProvider("OpenAI")
  await pickAuthTab("API Key")
  await credentialsForm.getByPlaceholder("Enter API key").fill("sk-test-openai")
  await credentialsForm.getByRole("button", { name: "Save credential" }).click()
  await expect.poll(() => lastRequestedProviders.join(",")).toBe("openai")

  const settingsDefaultModel = page.getByRole("combobox", { name: "Default model" })
  await expect(settingsDefaultModel).toBeVisible()
  await settingsDefaultModel.click()
  await page.getByRole("option", { name: "OpenAI / GPT-5.3 Codex", exact: true }).click()

  // Regression: picker must dismiss on outside click and not lock the app.
  await settingsDefaultModel.click()
  await page.mouse.click(8, 8)
  await expect(page.getByRole("listbox")).toHaveCount(0)
  await page.getByRole("button", { name: "Close", exact: true }).click()

  const firstNodeModel = page.getByRole("combobox", { name: "Model" })
  await expect(firstNodeModel).toContainText("OpenAI / GPT-5.3 Codex")

  await firstNodeModel.click()
  await page.getByRole("option", { name: "OpenAI / GPT-5.2", exact: true }).click()

  await page.getByRole("button", { name: "Open settings" }).click()
  await expect(page.getByRole("combobox", { name: "Default model" })).toHaveValue("OpenAI / GPT-5.2")
})
