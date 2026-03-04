import { expect, test } from "@playwright/test"

test("user can open workspace and see generation actions", async ({ page }) => {
  await page.goto("/")
  await expect(page.getByText("Researchlm Exploration Workspace")).toBeVisible()
  await expect(page.getByRole("button", { name: "Prompt" })).toBeVisible()
})
