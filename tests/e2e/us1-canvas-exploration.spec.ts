import { expect, test } from "@playwright/test";

test("workspace landing view shows prompt entry and primary chrome", async ({
  page,
}) => {
  await page.goto("/");

  await expect(page.getByRole("button", { name: "New Chat" })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Toggle theme" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Open settings" }),
  ).toBeVisible();
  await expect(page.getByText("What would you like to explore?")).toBeVisible();
  await expect(
    page.getByPlaceholder("Type a topic or question..."),
  ).toBeVisible();
});
