import { expect, test } from "@playwright/test"

test("tab focus order remains deterministic across panes", async ({ page }) => {
  await page.goto("/")

  await page.keyboard.press("Tab")
  await expect(page.getByRole("button", { name: "Broad topic", exact: true })).toBeFocused()

  await page.keyboard.press("Tab")
  await expect(page.getByRole("button", { name: "Subtopic", exact: true })).toBeFocused()

  await page.keyboard.press("Tab")
  await expect(page.getByRole("button", { name: "Sibling", exact: true })).toBeFocused()

  await page.keyboard.press("Tab")
  await expect(page.getByRole("button", { name: "select", exact: true })).toBeFocused()
})
