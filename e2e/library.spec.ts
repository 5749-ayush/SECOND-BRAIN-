import { expect, test } from "@playwright/test";

test("renders and filters the visual idea library", async ({ page }, testInfo) => {
  const runtimeErrors: string[] = [];
  page.on("pageerror", (error) => runtimeErrors.push(error.message));

  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Your creative field." })).toBeVisible();
  await expect(page.getByText("6 ideas in view")).toBeVisible();
  await expect(page.getByRole("button", { name: /Open Why the best video ideas/ })).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await expect(page.locator(".vite-error-overlay")).toHaveCount(0);

  await page.getByRole("searchbox", { name: "Search ideas" }).fill("uncomfortable truth");
  await expect(page.getByText("1 idea in view")).toBeVisible();
  await expect(page.getByRole("button", { name: /Open with the uncomfortable truth/ })).toBeVisible();

  await page.screenshot({
    path: testInfo.outputPath("library.png"),
    fullPage: true
  });
  expect(runtimeErrors).toEqual([]);
});

test("opens the save-idea composer and interacts with forms", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Save an idea" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Save something worth returning to" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Save a link" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Upload image" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Loose idea" })).toBeVisible();

  // Switch to loose idea mode and verify form fields fit properly
  await page.getByRole("button", { name: "Loose idea" }).click();
  await expect(page.getByLabel("Title optional")).toBeVisible();
  await expect(page.getByLabel("Notes optional")).toBeVisible();
  await expect(page.getByRole("button", { name: "Cancel" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Save idea" })).toBeVisible();

  // Close composer
  await page.getByRole("button", { name: "Cancel" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("enforces exactly 2 cards per row on mobile viewports with equal dimensions", async ({ page }) => {
  const mobileViewports = [
    { width: 320, height: 640, name: "320px small screen" },
    { width: 375, height: 667, name: "iPhone SE (375px)" },
    { width: 390, height: 844, name: "iPhone 14 (390px)" },
    { width: 412, height: 915, name: "Pixel 7 (412px)" }
  ];

  for (const vp of mobileViewports) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto("/");
    await expect(page.getByText("6 ideas in view")).toBeVisible();

    // Prevent horizontal overflow
    const hasNoHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth
    );
    expect(hasNoHorizontalOverflow, `Horizontal overflow detected at ${vp.name}`).toBe(true);

    const cards = page.locator(".idea-card");
    const count = await cards.count();
    expect(count).toBeGreaterThanOrEqual(4);

    // Get bounding boxes for all cards
    const boxes = [];
    for (let i = 0; i < count; i++) {
      const box = await cards.nth(i).boundingBox();
      expect(box).not.toBeNull();
      boxes.push(box!);
    }

    // Verify row 1: card 0 and card 1
    const card0 = boxes[0];
    const card1 = boxes[1];

    // Card 0 is on the left, Card 1 is on the right
    expect(card0.x, `Card 0 should be on left of Card 1 at ${vp.name}`).toBeLessThan(card1.x);

    // Same row: top coordinates must be identical (aligned horizontally)
    expect(Math.abs(card0.y - card1.y), `Cards 0 and 1 should share top Y at ${vp.name}`).toBeLessThanOrEqual(2);

    // Equal width in the row
    expect(Math.abs(card0.width - card1.width), `Cards 0 and 1 should have equal width at ${vp.name}`).toBeLessThanOrEqual(2);

    // Equal height in the row
    expect(Math.abs(card0.height - card1.height), `Cards 0 and 1 should have equal height at ${vp.name}`).toBeLessThanOrEqual(2);

    // Verify row 2: card 2 and card 3
    const card2 = boxes[2];
    const card3 = boxes[3];

    // Card 2 is on the left, Card 3 is on the right
    expect(card2.x, `Card 2 should be on left of Card 3 at ${vp.name}`).toBeLessThan(card3.x);

    // Same row: top coordinates must be identical
    expect(Math.abs(card2.y - card3.y), `Cards 2 and 3 should share top Y at ${vp.name}`).toBeLessThanOrEqual(2);

    // Equal width in the row
    expect(Math.abs(card2.width - card3.width), `Cards 2 and 3 should have equal width at ${vp.name}`).toBeLessThanOrEqual(2);

    // Equal height in the row
    expect(Math.abs(card2.height - card3.height), `Cards 2 and 3 should have equal height at ${vp.name}`).toBeLessThanOrEqual(2);

    // Row 2 is distinctly below Row 1
    expect(card2.y, `Row 2 must be below Row 1 at ${vp.name}`).toBeGreaterThan(card0.y + card0.height * 0.9);

    // Column alignment: Card 0 and Card 2 share the same left X
    expect(Math.abs(card0.x - card2.x), `Left column should align at ${vp.name}`).toBeLessThanOrEqual(2);

    // Column alignment: Card 1 and Card 3 share the same left X
    expect(Math.abs(card1.x - card3.x), `Right column should align at ${vp.name}`).toBeLessThanOrEqual(2);
  }
});

