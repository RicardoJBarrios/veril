import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { expect, test } from '@playwright/test';

test('a keeper can record and list a water change', async ({ page }) => {
  process.env['FIREBASE_AUTH_EMULATOR_HOST'] = '127.0.0.1:9099';
  process.env['FIRESTORE_EMULATOR_HOST'] = '127.0.0.1:8080';
  const fixture = JSON.parse(
    execFileSync(
      process.execPath,
      [path.resolve(process.cwd(), '../../tools/firebase/seed-keeper-e2e.mjs')],
      { encoding: 'utf8', env: process.env },
    ),
  ) as { credentials: { email: string; password: string } };

  for (let attempt = 0; attempt < 3; attempt += 1) {
    await page.goto('/sign-in?switchAccount=true');
    await page.getByTestId('sign-in-email').fill(fixture.credentials.email);
    await page
      .getByTestId('sign-in-password')
      .fill(fixture.credentials.password);
    await page.getByTestId('sign-in-submit').click();
    if (page.url().endsWith('/app/aquariums')) break;
    if (attempt === 2) {
      await expect(page).toHaveURL('/app/aquariums');
    }
    await page.waitForTimeout(500);
  }
  await expect(page).toHaveURL('/app/aquariums');

  await page.getByRole('link', { name: 'Establecer acuario' }).click();
  await page.getByLabel('Nombre del acuario').fill('Maintenance E2E');
  await page.getByRole('button', { name: 'Crear acuario' }).click();
  await page.getByRole('link', { name: 'Ver mis acuarios' }).click();
  await page
    .getByTestId('aquarium-option')
    .filter({ hasText: 'Maintenance E2E' })
    .click();
  await page.waitForTimeout(500);
  await page.goto('/app/aquariums/current');

  await page.getByRole('link', { name: 'Registrar cambio de agua' }).click();
  await page.getByTestId('water-change-volume').fill('12.5');
  await page.getByTestId('water-change-notes').fill('Limpieza semanal');
  await page.getByTestId('water-change-submit').click();
  await expect(page.getByRole('status')).toContainText(
    'Cambio de agua guardado correctamente.',
  );
  await page.getByRole('link', { name: 'Ver cambios de agua' }).click();
  await expect(page.getByTestId('water-change-list')).toContainText(
    '12.5 litros',
  );
  await expect(page.getByTestId('water-change-list')).toContainText(
    'Limpieza semanal',
  );
  await page.goto('/app/aquariums/current');
  await expect(page.getByTestId('recent-activity-preview')).toContainText(
    'Cambio de agua',
  );
});
