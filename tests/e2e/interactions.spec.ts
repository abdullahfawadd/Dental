import { test, expect } from '@playwright/test';

test('desktop services menu leads to a service overview', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('./', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#preloader')).toBeHidden({ timeout: 20_000 });
  const services = page.locator('header button.service');
  await expect(services).toBeVisible();
  await services.click();
  const esthetic = page.getByRole('link', { name: 'Esthetic Dentistry Esthetic Dentistry', exact: true }).last();
  await expect(esthetic).toBeInViewport();
  await esthetic.click();
  await expect(page).toHaveURL(/\/service\/esthetic-dentistry\/?$/);
});

test('mobile menu opens and navigates to About', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('./', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#preloader')).toBeHidden({ timeout: 20_000 });
  const menu = page.locator('header button.menu-btn-mob');
  await expect(menu).toBeVisible();
  await menu.click();
  const about = page.getByRole('navigation').getByRole('link', { name: 'About Us', exact: true }).last();
  await expect(about).toBeInViewport();
  await about.click();
  await expect(page).toHaveURL(/\/about\/?$/);
});

test('homepage carousel changes the active profile', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('./', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#preloader')).toBeHidden({ timeout: 20_000 });
  const nextProfile = page.locator('button[data-slide-idx="1"]').first();
  await nextProfile.scrollIntoViewIfNeeded();
  await expect(nextProfile).toBeVisible();
  await nextProfile.click();
  await expect(nextProfile).toHaveClass(/\bactive\b/);
});
