import { expect, test } from "@playwright/test"

test("keyboard flow keeps workspace interactive", async ({ page }) => {
  await page.goto("/")
  await expect(page.getByText("Sensecape Exploration Workspace")).toBeVisible()

  await page.keyboard.press("Tab")
  await page.keyboard.press("1")

  await expect(page.getByRole("button", { name: "Prompt" })).toBeVisible()
})
