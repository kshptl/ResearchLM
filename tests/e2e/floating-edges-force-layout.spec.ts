import { expect, test } from "@playwright/test"

test("connected nodes render floating edges and auto force layout moves the graph", async ({ page }) => {
  await page.route("**/api/llm/stream", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "text/event-stream",
      body: `event: delta\ndata: ${JSON.stringify({ text: "Root response" })}\n\n`,
    })
  })

  await page.goto("/")

  const initialPrompt = page.getByPlaceholder("Type a topic or question...")
  await initialPrompt.fill("Root topic")
  await initialPrompt.press("Enter")

  const rootNode = page.locator(".react-flow__node").filter({ hasText: "Root topic" }).first()
  await expect(rootNode).toBeVisible()

  await rootNode.getByRole("button", { name: "Footer follow up" }).click()

  const nodes = page.locator(".react-flow__node")
  await expect(nodes).toHaveCount(2)

  const edgePath = page.locator(".react-flow__edge-path").first()
  await expect(edgePath).toBeVisible()
  const pathDescriptor = await edgePath.getAttribute("d")
  expect(pathDescriptor ?? "").toContain("C")

  const before = await rootNode.boundingBox()
  expect(before).not.toBeNull()

  await page.waitForTimeout(800)

  const after = await rootNode.boundingBox()
  expect(after).not.toBeNull()

  const moved =
    Math.abs((after?.x ?? 0) - (before?.x ?? 0)) > 1 ||
    Math.abs((after?.y ?? 0) - (before?.y ?? 0)) > 1

  expect(moved).toBe(true)
})

test("node resizing updates during drag before mouse release", async ({ page }) => {
  await page.route("**/api/llm/stream", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "text/event-stream",
      body: `event: delta\ndata: ${JSON.stringify({ text: "Root response" })}\n\n`,
    })
  })

  await page.goto("/")

  const initialPrompt = page.getByPlaceholder("Type a topic or question...")
  await initialPrompt.fill("Resizable topic")
  await initialPrompt.press("Enter")

  const node = page.locator(".react-flow__node").filter({ hasText: "Resizable topic" }).first()
  await expect(node).toBeVisible()
  await node.click()

  const resizeHandle = node.locator(".researchlm-node-resize-handle.react-flow__resize-control.handle.bottom.right")
  await expect(resizeHandle).toBeVisible()

  const nodeBefore = await node.boundingBox()
  const handleBox = await resizeHandle.boundingBox()
  expect(nodeBefore).not.toBeNull()
  expect(handleBox).not.toBeNull()

  await page.mouse.move((handleBox?.x ?? 0) + (handleBox?.width ?? 0) / 2, (handleBox?.y ?? 0) + (handleBox?.height ?? 0) / 2)
  await page.mouse.down()
  await page.mouse.move((handleBox?.x ?? 0) + 64, (handleBox?.y ?? 0) + 48, { steps: 8 })
  await page.waitForTimeout(80)

  const nodeDuring = await node.boundingBox()
  expect(nodeDuring).not.toBeNull()

  const widthChangedBeforeRelease = Math.abs((nodeDuring?.width ?? 0) - (nodeBefore?.width ?? 0)) > 4
  const heightChangedBeforeRelease = Math.abs((nodeDuring?.height ?? 0) - (nodeBefore?.height ?? 0)) > 4
  expect(widthChangedBeforeRelease || heightChangedBeforeRelease).toBe(true)

  await page.mouse.up()
})

test("dragging an edge from a node into empty canvas creates a new node", async ({ page }) => {
  await page.route("**/api/llm/stream", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "text/event-stream",
      body: `event: delta\ndata: ${JSON.stringify({ text: "Root response" })}\n\n`,
    })
  })

  await page.goto("/")

  const initialPrompt = page.getByPlaceholder("Type a topic or question...")
  await initialPrompt.fill("Edge drag root")
  await initialPrompt.press("Enter")

  const rootNode = page.locator(".react-flow__node").filter({ hasText: "Edge drag root" }).first()
  await expect(rootNode).toBeVisible()

  const rootBox = await rootNode.boundingBox()
  expect(rootBox).not.toBeNull()

  const startX = (rootBox?.x ?? 0) + (rootBox?.width ?? 0) / 2
  const startY = (rootBox?.y ?? 0) + (rootBox?.height ?? 0) - 6
  await page.mouse.move(startX, startY)
  await page.mouse.down()
  await page.mouse.move(startX + 220, startY + 170, { steps: 10 })
  await page.mouse.up()

  await expect(page.locator(".react-flow__node")).toHaveCount(2)
  await expect(page.locator(".react-flow__edge-path")).toHaveCount(1)
})
