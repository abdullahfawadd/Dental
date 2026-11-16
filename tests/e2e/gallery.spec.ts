import { test, expect } from '@playwright/test';

test.use({ reducedMotion: 'no-preference' });

test('the patient transformation gallery populates and animates on scroll', async ({ page }) => {
  await page.goto('./service/esthetic-dentistry', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#preloader')).toBeHidden({ timeout: 20_000 });
  const gallery = page.locator('.gallery').first();
  const ticker = gallery.locator('.ticker-line').first();
  await ticker.scrollIntoViewIfNeeded();
  await expect(ticker).toBeInViewport();
  await expect(gallery.getByRole('heading')).toContainText('Transformation');
  await expect.poll(() => ticker.locator('img').evaluateAll((images) => {
    const loaded = images.filter((image) => (image as HTMLImageElement).naturalWidth > 0);
    return new Set(loaded.map((image) => (image as HTMLImageElement).currentSrc)).size;
  })).toBeGreaterThan(1);

  const transform = () => ticker.evaluate((element) => getComputedStyle(element).transform);
  const start = await transform();
  await expect.poll(transform).not.toBe(start);
});
