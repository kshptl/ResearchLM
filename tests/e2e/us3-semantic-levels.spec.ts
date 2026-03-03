import { expect, test } from "@playwright/test"

test("semantic workflow supports auto and manual detail levels", async ({ page }) => {
  await page.goto("/")

  await expect(page.getByRole("button", { name: "Auto" })).toBeVisible()
  await expect(page.getByRole("button", { name: "Manual" })).toBeVisible()

  await page.getByRole("button", { name: "Manual" }).click()
  await page.getByRole("button", { name: "keywords" }).click()
  await expect(page.getByRole("button", { name: "keywords" })).toHaveAttribute("aria-pressed", "true")
  await expect(page.getByText("showing keywords")).toBeVisible()

  await page.getByRole("button", { name: "Auto" }).click()
  await page.getByRole("button", { name: "Zoom out" }).click()
  await page.getByRole("button", { name: "Zoom out" }).click()
  await page.getByRole("button", { name: "Zoom out" }).click()
  await page.getByRole("button", { name: "Zoom out" }).click()
  await expect(page.getByRole("textbox", { name: "Node content" }).first()).toHaveValue("moving, san, francisco")
})
