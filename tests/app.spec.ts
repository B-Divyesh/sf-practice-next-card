import { readFile, writeFile } from 'node:fs/promises';
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('creates, times, logs, and reopens a practice card', async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Leave your next practice action');
  await page.getByRole('button', { name: 'Add your first card' }).click();
  await page.getByLabel('Piece name').fill('Bach invention');
  await page.getByLabel('Measure or range').fill('17–18');
  await page.getByLabel('One next action').fill('Loop the left-hand turn three clean times');
  await page.getByRole('button', { name: 'Add to today' }).click();
  await expect(page.getByText('Loop the left-hand turn three clean times', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Start timer' }).click();
  await expect(page.getByRole('button', { name: 'Pause' })).toBeVisible();
  await page.getByRole('button', { name: 'Log this attempt' }).click();
  await page.getByLabel('Evidence for your next session (optional)').fill('The turn was even twice.');
  await page.getByRole('button', { name: 'Save attempt' }).click();
  await page.getByRole('link', { name: 'Archive' }).click();
  await expect(page.getByText('The turn was even twice.')).toBeVisible();
  await page.getByRole('button', { name: 'Reopen' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Leave your next practice action');
  expect(consoleErrors).toEqual([]);
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
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Leave your next practice action');
});

test('does not save whitespace-only required card values', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Add your first card' }).click();
  await page.getByLabel('Piece name').fill('   ');
  await page.getByLabel('Measure or range').fill('\t');
  await page.getByLabel('One next action').fill('\n');
  await page.getByRole('button', { name: 'Add to today' }).click();
  await expect(page.getByRole('alert')).toHaveText('Give this card a piece, measure, and one next action.');
  await expect(page.getByLabel('Piece name')).toBeFocused();
  await expect(page.locator('dialog')).toBeVisible();
});

test('rejects an unsafe score link and an unsupported backup', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Add your first card' }).click();
  await page.getByLabel('Piece name').fill('Bach invention');
  await page.getByLabel('Measure or range').fill('37–40');
  await page.getByLabel('One next action').fill('Play the turn twice');
  await page.getByText('Add your own score reference (optional)').click();
  await page.getByLabel('Web link').fill('javascript:alert(1)');
  await page.getByRole('button', { name: 'Add to today' }).click();
  await expect(page.getByRole('alert')).toHaveText('Use a full http:// or https:// link.');
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await page.getByRole('link', { name: 'Settings' }).click();
  await page.getByLabel('Import backup').setInputFiles({
    name: 'unsupported.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ version: 2, cards: [] }))
  });
  await expect(page.getByRole('status').filter({ hasText: 'This backup version is not supported.' })).toBeVisible();
  await expect(page.getByText('0 cards stored in this browser.')).toBeVisible();
});

test('keyboard skip navigation and dialog dismissal retain a usable focus path', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to practice cards' })).toBeFocused();
  await expect(page.getByRole('link', { name: 'Skip to practice cards' })).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(page.locator('main')).toBeFocused();
  await page.getByRole('button', { name: 'Add your first card' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Add your first card' })).toBeFocused();
});

test('mobile interactive controls meet the 44 px target contract', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-390', 'Measured at the required 390 px mobile viewport.');
  await page.goto('/');
  for (const control of await page.locator('button, a, summary').all()) {
    const box = await control.boundingBox();
    expect(box, await control.getAttribute('aria-label') ?? await control.getAttribute('href') ?? 'control').not.toBeNull();
    expect(box!.width).toBeGreaterThanOrEqual(44);
    expect(box!.height).toBeGreaterThanOrEqual(44);
  }
});

test('legal routes have one h1 and render directly', async ({ page }) => {
  for (const route of ['/privacy', '/terms']) {
    await page.goto(route);
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('main')).toBeVisible();
    await expect(page).toHaveTitle(`${route === '/privacy' ? 'Privacy' : 'Terms'} — Practice Next Card`);
  }
});

test('sets route titles, focus, canonical URLs, and a designed 404', async ({ page }) => {
  const routes = [
    ['/', 'Practice Next Card — Leave your next practice action'],
    ['/demo', 'Demo — Practice Next Card'],
    ['/archive', 'Archive — Practice Next Card'],
    ['/settings', 'Settings — Practice Next Card'],
    ['/privacy', 'Privacy — Practice Next Card'],
    ['/terms', 'Terms — Practice Next Card']
  ] as const;
  for (const [route, title] of routes) {
    await page.goto(route);
    await expect(page).toHaveTitle(title);
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `https://practice-next-card.sociobot.in${route}`);
  }
  await page.goto('/not-a-real-route');
  await expect(page).toHaveTitle('Page not found — Practice Next Card');
  await expect(page.getByRole('heading', { name: 'This page is not here' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Return to today' })).toBeVisible();
  await page.goto('/');
  await page.getByRole('link', { name: 'Archive' }).click();
  await expect(page.getByRole('heading', { name: 'Review past attempts' })).toBeFocused();
  await page.goBack();
  await expect(page.getByRole('heading', { name: 'Leave your next practice action' })).toBeFocused();
});

test('ships complete social and touch metadata', async ({ page, request }) => {
  await page.goto('/');
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /sf-practice-next-card-social\.png$/);
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute('content', 'summary_large_image');
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute('href', '/icons/apple-touch-icon.png');
  expect((await request.get('/assets/sf-practice-next-card-social.png')).ok()).toBe(true);
  expect((await request.get('/icons/apple-touch-icon.png')).ok()).toBe(true);
});

test('phone first screen states the job, audience, first action, and facts', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-390', 'Checked in the required 390 px phone project.');
  await page.goto('/');
  const required = [
    page.getByRole('heading', { name: 'Leave your next practice action' }),
    page.getByText(/For self-directed musicians/),
    page.getByRole('link', { name: 'Try it with sample data' }),
    page.getByText('Works offline after your first visit'),
    page.getByText('Practice notes stay in this browser'),
    page.getByText(/optional \$9 one-time Supporter edition/)
  ];
  for (const item of required) {
    await expect(item).toBeVisible();
    expect((await item.boundingBox())!.y).toBeLessThan(844);
  }
});

test('captures a returned license without exposing it in the URL', async ({ page }) => {
  await page.goto('/?license=test-token-123');
  await expect.poll(() => page.url()).not.toContain('license=');
  await expect.poll(() => page.evaluate(() => localStorage.getItem('sb_license:practice-next-card'))).toBe('test-token-123');
});

test('dark welcome treatment has no serious accessibility violations', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
  await page.goto('/');
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter(item => ['serious', 'critical'].includes(item.impact ?? ''))).toEqual([]);
});

test('announces an installed service-worker update', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => navigator.serviceWorker?.controller !== null);
  const originalWorker = await readFile('dist/sw.js', 'utf8');
  try {
    await writeFile('dist/sw.js', originalWorker.replace(/pnc-[a-f0-9]+/, 'pnc-regression-update'));
    await page.evaluate(async () => { await (await navigator.serviceWorker.getRegistration())?.update(); });
    await expect(page.getByText('A new version is ready.')).toBeVisible();
  } finally {
    await writeFile('dist/sw.js', originalWorker);
  }
});
