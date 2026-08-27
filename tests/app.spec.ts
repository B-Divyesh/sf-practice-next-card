import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('creates, times, logs, and reopens a practice card', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('What happens next?');
  await page.getByRole('button', { name: 'Make the first card' }).click();
  await page.getByLabel('Piece name').fill('Bach invention');
  await page.getByLabel('Measure or range').fill('17–18');
  await page.getByLabel('One next action').fill('Loop the left-hand turn three clean times');
  await page.getByRole('button', { name: 'Add to today' }).click();
  await expect(page.getByText('Loop the left-hand turn three clean times', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Start timer' }).click();
  await expect(page.getByRole('button', { name: 'Pause' })).toBeVisible();
  await page.getByRole('button', { name: 'Log this attempt' }).click();
  await page.getByLabel('Evidence for future you (optional)').fill('The turn was even twice.');
  await page.getByRole('button', { name: 'Save the handoff' }).click();
  await page.getByRole('link', { name: 'Archive' }).click();
  await expect(page.getByText('The turn was even twice.')).toBeVisible();
  await page.getByRole('button', { name: 'Reopen' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('What happens next?');
});

test('has no serious accessibility violations and works offline after first load', async ({ page, context }) => {
  await page.goto('/');
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter(item => ['serious', 'critical'].includes(item.impact ?? ''))).toEqual([]);
  await page.waitForFunction(() => navigator.serviceWorker?.controller !== null);
  await context.setOffline(true);
  await page.evaluate(() => window.dispatchEvent(new Event('offline')));
  await expect(page.getByText('Offline · saved locally')).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('What happens next?');
});

test('legal routes have one h1 and render directly', async ({ page }) => {
  for (const route of ['/privacy', '/terms']) {
    await page.goto(route);
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('main')).toBeVisible();
  }
});

test('captures a returned license without exposing it in the URL', async ({ page }) => {
  await page.goto('/?license=test-token-123');
  await expect.poll(() => page.url()).not.toContain('license=');
  await expect.poll(() => page.evaluate(() => localStorage.getItem('sb_license:practice-next-card'))).toBe('test-token-123');
});
