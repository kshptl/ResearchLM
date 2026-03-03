import { expect, test } from "@playwright/test"

test("resume, backup, and conflict flow remains actionable", async ({ page }) => {
  await page.goto("/")
  await expect(page.getByText("Local persistence ready")).toBeVisible()

  await page.getByRole("button", { name: "Snapshot now" }).click()
  await page.getByRole("button", { name: "Export backup" }).click()
  await page.getByRole("button", { name: "Import backup" }).click()

  await page.getByRole("button", { name: "Simulate conflict" }).click()
  await expect(page.getByText(/Conflict detected for/i)).toBeVisible()
  await expect(page.getByRole("button", { name: "Retry sync" })).toBeVisible()
  await expect(page.getByRole("button", { name: "Open recovery options" })).toBeVisible()
  await page.getByRole("button", { name: "Dismiss notice" }).click()
  await expect(page.getByText(/Conflict detected for/i)).toHaveCount(0)
})
