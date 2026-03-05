import { expect, test } from "@playwright/test"

test("theme toggle beside settings switches dark/light mode", async ({ page }) => {
  await page.goto("/")

  const toggle = page.getByRole("button", { name: "Toggle theme" })
  await expect(toggle).toBeVisible()

  const before = await page.evaluate(() => document.documentElement.classList.contains("dark"))
  await toggle.click()
  await expect.poll(async () => {
    return page.evaluate(() => document.documentElement.classList.contains("dark"))
  }).not.toBe(before)

  const afterFirst = await page.evaluate(() => document.documentElement.classList.contains("dark"))
  await toggle.click()
  await expect.poll(async () => {
    return page.evaluate(() => document.documentElement.classList.contains("dark"))
  }).not.toBe(afterFirst)
})
