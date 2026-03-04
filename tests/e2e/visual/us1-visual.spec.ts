import { expect, test } from "@playwright/test"
import { openWorkspace, stabilizeVisualPage } from "./visual-test-helpers"

test.describe("US1 visual regression", () => {
  test("captures default workspace and generation failure notice states", async ({ page }) => {
    await openWorkspace(page)

    await expect(page.getByText("Researchlm Exploration Workspace")).toBeVisible()
    await expect(page).toHaveScreenshot("us1-vs001-default-workspace.png", { fullPage: true })

    await page.getByRole("button", { name: "Prompt" }).click()
    await expect(page.getByRole("status")).toBeVisible()
    await stabilizeVisualPage(page)
    await expect(page).toHaveScreenshot("us1-vs004-generation-failure-notice.png", { fullPage: true })
  })
})
