import type { Page } from "@playwright/test";

export async function stabilizeVisualPage(page: Page): Promise<void> {
  await page.emulateMedia({ reducedMotion: "reduce", colorScheme: "light" });
  await page.addStyleTag({
    content:
      "*,*::before,*::after{animation:none !important;transition:none !important;caret-color:transparent !important;}[aria-label='Node detail panel'],[aria-label='Settings'],[data-response-followup-menu='true']{backdrop-filter:none !important;-webkit-backdrop-filter:none !important;background-color:rgb(255,255,255) !important;}[data-testid='node-inline-context-blocks'] blockquote,[data-testid='node-panel-context-blocks'] blockquote{font-size:11px !important;line-height:16px !important;}",
  });
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
}

export async function openWorkspace(page: Page): Promise<void> {
  await page.goto("/");
  await stabilizeVisualPage(page);
}

export async function mockGeneration(
  page: Page,
  responses: string[],
): Promise<void> {
  const queue = [...responses];

  await page.route("**/api/llm/stream", async (route) => {
    const next = queue.shift() ?? "";
    await route.fulfill({
      status: 200,
      contentType: "text/event-stream",
      body: `event: delta\ndata: ${JSON.stringify({ text: next })}\n\n`,
    });
  });
}

export async function submitLandingPrompt(
  page: Page,
  prompt: string,
): Promise<void> {
  const input = page.getByPlaceholder("Type a topic or question...");
  await input.fill(prompt);
  await input.press("Enter");
}

export async function selectResponseExcerpt(page: Page): Promise<void> {
  await page
    .locator('[data-testid="node-response-markdown"] p')
    .first()
    .evaluate((element) => {
      const findTextNode = (node: Node): Text | null => {
        if (node.nodeType === Node.TEXT_NODE) {
          return node as Text;
        }

        for (const child of Array.from(node.childNodes)) {
          const match = findTextNode(child);
          if (match) {
            return match;
          }
        }

        return null;
      };

      const textNode = findTextNode(element);
      if (!textNode) {
        throw new Error("Missing response text node");
      }

      const range = document.createRange();
      range.setStart(textNode, 0);
      range.setEnd(textNode, Math.min(12, textNode.textContent?.length ?? 0));
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
    });
}
