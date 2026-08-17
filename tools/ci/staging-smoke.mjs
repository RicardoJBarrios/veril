import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';

const baseUrl = (
  process.env['STAGING_URL'] ?? 'https://veril-staging.web.app'
).replace(/\/$/, '');
const browser = await chromium.launch({ headless: true });

try {
  const page = await browser.newPage();
  const errors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`);
  });
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));

  const publicResponse = await page.goto(`${baseUrl}/?smoke=${Date.now()}`, {
    waitUntil: 'networkidle',
  });
  assert.equal(publicResponse?.status(), 200);
  assert.equal(await page.title(), 'Veril');

  const privateResponse = await page.goto(
    `${baseUrl}/app/aquariums?smoke=${Date.now()}`,
    {
      waitUntil: 'networkidle',
    },
  );
  assert.equal(privateResponse?.status(), 200);
  assert.match(page.url(), /\/sign-in$/);
  await assert.doesNotReject(() =>
    page.getByRole('heading', { name: 'Iniciar sesión' }).waitFor(),
  );

  assert.deepEqual(errors, [], `Staging browser errors:\n${errors.join('\n')}`);
  console.log(`Staging smoke passed: ${baseUrl}`);
} finally {
  await browser.close();
}
