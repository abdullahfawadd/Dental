import { test, expect } from '@playwright/test';
import { routes, viewports } from '../../scripts/visual-matrix.mjs';

for (const route of routes) {
  test(`${route} fits all ten requested viewport sizes`, async ({ page }) => {
    await page.goto(`.${route}`, { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => document.fonts.ready);
    await expect(page.locator('header').first()).toBeAttached();
    await expect(page.locator('footer').last()).toBeAttached();
    for (const viewport of viewports) {
      await test.step(`${viewport.width}×${viewport.height}`, async () => {
        await page.setViewportSize(viewport);
        const width = await page.evaluate(() => document.documentElement.scrollWidth);
        expect.soft(width, `${route} document width at ${viewport.width}×${viewport.height}`)
          .toBeLessThanOrEqual(viewport.width + 1);
      });
    }
  });
}
