import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { expect, test } from '@playwright/test';

type Fixture = {
  credentials: { email: string; password: string };
  aquariumId: string;
  destinationAquariumId: string;
};
function seedFixture(): Fixture {
  return JSON.parse(
    execFileSync(
      process.execPath,
      [
        path.resolve(
          process.cwd(),
          '../../tools/firebase/seed-equipment-e2e.mjs',
        ),
      ],
      {
        encoding: 'utf8',
        env: {
          ...process.env,
          FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9099',
          FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080',
        },
      },
    ),
  );
}
async function signIn(
  page: import('@playwright/test').Page,
  credentials: Fixture['credentials'],
): Promise<void> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await page.goto('/sign-in', { waitUntil: 'domcontentloaded' });
      await expect(page.getByTestId('sign-in-form')).toBeVisible();
      await page.waitForTimeout(300);
      await page.getByTestId('sign-in-email').fill(credentials.email);
      await page.getByTestId('sign-in-password').fill(credentials.password);
      await page.getByTestId('sign-in-submit').click();
      await expect(page).toHaveURL('/app/aquariums', { timeout: 5_000 });
      return;
    } catch (error) {
      if (attempt === 2) throw error;
      await page.waitForTimeout(500);
    }
  }
}

test('keeper can create, edit and retire equipment while keeping the active list clean', async ({
  page,
}) => {
  const fixture = seedFixture();
  await signIn(page, fixture.credentials);
  await page
    .getByTestId('aquarium-option')
    .filter({ hasText: 'Equipment Aquarium' })
    .click();
  await expect(page).toHaveURL('/app/aquariums/current');
  await page.goto('/app/aquariums/current');
  await page.waitForTimeout(1_000);
  await page.goto('/app/aquariums/equipment');
  await expect(page.getByTestId('equipment-add')).toBeVisible();
  await page.goto('/app/aquariums/equipment/new');
  await page.getByTestId('equipment-name').fill('Skimmer E2E');
  await page.getByTestId('equipment-category').click();
  await page.getByRole('option', { name: 'filtration' }).click();
  await page.getByTestId('equipment-save').click();
  await expect(page).toHaveURL('/app/aquariums/equipment');
  await expect(page.getByTestId('equipment-list')).toContainText('Skimmer E2E');
  await page
    .getByTestId('equipment-list')
    .getByRole('link', { name: 'Editar' })
    .click();
  await expect(page.getByTestId('equipment-name')).toHaveValue('Skimmer E2E');
  await page.getByTestId('equipment-name').fill('Skimmer editado E2E');
  await page.getByTestId('equipment-save').click();
  await expect(page.getByTestId('equipment-list')).toContainText(
    'Skimmer editado E2E',
  );
  await page.goto('/app/aquariums/equipment/transfer');
  await expect(page.getByTestId('equipment-transfer-form')).toBeVisible();
  await page
    .getByTestId('equipment-transfer-destination')
    .selectOption(fixture.destinationAquariumId);
  await page.getByTestId('equipment-transfer-submit').click();
  await expect(page.getByRole('status')).toContainText(
    'Transferencia realizada',
  );
  await page.goto('/app/aquariums');
  await page
    .getByTestId('aquarium-option')
    .filter({ hasText: 'Equipment Destination' })
    .click();
  await expect(page).toHaveURL('/app/aquariums/current');
  await page.goto('/app/aquariums/equipment');
  await expect(page.getByTestId('equipment-list')).toContainText(
    'Skimmer editado E2E',
  );
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByTestId('equipment-retire').click();
  await expect(page.getByText('Aún no hay equipos activos.')).toBeVisible();
});
