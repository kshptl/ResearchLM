import { expect, test } from "@playwright/test";
import {
  mockGeneration,
  openWorkspace,
  stabilizeVisualPage,
  submitLandingPrompt,
} from "./visual-test-helpers";

test.describe("US1 visual regression", () => {
  test("captures default workspace and first generated node states", async ({
    page,
  }) => {
    await mockGeneration(page, ["Visual root response"]);
    await openWorkspace(page);

    await expect(page.getByRole("button", { name: "New Chat" })).toBeVisible();
    await expect(
      page.getByText("What would you like to explore?"),
    ).toBeVisible();
    await expect(page).toHaveScreenshot("us1-vs001-default-workspace.png", {
      fullPage: true,
      maxDiffPixels: 400,
    });

    await submitLandingPrompt(page, "Visual root topic");
    await expect(page.getByRole("article").first()).toContainText(
      "Visual root response",
    );
    await stabilizeVisualPage(page);
    await expect(page).toHaveScreenshot("us1-vs004-generated-root-node.png", {
      fullPage: true,
      maxDiffPixels: 400,
    });
  });
});
