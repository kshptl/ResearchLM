import { expect, test } from "@playwright/test";
import {
  mockGeneration,
  openWorkspace,
  stabilizeVisualPage,
  submitLandingPrompt,
} from "./visual-test-helpers";

test.describe("US2 visual regression", () => {
  test("captures the node detail panel exploration workflow", async ({
    page,
  }) => {
    await mockGeneration(page, ["Detail panel response"]);
    await openWorkspace(page);

    await submitLandingPrompt(page, "Detail panel topic");
    const createdNode = page
      .locator(".react-flow__node")
      .filter({ hasText: "Detail panel topic" })
      .first();
    await createdNode.click();

    const detailPanel = page.getByRole("complementary", {
      name: "Node detail panel",
    });
    await expect(detailPanel).toBeVisible();
    await expect(
      detailPanel.getByRole("button", { name: "Questions" }),
    ).toBeVisible();
    await expect(
      detailPanel.getByRole("button", { name: "Subtopics" }),
    ).toBeVisible();
    await stabilizeVisualPage(page);
    await expect(detailPanel).toHaveScreenshot(
      "us2-vs005-node-detail-panel.png",
      {
        maxDiffPixels: 150,
      },
    );
  });
});
