import { expect, test } from "@playwright/test";

test("response follow-up creates a new node with a visible context block", async ({
  page,
}) => {
  await page.route("**/api/llm/stream", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "text/event-stream",
      body: `event: delta\ndata: ${JSON.stringify({ text: "Follow-up source response" })}\n\n`,
    });
  });

  await page.goto("/");

  const promptInput = page.getByPlaceholder("Type a topic or question...");
  await promptInput.fill("Follow-up root");
  await promptInput.press("Enter");

  const createdNode = page
    .locator(".react-flow__node")
    .filter({ hasText: "Follow-up root" })
    .first();
  await expect(createdNode).toBeVisible();
  await createdNode.click();

  const responseParagraph = page
    .locator('[data-testid="node-response-markdown"] p')
    .first();
  await expect(responseParagraph).toContainText("Follow-up source response");
  await responseParagraph.evaluate((element) => {
    const textNode = element.firstChild;
    if (!textNode || textNode.nodeType !== Node.TEXT_NODE) {
      throw new Error("Missing response text node");
    }

    const range = document.createRange();
    range.setStart(textNode, 0);
    range.setEnd(textNode, Math.min(8, textNode.textContent?.length ?? 0));
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  });

  const responseContainer = page.getByTestId("node-response-markdown");
  await responseContainer.click({
    button: "right",
    position: { x: 24, y: 24 },
  });
  const followUpMenu = page.locator('[data-response-followup-menu="true"]');
  await expect(followUpMenu).toBeVisible();
  await followUpMenu
    .getByRole("button", { name: "Follow up", exact: true })
    .click();

  const promptEditor = page.getByLabel("Node prompt editor");
  await expect(promptEditor).toBeFocused();
  await expect(page.getByTestId("node-inline-context-blocks")).toContainText(
    "Context",
  );
  await expect(page.locator(".react-flow__node")).toHaveCount(2);
});
