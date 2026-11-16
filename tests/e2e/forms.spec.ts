import { test, expect } from '@playwright/test';

test('contact form validates missing fields and handles booking without sending patient data', async ({ page }) => {
  const writes: string[] = [];
  await page.route('**/*', async (route) => {
    if (['POST', 'PUT', 'PATCH'].includes(route.request().method())) {
      writes.push(route.request().url());
      await route.abort();
    } else {
      await route.continue();
    }
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('./contact', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#preloader')).toBeHidden({ timeout: 20_000 });
  const form = page.locator('form[data-v-6896cd1e]');
  const name = form.getByLabel('Name', { exact: true });
  const phone = form.getByLabel(/Phone number/i);
  const message = form.getByLabel(/Message/i);
  const submit = form.locator('button[type=submit]');
  await expect(name).toBeVisible();
  await expect(phone).toBeVisible();
  await expect(message).toBeVisible();

  const location = form.locator('..').locator('label:has(input[type=radio])').filter({ hasText: 'Bay Harbor' });
  await location.click();
  await expect(location.locator('input[type=radio]')).toBeChecked();

  await submit.click();
  await expect.poll(async () => {
    return await name.evaluate((element) => !(element as HTMLInputElement).validity.valid)
      || Boolean(await form.getByRole('status').filter({ hasText: /enter your name|required/i }).count());
  }).toBeTruthy();
  expect(writes).toEqual([]);

  await name.fill('Example Visitor');
  await phone.fill('3055550102');
  await message.fill('This is a local automated interaction check.');
  await submit.click();
  await expect(form.getByRole('status')).toContainText('Online booking is unavailable on this site.');
  expect(writes).toEqual([]);
});
