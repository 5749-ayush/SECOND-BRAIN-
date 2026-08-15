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

test("opens the save-idea composer", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Save an idea" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Save something worth returning to" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Save a link" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Upload image" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Loose idea" })).toBeVisible();
});
