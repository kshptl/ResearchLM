import { expect, test } from "@playwright/test"
import { openWorkspace, stabilizeVisualPage } from "./visual-test-helpers"

test.describe("US4 visual regression", () => {
  test("captures autosave startup state", async ({ page }) => {
    await openWorkspace(page)

    await expect(page.getByPlaceholder("Type a topic or question...")).toBeVisible()
    await stabilizeVisualPage(page)
    await expect(page).toHaveScreenshot("us4-vs009-vs010-persistence-conflict.png", { fullPage: true })
  })

  test("captures settings drawer state", async ({ page }) => {
    await openWorkspace(page)

    await page.getByRole("button", { name: "Open settings" }).click()
    await expect(page.getByRole("complementary", { name: "Settings" })).toBeVisible()
    await stabilizeVisualPage(page)
    await expect(page).toHaveScreenshot("us4-vs011-recovery-required.png", { fullPage: true })
  })
})
