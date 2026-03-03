import { expect, test } from "@playwright/test"

test("multilevel hierarchy workflow adds and navigates canvases", async ({ page }) => {
  await page.goto("/")
  await expect(page.getByText("Hierarchy")).toBeVisible()

  const hierarchyButtons = page
    .getByRole("button")
    .filter({ has: page.locator("span.font-medium") })
  const initialCount = await hierarchyButtons.count()

  await page.getByRole("button", { name: "Subtopic", exact: true }).click()
  await expect(hierarchyButtons).toHaveCount(initialCount + 1)

  await page.getByRole("button", { name: "Broad topic", exact: true }).click()
  await expect(hierarchyButtons).toHaveCount(initialCount + 2)

  const rootTopicButton = hierarchyButtons.filter({ hasText: "Root Topic" }).first()
  await rootTopicButton.click()
  await expect(rootTopicButton).toHaveAttribute("aria-current", "page")
})
