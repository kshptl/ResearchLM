import { expect, test } from "@playwright/test";

test("node footer action tooltips render with non-transparent shadcn popover styling", async ({
  page,
}) => {
  await page.route("**/api/llm/stream", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "text/event-stream",
      body: `event: delta\ndata: ${JSON.stringify({ text: "Tooltip response" })}\n\n`,
    });
  });

  await page.goto("/");

  const promptInput = page.getByPlaceholder("Type a topic or question...");
  await promptInput.fill("Tooltip styling check");
  await promptInput.press("Enter");

  const node = page.locator("[role='article']").first();
  await expect(node).toBeVisible();

  const followUpAction = node.getByRole("button", { name: "Footer follow up" });
  await followUpAction.hover();

  const tooltip = page
    .locator('[data-slot="tooltip-content"]')
    .filter({ hasText: "Follow up" })
    .first();
  await expect(tooltip).toBeVisible();
  await expect(tooltip).toContainText("Follow up");

  const styles = await tooltip.evaluate((element) => {
    const computed = window.getComputedStyle(element);
    const rootComputed = window.getComputedStyle(document.documentElement);
    const foreground = rootComputed.getPropertyValue("--foreground").trim();
    const fgProbe = document.createElement("div");
    fgProbe.style.color = `hsl(${foreground})`;
    document.body.appendChild(fgProbe);
    const expectedForegroundRgb = window.getComputedStyle(fgProbe).color;
    fgProbe.remove();
    return {
      backgroundColor: computed.backgroundColor,
      expectedForegroundRgb,
      animationName: computed.animationName,
    };
  });

  expect(styles.backgroundColor).not.toBe("rgba(0, 0, 0, 0)");
  expect(styles.backgroundColor).not.toBe("transparent");
  expect(styles.backgroundColor).toBe(styles.expectedForegroundRgb);
  expect(styles.animationName).not.toBe("none");
});
