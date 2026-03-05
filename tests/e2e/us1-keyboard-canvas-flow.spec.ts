import { expect, test } from "@playwright/test";

test("keyboard submit from the landing prompt creates the first node", async ({
  page,
}) => {
  await page.route("**/api/llm/stream", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "text/event-stream",
      body: `event: delta\ndata: ${JSON.stringify({ text: "Keyboard response" })}\n\n`,
    });
  });

  await page.goto("/");

  const promptInput = page.getByPlaceholder("Type a topic or question...");
  await promptInput.fill("Keyboard topic");
  await promptInput.press("Enter");

  const createdNode = page
    .getByRole("article")
    .filter({ hasText: "Keyboard topic" });
  await expect(createdNode).toBeVisible();
  await expect(createdNode).toContainText("Keyboard response");
});
