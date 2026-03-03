import { expect, test } from "@playwright/test"

test("recovery-required fallback guides reset/import flow", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("sensecape:workspaceStateCorrupt", "1")
  })

  await page.goto("/")
  await expect(page.getByText("Recovery required")).toBeVisible()
  await expect(page.getByRole("button", { name: "Reset workspace state" })).toBeVisible()
  await expect(page.getByRole("button", { name: "Try backup import" })).toBeVisible()

  await page.getByRole("button", { name: "Reset workspace state" }).click()
  await expect(page.getByText("Recovery required")).toHaveCount(0)
})
