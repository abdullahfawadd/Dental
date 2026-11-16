import { test, expect } from '@playwright/test';
import { routes } from '../../scripts/visual-matrix.mjs';

for (const route of routes) {
  test(`${route} renders as a direct navigation`, async ({ page }) => {
    const response = await page.goto(`.${route}`, { waitUntil: 'domcontentloaded' });
    expect(response?.status()).toBe(200);
    await expect(page.locator('main').first()).toBeAttached();
    await expect(page.locator('footer').last()).toBeAttached();
    await expect(page.locator('body')).toContainText(/Aventura Dental Arts|Aventura/);
  });
}

test('technology links to the laboratory and the laboratory links to FAQs', async ({ page }) => {
  await page.goto('./technology', { waitUntil: 'domcontentloaded' });
  const laboratory = page.locator('a[href$="/laboratory"]').first();
  await expect(laboratory).toBeAttached();
  await page.goto(await laboratory.getAttribute('href') || '/laboratory', { waitUntil: 'domcontentloaded' });
  const faq = page.locator('a[href$="/faq"]').first();
  await expect(faq).toBeAttached();
  await page.goto(await faq.getAttribute('href') || '/faq', { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveURL(/\/faq\/?$/);
});
