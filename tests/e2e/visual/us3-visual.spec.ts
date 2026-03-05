import { expect, test } from "@playwright/test";
import {
  mockGeneration,
  openWorkspace,
  selectResponseExcerpt,
  stabilizeVisualPage,
  submitLandingPrompt,
} from "./visual-test-helpers";

test.describe("US3 visual regression", () => {
  test("captures the follow-up context block workflow", async ({ page }) => {
    await mockGeneration(page, ["Quoted context response"]);
    await openWorkspace(page);

    await submitLandingPrompt(page, "Context root topic");
    const createdNode = page
      .locator(".react-flow__node")
      .filter({ hasText: "Context root topic" })
      .first();
    await createdNode.click();

    await selectResponseExcerpt(page);
    await page
      .getByTestId("node-response-markdown")
      .click({ button: "right", position: { x: 24, y: 24 } });
    const followUpMenu = page.locator('[data-response-followup-menu="true"]');
    await expect(followUpMenu).toBeVisible();
    await followUpMenu
      .getByRole("button", { name: "Follow up", exact: true })
      .click();

    await expect(page.getByLabel("Node prompt editor")).toBeFocused();
    const inlineContextBlocks = page.getByTestId("node-inline-context-blocks");
    await expect(inlineContextBlocks).toContainText("Context");
    await stabilizeVisualPage(page);
    await inlineContextBlocks.evaluate((element) => {
      element
        .closest(".react-flow__node")
        ?.setAttribute("data-visual-target", "true");
    });
    await page.addStyleTag({
      content:
        ".react-flow__node:not([data-visual-target='true']),.react-flow__edge,.react-flow__handle,.react-flow__controls,.react-flow__minimap{visibility:hidden !important;}",
    });
    await expect(inlineContextBlocks).toHaveScreenshot(
      "us3-vs008-follow-up-context.png",
      {
        maxDiffPixels: 1000,
      },
    );
  });
});
