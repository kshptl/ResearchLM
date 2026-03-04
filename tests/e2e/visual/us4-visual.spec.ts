import { expect, test } from "@playwright/test"
import { openWorkspace, stabilizeVisualPage } from "./visual-test-helpers"

test.describe("US4 visual regression", () => {
  test("captures persistence and conflict notice states", async ({ page }) => {
    await openWorkspace(page)

    await page.getByRole("button", { name: "Snapshot now" }).click()
    await page.getByRole("button", { name: "Simulate conflict" }).click()
    await expect(page.getByText(/Conflict detected for/i)).toBeVisible()
    await stabilizeVisualPage(page)
    await expect(page).toHaveScreenshot("us4-vs009-vs010-persistence-conflict.png", { fullPage: true })
  })

  test("captures recovery-required fallback state", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("researchlm:workspaceStateCorrupt", "1")
    })
    await openWorkspace(page)

    await expect(page.getByText("Recovery required")).toBeVisible()
    await stabilizeVisualPage(page)
    await expect(page).toHaveScreenshot("us4-vs011-recovery-required.png", { fullPage: true })
  })
})
