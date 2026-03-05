import { expect, test } from "@playwright/test";

test("selecting a node opens the detail panel with current exploration actions", async ({
  page,
}) => {
  await page.route("**/api/llm/stream", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "text/event-stream",
      body: `event: delta\ndata: ${JSON.stringify({ text: "Node detail response" })}\n\n`,
    });
  });

  await page.goto("/");

  const promptInput = page.getByPlaceholder("Type a topic or question...");
  await promptInput.fill("Node detail topic");
  await promptInput.press("Enter");

  const createdNode = page
    .locator(".react-flow__node")
    .filter({ hasText: "Node detail topic" })
    .first();
  await expect(createdNode).toBeVisible();
  await createdNode.click();

  const detailPanel = page.getByRole("complementary", {
    name: "Node detail panel",
  });
  await expect(detailPanel).toBeVisible();
  await expect(detailPanel.getByLabel("Node prompt")).toBeVisible();
  await expect(detailPanel.getByTestId("node-response-markdown")).toBeVisible();
  await expect(
    detailPanel.getByRole("button", { name: "Questions" }),
  ).toBeVisible();
  await expect(
    detailPanel.getByRole("button", { name: "Subtopics" }),
  ).toBeVisible();
  await expect(
    detailPanel.getByRole("button", { name: "Summarize" }),
  ).toBeVisible();
  await expect(
    detailPanel.getByRole("button", { name: "Regenerate" }),
  ).toBeVisible();
});
