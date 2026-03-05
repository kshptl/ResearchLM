import { expect, test } from "@playwright/test";
import {
  mockGeneration,
  openWorkspace,
  stabilizeVisualPage,
  submitLandingPrompt,
} from "./visual-test-helpers";

test.describe("US4 visual regression", () => {
  test("captures the resume chooser after autosave", async ({ page }) => {
    await mockGeneration(page, ["Resume response"]);
    await openWorkspace(page);

    await submitLandingPrompt(page, "Resume visual topic");
    await expect(page.getByRole("article").first()).toContainText(
      "Resume response",
    );
    await page.waitForTimeout(800);
    await page.reload();
    await expect(page.getByText("Resume chat")).toBeVisible();
    await stabilizeVisualPage(page);
    await expect(page).toHaveScreenshot("us4-vs009-resume-chooser.png", {
      fullPage: true,
    });
  });

  test("captures settings drawer state", async ({ page }) => {
    await openWorkspace(page);

    await page.getByRole("button", { name: "Open settings" }).click();
    await expect(
      page.getByRole("complementary", { name: "Settings" }),
    ).toBeVisible();
    await stabilizeVisualPage(page);
    await expect(page).toHaveScreenshot("us4-vs011-settings-drawer.png", {
      fullPage: true,
    });
  });
});
