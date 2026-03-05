import { expect, test } from "@playwright/test"

test("autosaved chat appears in resume list on next load", async ({ page }) => {
  await page.goto("/")
  await expect(page.getByRole("button", { name: "New Chat" })).toBeVisible()

  await page.getByRole("button", { name: "New Chat" }).dblclick()
  const titleInput = page.getByRole("textbox", { name: "Chat title" })
  await titleInput.fill("Playwright Resume Chat")
  await titleInput.press("Enter")
  await page.waitForTimeout(800)

  await expect(page.getByRole("button", { name: "Playwright Resume Chat" })).toBeVisible()
  await page.reload()

  await expect(page.getByRole("button", { name: "Playwright Resume Chat" })).toBeVisible()
})
