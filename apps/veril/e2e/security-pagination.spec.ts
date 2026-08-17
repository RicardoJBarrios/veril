import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { expect, Page, test } from '@playwright/test';

process.env['FIREBASE_AUTH_EMULATOR_HOST'] = '127.0.0.1:9099';
process.env['FIRESTORE_EMULATOR_HOST'] = '127.0.0.1:8080';

type E2eRolesFixture = {
  readonly password: string;
  readonly aquariumId: string;
  readonly secondaryAquariumId: string;
  readonly invitationCode: string;
  readonly keeperInvitationCode: string;
  readonly accountIds: Record<
    'keeper' | 'viewer' | 'editorial' | 'regular',
    string
  >;
  readonly accounts: Record<
    'keeper' | 'viewer' | 'editorial' | 'regular',
    string
  >;
};

function seedFixture(): E2eRolesFixture {
  return JSON.parse(
    execFileSync(
      process.execPath,
      [path.resolve(process.cwd(), '../../tools/firebase/seed-e2e-roles.mjs')],
      {
        encoding: 'utf8',
        env: {
          ...process.env,
          FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9099',
          FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080',
        },
      },
    ),
  ) as E2eRolesFixture;
}

async function signIn(
  page: Page,
  email: string,
  password: string,
  route = '/sign-in',
): Promise<void> {
  const returnUrl = new URL(route, 'http://localhost:4200').searchParams.get(
    'returnUrl',
  );
  const targetPath = returnUrl
    ? new URL(returnUrl, 'http://localhost:4200').pathname
    : '/app/aquariums';
  const signInRoute = route.includes('?')
    ? `${route}&switchAccount=true`
    : `${route}?switchAccount=true`;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await page.goto(signInRoute, { waitUntil: 'domcontentloaded' });
      if (new URL(page.url()).pathname === targetPath) return;
      await expect(page.getByTestId('sign-in-form')).toBeVisible();
      await page.waitForTimeout(300);
      if (new URL(page.url()).pathname === targetPath) return;
      await page.getByTestId('sign-in-email').fill(email, { timeout: 3_000 });
      await page
        .getByTestId('sign-in-password')
        .fill(password, { timeout: 3_000 });
      await page.getByTestId('sign-in-submit').click();
      if (!returnUrl) {
        await page.waitForTimeout(500);
        return;
      }
      await page.waitForURL((url) => url.pathname === targetPath, {
        timeout: 5_000,
      });
      return;
    } catch (error) {
      if (attempt === 2) throw error;
      await page.waitForTimeout(500);
    }
  }
}

async function selectAquarium(page: Page): Promise<void> {
  await page.goto('/app/aquariums');
  await page
    .getByTestId('aquarium-option')
    .filter({ hasText: 'E2E Pagination Aquarium' })
    .click();
  await expect(page).toHaveURL('/app/aquariums/current');
}

test('private area requires a keeper claim', async ({ page }) => {
  const fixture = seedFixture();

  await page.goto('/app/aquariums');
  await expect(page).toHaveURL('/sign-in');

  await signIn(page, fixture.accounts.regular, fixture.password);
  await page.goto('/app/aquariums');
  await expect(page).toHaveURL('/sign-in');
  await expect(
    page.getByRole('heading', { name: 'Iniciar sesión' }),
  ).toBeVisible();
});

test('invalid credentials remain on the sign-in form with an accessible error', async ({
  page,
}) => {
  const fixture = seedFixture();

  await page.goto('/sign-in?switchAccount=true');
  await page.getByTestId('sign-in-email').fill(fixture.accounts.keeper);
  await page.getByTestId('sign-in-password').fill('wrong-password');
  await page.getByTestId('sign-in-submit').click();

  await expect(page).toHaveURL(/\/sign-in\?switchAccount=true$/);
  await expect(page.getByRole('alert')).toContainText(
    'No se ha podido iniciar la sesión.',
  );
  await expect(page.getByTestId('sign-in-form')).toBeVisible();
});

test('editorial access is independent from keeper access', async ({ page }) => {
  const fixture = seedFixture();

  await signIn(
    page,
    fixture.accounts.editorial,
    fixture.password,
    `/sign-in?returnUrl=/editorial/species-knowledge/${fixture.aquariumId}`,
  );
  await expect(page).toHaveURL(
    `/editorial/species-knowledge/${fixture.aquariumId}`,
  );

  await page.goto('/app/aquariums');
  await expect(page).not.toHaveURL('/sign-in');
});

test('keeper sees the default page and can select only the bounded maximum', async ({
  page,
}) => {
  const fixture = seedFixture();

  await signIn(page, fixture.accounts.keeper, fixture.password);
  await expect(page).toHaveURL('/app/aquariums');
  await selectAquarium(page);
  await page.goto('/app/aquariums/measurements');

  const list = page.getByTestId('measurement-list');
  await expect(list.locator('li')).toHaveCount(20);
  const pageSize = page.getByTestId('page-size-select');
  await expect(pageSize).toHaveValue('20');
  await expect(pageSize.locator('option')).toHaveText(['10', '20', '50']);

  await pageSize.selectOption('50');
  await expect(pageSize).toHaveValue('50');
  await expect(list.locator('li')).toHaveCount(50);
  await expect(page.getByTestId('next-page-button')).toBeVisible();

  await page.getByTestId('next-page-button').click();
  await expect(list.locator('li')).toHaveCount(55);
  await expect(page.getByTestId('next-page-button')).toHaveCount(0);
});

test('a keeper can grant, verify and revoke scoped viewer access', async ({
  page,
  browser,
}) => {
  const fixture = seedFixture();
  await signIn(page, fixture.accounts.keeper, fixture.password);
  await selectAquarium(page);
  await page.goto('/app/aquariums/access');

  await page.getByTestId('access-permission-aquarium').check();
  await page.getByTestId('access-permission-measurements').check();
  await page.getByTestId('access-permission-waterChanges').check();
  await page.getByTestId('access-create-invitation').click();
  const invitationCode = await page
    .getByTestId('access-invitation-code')
    .textContent();
  expect(invitationCode).toBeTruthy();

  const viewerPage = await browser.newPage();
  try {
    await signIn(
      viewerPage,
      fixture.accounts.viewer,
      fixture.password,
      '/sign-in?returnUrl=/access/accept',
    );
    await viewerPage
      .getByTestId('invitation-code')
      .fill(invitationCode?.trim() ?? '');
    await viewerPage.getByRole('button', { name: 'Aceptar' }).click();
    await expect(viewerPage.getByRole('status')).toContainText(
      'Invitación aceptada',
    );
    await viewerPage.goto(`/shared/aquariums/${fixture.aquariumId}`);
    await expect(viewerPage.getByTestId('shared-aquarium')).toContainText(
      'measurements: 20 registros disponibles',
    );
    await expect(viewerPage.getByTestId('shared-aquarium')).toContainText(
      'waterChanges: 1 registros disponibles',
    );

    await page.goto('/app/aquariums/access');
    const grant = page.getByTestId('access-grant');
    await expect(grant).toContainText(fixture.accountIds.viewer);
    await grant.getByTestId('access-revoke').click();
    await expect(grant).toContainText('Revocado');

    await viewerPage.reload();
    await expect(viewerPage.getByRole('alert')).toContainText(
      'No tienes acceso a este acuario.',
    );
  } finally {
    await viewerPage.close();
  }
});

test('a viewer can accept a scoped read-only invitation', async ({ page }) => {
  const fixture = seedFixture();
  await signIn(
    page,
    fixture.accounts.viewer,
    fixture.password,
    '/sign-in?returnUrl=/access/accept',
  );
  await page.getByLabel('Código de invitación').fill(fixture.invitationCode);
  await page.getByRole('button', { name: 'Aceptar' }).click();
  await expect(page.getByRole('status')).toContainText('Invitación aceptada');

  const adminApp =
    getApps().find((candidate) => candidate.name === 'veril-e2e-assertions') ??
    initializeApp({ projectId: 'demo-veril' }, 'veril-e2e-assertions');
  const grant = await getFirestore(adminApp)
    .collection('aquariumAccessGrants')
    .doc(`${fixture.aquariumId}_${fixture.accountIds.viewer}`)
    .get();
  expect(grant.exists).toBe(true);
  await page.goto(`/shared/aquariums/${fixture.aquariumId}`);
  await expect(
    page.getByRole('heading', { name: 'E2E Pagination Aquarium' }),
  ).toBeVisible();
  await expect(page.locator('body')).toContainText(
    'Solo se muestran las secciones para las que tienes permiso.',
  );
  await expect(page.locator('body')).not.toContainText('measurements:');
  await expect(page.locator('body')).not.toContainText('livestock:');
});

test('one keeper session can also access another aquarium as a viewer', async ({
  page,
}) => {
  const fixture = seedFixture();

  await signIn(page, fixture.accounts.keeper, fixture.password);
  await page.goto('/app/aquariums');
  await expect(page.getByTestId('aquarium-list')).toBeVisible();
  await page.goto('/access/accept');
  await expect(page.getByTestId('accept-invitation-form')).toBeVisible({
    timeout: 15_000,
  });
  await page
    .getByLabel('Código de invitación')
    .fill(fixture.keeperInvitationCode);
  await page.getByRole('button', { name: 'Aceptar' }).click();
  await expect(page.getByRole('status')).toContainText('Invitación aceptada');

  await page.goto(`/shared/aquariums/${fixture.secondaryAquariumId}`);
  await expect(
    page.getByRole('heading', { name: 'E2E Shared Aquarium' }),
  ).toBeVisible();

  await page.goto('/app/aquariums');
  await expect(page).not.toHaveURL('/sign-in');
});

test('a viewer cannot accept an expired invitation', async ({ page }) => {
  const fixture = seedFixture();
  const adminApp =
    getApps().find((candidate) => candidate.name === 'veril-e2e-expired') ??
    initializeApp({ projectId: 'demo-veril' }, 'veril-e2e-expired');
  const expiredCode = randomUUID();

  await getFirestore(adminApp)
    .collection('aquariumAccessInvitations')
    .doc(expiredCode)
    .set({
      aquariumId: fixture.aquariumId,
      ownerId: fixture.accountIds.keeper,
      permissions: { aquarium: true, measurements: true },
      status: 'active',
      createdAt: Timestamp.fromDate(new Date('2026-08-01T10:00:00.000Z')),
      expiresAt: Timestamp.fromDate(new Date('2026-08-02T10:00:00.000Z')),
    });

  await signIn(
    page,
    fixture.accounts.viewer,
    fixture.password,
    '/sign-in?returnUrl=/access/accept',
  );
  await page.getByLabel('Código de invitación').fill(expiredCode);
  await page.getByRole('button', { name: 'Aceptar' }).click();
  await expect(page.getByRole('alert')).toContainText(
    'No se puede aceptar esta invitación.',
  );
});

test('a viewer cannot enter keeper routes or write forms', async ({ page }) => {
  const fixture = seedFixture();

  await signIn(
    page,
    fixture.accounts.viewer,
    fixture.password,
    '/sign-in?returnUrl=/access/accept',
  );
  await page.getByLabel('Código de invitación').fill(fixture.invitationCode);
  await page.getByRole('button', { name: 'Aceptar' }).click();
  await expect(page.getByRole('status')).toContainText('Invitación aceptada');

  await page.goto('/app/aquariums');
  await expect(page).toHaveURL('/sign-in');

  await page.goto('/app/aquariums/measurements/new');
  await expect(page).toHaveURL('/sign-in');
});

test('a viewer can see only the private section granted by the keeper', async ({
  page,
  browser,
}) => {
  const fixture = seedFixture();

  await signIn(page, fixture.accounts.keeper, fixture.password);
  await selectAquarium(page);
  await page.goto('/app/aquariums/access');

  await page.getByTestId('access-permission-aquarium').check();
  await page.getByTestId('access-permission-measurements').check();
  await page.getByTestId('access-create-invitation').click();
  const invitationCode = await page
    .getByTestId('access-invitation-code')
    .textContent();
  expect(invitationCode).toBeTruthy();

  const viewerPage = await browser.newPage();
  try {
    await signIn(
      viewerPage,
      fixture.accounts.viewer,
      fixture.password,
      '/sign-in?returnUrl=/access/accept',
    );
    await viewerPage
      .getByTestId('invitation-code')
      .fill(invitationCode?.trim() ?? '');
    await viewerPage.getByRole('button', { name: 'Aceptar' }).click();
    await expect(viewerPage.getByRole('status')).toContainText(
      'Invitación aceptada',
    );

    await viewerPage.goto(`/shared/aquariums/${fixture.aquariumId}`);
    await expect(
      viewerPage.getByRole('heading', { name: 'E2E Pagination Aquarium' }),
    ).toBeVisible();
    await expect(viewerPage.getByTestId('shared-aquarium')).toContainText(
      'measurements: 20 registros disponibles',
    );
    await expect(viewerPage.getByTestId('shared-aquarium')).not.toContainText(
      'careWorks:',
    );
    await expect(viewerPage.getByTestId('shared-aquarium')).not.toContainText(
      'livestock:',
    );
  } finally {
    await viewerPage.close();
  }
});

test('a viewer can receive a read-only grant for observations, care and livestock', async ({
  page,
  browser,
}) => {
  const fixture = seedFixture();

  await signIn(page, fixture.accounts.keeper, fixture.password);
  await selectAquarium(page);
  await page.goto('/app/aquariums/access');

  for (const permission of [
    'aquarium',
    'observations',
    'careWorks',
    'livestock',
    'equipment',
  ]) {
    await page.getByTestId(`access-permission-${permission}`).check();
  }
  await page.getByTestId('access-create-invitation').click();
  const invitationCode = await page
    .getByTestId('access-invitation-code')
    .textContent();
  expect(invitationCode).toBeTruthy();

  const viewerPage = await browser.newPage();
  try {
    await signIn(
      viewerPage,
      fixture.accounts.viewer,
      fixture.password,
      '/sign-in?returnUrl=/access/accept',
    );
    await viewerPage
      .getByTestId('invitation-code')
      .fill(invitationCode?.trim() ?? '');
    await viewerPage.getByRole('button', { name: 'Aceptar' }).click();
    await expect(viewerPage.getByRole('status')).toContainText(
      'Invitación aceptada',
    );

    await viewerPage.goto(`/shared/aquariums/${fixture.aquariumId}`);
    const sharedAquarium = viewerPage.getByTestId('shared-aquarium');
    await expect(sharedAquarium).toContainText(
      'observations: 1 registros disponibles',
    );
    await expect(sharedAquarium).toContainText(
      'careWorks: 1 registros disponibles',
    );
    await expect(sharedAquarium).toContainText(
      'livestock: 1 registros disponibles',
    );
    await expect(sharedAquarium).toContainText(
      'equipment: 1 registros disponibles',
    );
    await expect(sharedAquarium).not.toContainText('measurements:');
    await expect(sharedAquarium).not.toContainText('plannedCareWorks:');
  } finally {
    await viewerPage.close();
  }
});
