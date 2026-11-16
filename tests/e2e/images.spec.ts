import { test, expect } from '@playwright/test';
import { routes } from '../../scripts/visual-matrix.mjs';

for (const route of routes) {
  test(`${route} loads rendered images and has no page exceptions`, async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') pageErrors.push(message.text());
    });
    await page.goto(`.${route}`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#preloader')).toBeHidden({ timeout: 20_000 });
    const broken = await page.evaluate(async () => {
      const images = [...document.images].filter((image) => image.getClientRects().length && image.currentSrc);
      for (const image of images) image.loading = 'eager';
      await Promise.allSettled(images.map((image) => image.decode()));
      return images.filter((image) => !image.naturalWidth).map((image) => image.currentSrc);
    });
    expect(broken).toEqual([]);
    expect(pageErrors).toEqual([]);
  });
}
