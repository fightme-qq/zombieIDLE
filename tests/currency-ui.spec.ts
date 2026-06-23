import { expect, test, type Locator, type Page } from '@playwright/test';

const GAME_WIDTH = 1280;
const GAME_HEIGHT = 720;
const forbiddenCurrencyWords = /\d+\s*(?:крыш|caps?|жетон|tokens?)/i;

async function clickGamePoint(page: Page, canvas: Locator, x: number, y: number): Promise<void> {
  const bounds = await canvas.boundingBox();
  if (!bounds) throw new Error('Game canvas has no bounds');

  await page.mouse.click(bounds.x + (x / GAME_WIDTH) * bounds.width, bounds.y + (y / GAME_HEIGHT) * bounds.height);
  await page.waitForTimeout(80);
}

async function getSceneCurrencySnapshot(page: Page, sceneKey: string): Promise<{ texts: string[]; textures: string[] }> {
  return page.evaluate((key) => {
    const scene = window.__phaserGame?.scene.getScene(key);
    const texts: string[] = [];
    const textures: string[] = [];

    const visit = (object: unknown): void => {
      const gameObject = object as { text?: unknown; texture?: { key?: unknown }; list?: unknown[] };
      if (typeof gameObject.text === 'string') texts.push(gameObject.text);
      if (typeof gameObject.texture?.key === 'string') textures.push(gameObject.texture.key);
      gameObject.list?.forEach(visit);
    };

    scene?.children.list.forEach(visit);
    return { texts, textures };
  }, sceneKey);
}

test('currency values use art on every game screen', async ({ page }) => {
  await page.goto('/');
  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible();
  await expect.poll(() => page.evaluate(() => Boolean(window.__phaserGame?.scene.isActive('GameScene')))).toBe(true);

  const preparationTabs = [280, 450, 640, 870];
  for (const tabX of preparationTabs) {
    await clickGamePoint(page, canvas, tabX, 682);
    const snapshot = await getSceneCurrencySnapshot(page, 'GameScene');
    expect(snapshot.texts.filter((text) => forbiddenCurrencyWords.test(text))).toEqual([]);
  }

  await clickGamePoint(page, canvas, 396, 146);
  const upgrades = await getSceneCurrencySnapshot(page, 'GameScene');
  expect(upgrades.textures).toContain('currency-caps');
  expect(upgrades.texts.filter((text) => forbiddenCurrencyWords.test(text))).toEqual([]);

  await clickGamePoint(page, canvas, 1188, 682);
  const settings = await getSceneCurrencySnapshot(page, 'GameScene');
  expect(settings.textures).toContain('currency-caps');
  expect(settings.texts.filter((text) => forbiddenCurrencyWords.test(text))).toEqual([]);

  const battle = await getSceneCurrencySnapshot(page, 'BattleScene');
  expect(battle.textures).toEqual(expect.arrayContaining(['currency-caps', 'currency-tokens']));
  expect(battle.texts.filter((text) => forbiddenCurrencyWords.test(text))).toEqual([]);
});
