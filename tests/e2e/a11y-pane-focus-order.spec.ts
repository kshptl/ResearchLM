import { expect, test } from "@playwright/test";

test("settings panel keeps keyboard focus on current interactive controls", async ({
  page,
}) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Open settings" }).click();
  await expect(
    page.getByRole("complementary", { name: "Settings" }),
  ).toBeVisible();

  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("button", { name: "Close", exact: true }),
  ).toBeFocused();

  await page.keyboard.press("Tab");
  await expect(page.getByRole("combobox").first()).toBeFocused();
});
