import { expect, test } from '@playwright/test';

test('game canvas renders', async ({ page }) => {
  await page.goto('/');
  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible();
  const size = await canvas.evaluate((node) => ({
    width: (node as HTMLCanvasElement).width,
    height: (node as HTMLCanvasElement).height,
  }));
  expect(size.width).toBeGreaterThan(0);
  expect(size.height).toBeGreaterThan(0);
  await expect.poll(() => page.evaluate(() => Boolean(window.__phaserGame)), { timeout: 15_000 }).toBe(true);
  await expect
    .poll(() => page.evaluate(() => window.__phaserGame?.scene.isActive('GameScene') ?? false), {
      timeout: 15_000,
    })
    .toBe(true);
});
