import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function openDemo(page: Page, route = ''): Promise<void> {
  await page.goto(`/demo${route}`);
  await expect(page.getByText('Demo — sample data, nothing is saved')).toBeVisible();
}

test('one-click sample data stays separate and resets @claim:demo-isolation', async ({ page }) => {
  await openDemo(page);
  await page.evaluate(async () => {
    const value = {
      version: 1,
      cards: [{ id: 'real-sentinel', piece: 'My real piece', measure: '9', action: 'Keep this card', createdAt: '2026-09-06T00:00:00Z', updatedAt: '2026-09-06T00:00:00Z', status: 'queued', accumulatedSeconds: 0, attempts: [] }]
    };
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open('practice-next-card', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('app');
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result; const transaction = db.transaction('app', 'readwrite');
        transaction.objectStore('app').put(value, 'state');
        transaction.oncomplete = () => { db.close(); resolve(); };
        transaction.onerror = () => reject(transaction.error);
      };
    });
  });
  await expect(page.getByRole('button', { name: /Bach Invention No. 8/ })).toBeVisible();
  await page.getByRole('button', { name: 'Edit card' }).click();
  await page.getByLabel('Piece name').fill('Changed sample');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByRole('heading', { name: 'Changed sample' })).toBeVisible();
  await page.getByRole('button', { name: 'Reset demo' }).click();
  await expect(page.getByRole('heading', { name: 'Bach Invention No. 8' })).toBeVisible();
  await page.getByRole('button', { name: 'Start for real' }).click();
  await expect(page).toHaveURL('/');
  await expect(page.getByRole('heading', { name: 'My real piece' })).toBeVisible();
  expect(await page.evaluate(async () => (await indexedDB.databases()).map(item => item.name))).not.toContain('demo:practice-next-card');
});

test('today stops at three cards @claim:three-card-limit', async ({ page }) => {
  await openDemo(page);
  await expect(page.locator('.queue-card')).toHaveCount(3);
  await expect(page.getByText('3/3 loaded')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Add card' })).toBeDisabled();
  await expect(page.getByText('Finish or archive one card before adding another.')).toBeVisible();
});

test('card edits survive reload @claim:edit-persistence', async ({ page }) => {
  await openDemo(page);
  await page.getByRole('button', { name: 'Edit card' }).click();
  await page.getByLabel('One next action').fill('Repeat the turn twice without stopping');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await page.reload();
  await expect(page.getByText('Repeat the turn twice without stopping', { exact: true })).toBeVisible();
});

test('running timer survives reload @claim:timer-persistence', async ({ page }) => {
  await openDemo(page);
  await page.getByRole('button', { name: 'Start timer' }).click();
  await page.waitForTimeout(1100);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Pause' })).toBeVisible();
  const seconds = await page.locator('#timer-counter').textContent();
  expect(seconds).toMatch(/00:0[1-9]/);
});

test('attempt records outcome evidence and follow-up @claim:attempt-handoff', async ({ page }) => {
  await openDemo(page);
  await page.getByRole('button', { name: 'Log this attempt' }).click();
  await page.getByLabel('Ready to move on').check();
  await page.getByLabel('Evidence for your next session (optional)').fill('The turn stayed even three times.');
  await page.getByLabel('Follow-up action (optional)').fill('Add the right hand at the same tempo');
  await page.getByRole('button', { name: 'Save attempt' }).click();
  await expect(page.getByText('Add the right hand at the same tempo', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Archive' }).click();
  await expect(page.getByText('The turn stayed even three times.')).toBeVisible();
  await expect(page.getByText('Ready to move on').first()).toBeVisible();
});

test('score photo and link remain on the card @claim:score-reference', async ({ page }) => {
  await openDemo(page);
  await page.getByRole('button', { name: 'Edit card' }).click();
  await page.getByText('Add your own score reference (optional)').click();
  await page.getByLabel('Web link').fill('https://example.com/my-score');
  await page.getByLabel('Photo').setInputFiles({
    name: 'reference.png', mimeType: 'image/png',
    buffer: await readFile('public/icons/icon-192.png')
  });
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.locator('.score-photo')).toBeVisible();
  await page.reload();
  await expect(page.locator('.score-photo')).toBeVisible();
  await expect(page.getByRole('link', { name: /Open my score reference/ })).toHaveAttribute('href', 'https://example.com/my-score');
});

test('free archive shows the latest 30 records @claim:archive-limit', async ({ page }) => {
  await openDemo(page, '/archive');
  await expect(page.locator('.archive-item')).toHaveCount(30);
  await expect(page.getByText('2 older cards are still stored.')).toBeVisible();
  await expect(page.getByLabel('Search piece, measure, or action')).toHaveCount(0);
});

test('valid supporter license shows all records and search @claim:supporter-license', async ({ page }) => {
  await page.route('https://api.sociobot.in/**', route => route.fulfill({
    status: 200, contentType: 'application/json', body: JSON.stringify({ valid: true, reason: 'ok', expires_at: null })
  }));
  await openDemo(page, '/settings');
  await expect(page.getByText('Supporter edition costs $9 once.')).toBeVisible();
  await expect(page.getByText('Supporter checkout is not available yet')).toBeVisible();
  await expect(page.locator('a[href="https://api.sociobot.in/api/v1/products/practice-next-card/checkout"]')).toHaveCount(0);
  await page.getByText('Have a license?').click();
  await page.getByLabel('Paste your license token').fill('fixture-valid-license');
  await page.getByRole('button', { name: 'Verify license' }).click();
  await expect(page.getByText('Full archive and search are active')).toBeVisible();
  await page.getByRole('link', { name: 'Archive' }).click();
  await expect(page.locator('.archive-item')).toHaveCount(32);
  const search = page.getByLabel('Search piece, measure, or action');
  await search.fill('Villa-Lobos');
  expect(await page.locator('.archive-item').evaluateAll(items => items.filter(item => !(item as HTMLElement).hidden).length)).toBeGreaterThan(0);
  expect(await page.locator('.archive-item').evaluateAll(items => items.filter(item => !(item as HTMLElement).hidden).length)).toBeLessThan(32);
});

test('export includes every demo record @claim:json-export', async ({ page }) => {
  await openDemo(page, '/settings');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export backup' }).click();
  const download = await downloadPromise; const path = await download.path();
  expect(path).not.toBeNull();
  const exported = JSON.parse(await readFile(path!, 'utf8')) as { version: number; cards: unknown[] };
  expect(exported.version).toBe(1); expect(exported.cards).toHaveLength(35);
});

test('import replaces the demo after confirmation @claim:json-import', async ({ page }) => {
  await openDemo(page, '/settings');
  page.on('dialog', dialog => dialog.accept());
  const imported = { version: 1, cards: [{
    id: 'imported', piece: 'Imported étude', measure: '42', action: 'Play the leap twice',
    createdAt: '2026-09-06T00:00:00Z', updatedAt: '2026-09-06T00:00:00Z', status: 'queued', accumulatedSeconds: 0, attempts: []
  }] };
  await page.getByLabel('Import backup').setInputFiles({ name: 'backup.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(imported)) });
  await expect(page.getByText('1 card stored in the demo.')).toBeVisible();
  await page.getByRole('link', { name: 'Today' }).click();
  await expect(page.getByRole('heading', { name: 'Imported étude' })).toBeVisible();
});

test('erase clears every card in the selected workspace @claim:erase-data', async ({ page }) => {
  await openDemo(page, '/settings');
  page.on('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Erase all demo data' }).click();
  await expect(page.getByText('0 cards stored in the demo.')).toBeVisible();
  await page.getByRole('button', { name: 'Reset demo' }).click();
  await expect(page.getByText('35 cards stored in the demo.')).toBeVisible();
});

test('demo reload works offline after first visit @claim:offline-reload', async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  try {
    await openDemo(page);
    await page.waitForFunction(() => navigator.serviceWorker?.controller !== null);
    await context.setOffline(true);
    await page.evaluate(() => window.dispatchEvent(new Event('offline')));
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Try sample practice cards' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Bach Invention No. 8' })).toBeVisible();
    await expect(page.getByText('Offline · saved locally')).toBeVisible();
  } finally { await context.close(); }
});

test('practice flow sends no card data off origin @claim:local-privacy', async ({ page }) => {
  const origins = new Set<string>();
  const networkCalls: Array<{ method: string; type: string }> = [];
  page.on('request', request => {
    origins.add(new URL(request.url()).origin);
    networkCalls.push({ method: request.method(), type: request.resourceType() });
  });
  await openDemo(page);
  await page.getByRole('button', { name: 'Edit card' }).click();
  await page.getByLabel('One next action').fill('Keep this action in the browser');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await page.getByRole('button', { name: 'Start timer' }).click();
  await expect.poll(() => [...origins]).toEqual(['http://127.0.0.1:4173']);
  const databases = await page.evaluate(async () => (await indexedDB.databases()).map(item => item.name));
  expect(databases).toContain('demo:practice-next-card');
  expect(databases).not.toContain('practice-next-card');
  expect(networkCalls.every(call => call.method === 'GET')).toBe(true);
  expect(networkCalls.filter(call => ['fetch', 'xhr'].includes(call.type))).toEqual([]);
});

test('license verification waits for a supplied license @claim:license-request-consent', async ({ page }) => {
  const verificationRequests: string[] = [];
  await page.route('https://api.sociobot.in/**', route => {
    verificationRequests.push(route.request().url());
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ valid: false, reason: 'invalid' }) });
  });
  await openDemo(page, '/settings');
  expect(verificationRequests).toEqual([]);
  await page.getByText('Have a license?').click();
  await page.getByLabel('Paste your license token').fill('provided-by-user');
  await page.getByRole('button', { name: 'Verify license' }).click();
  await expect.poll(() => verificationRequests).toHaveLength(1);
  expect(verificationRequests[0]).toContain('/verify?license=provided-by-user');
});

test('layout fits 390 px with 44 px controls @claim:responsive-390', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openDemo(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  for (const control of await page.locator('button, a, summary').all()) {
    const box = await control.boundingBox(); if (!box) continue;
    expect(box.width).toBeGreaterThanOrEqual(44); expect(box.height).toBeGreaterThanOrEqual(44);
  }
});

test('main flow is operable from the keyboard @claim:keyboard', async ({ page }) => {
  await openDemo(page);
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to practice cards' })).toBeFocused();
  await page.keyboard.press('Enter'); await expect(page.locator('main')).toBeFocused();
  await page.getByRole('button', { name: 'Edit card' }).focus(); await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog')).toBeVisible(); await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Edit card' })).toBeFocused();
  await page.getByRole('button', { name: 'Start timer' }).focus(); await page.keyboard.press('Space');
  await expect(page.getByRole('button', { name: 'Pause' })).toBeVisible();
});

test('themes pass axe and reduced motion removes movement @claim:themes-motion', async ({ page }) => {
  for (const colorScheme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' });
    await openDemo(page);
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations.filter(item => ['serious', 'critical'].includes(item.impact ?? ''))).toEqual([]);
  }
  const durations = await page.locator('.button').first().evaluate(element => getComputedStyle(element).transitionDuration.split(',').map(value => Number.parseFloat(value)));
  expect(Math.max(...durations)).toBeLessThanOrEqual(.001);
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior)).toBe('auto');
});
