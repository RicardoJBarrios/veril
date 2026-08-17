import { randomUUID } from 'node:crypto';
import { getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

const app =
  getApps().find((candidate) => candidate.name === 'veril-e2e-roles') ??
  initializeApp({ projectId: 'demo-veril' }, 'veril-e2e-roles');
const auth = getAuth(app);
const firestore = getFirestore(app);
const runId = randomUUID().slice(0, 8);

const accounts = {
  keeper: {
    uid: `e2e-role-keeper-${runId}`,
    email: `e2e-keeper-${runId}@example.test`,
  },
  viewer: {
    uid: `e2e-role-viewer-${runId}`,
    email: `e2e-viewer-${runId}@example.test`,
  },
  editorial: {
    uid: `e2e-role-editorial-${runId}`,
    email: `e2e-editorial-${runId}@example.test`,
  },
  regular: {
    uid: `e2e-role-regular-${runId}`,
    email: `e2e-regular-${runId}@example.test`,
  },
};
const password = 'e2e-role-password';
const aquariumId = '123e4567-e89b-42d3-a456-426614174099';
const secondaryAquariumId = '123e4567-e89b-42d3-a456-426614174100';
const invitationCode = randomUUID();
const keeperInvitationCode = randomUUID();

async function ensureAccount(account) {
  try {
    await auth.updateUser(account.uid, {
      email: account.email,
      password,
      emailVerified: true,
      disabled: false,
    });
  } catch {
    await auth.createUser({
      uid: account.uid,
      email: account.email,
      password,
      emailVerified: true,
    });
  }
}

await Promise.all(Object.values(accounts).map(ensureAccount));
await auth.setCustomUserClaims(accounts.keeper.uid, { isKeeper: true });
await auth.setCustomUserClaims(accounts.editorial.uid, {
  editorialAdmin: true,
  isKeeper: true,
});
await auth.setCustomUserClaims(accounts.regular.uid, {});
await auth.setCustomUserClaims(accounts.viewer.uid, {});

const aquariumReference = firestore.collection('aquariums').doc(aquariumId);
await aquariumReference.set({
  ownerId: accounts.keeper.uid,
  name: 'E2E Pagination Aquarium',
  establishedBy: accounts.keeper.uid,
  establishedAt: Timestamp.fromDate(new Date('2026-08-17T10:00:00.000Z')),
  timeZone: 'Atlantic/Canary',
});
await firestore
  .collection('aquariums')
  .doc(secondaryAquariumId)
  .set({
    ownerId: accounts.editorial.uid,
    name: 'E2E Shared Aquarium',
    establishedBy: accounts.editorial.uid,
    establishedAt: Timestamp.fromDate(new Date('2026-08-17T10:00:00.000Z')),
    timeZone: 'Atlantic/Canary',
  });

const existingMeasurements = await firestore
  .collection('measurements')
  .where('aquariumId', '==', aquariumId)
  .get();
const cleanup = firestore.batch();
for (const document of existingMeasurements.docs) cleanup.delete(document.ref);
await cleanup.commit();

async function clearAquariumCollection(collectionName) {
  const snapshot = await firestore
    .collection(collectionName)
    .where('aquariumId', '==', aquariumId)
    .get();
  if (snapshot.empty) return;
  const batch = firestore.batch();
  for (const document of snapshot.docs) batch.delete(document.ref);
  await batch.commit();
}

await Promise.all(
  ['observations', 'careWorks', 'livestock', 'equipment', 'waterChanges'].map(
    clearAquariumCollection,
  ),
);

let batch = firestore.batch();
for (let index = 0; index < 55; index += 1) {
  const measuredAt = new Date(Date.UTC(2026, 7, 17, 10, index));
  batch.set(firestore.collection('measurements').doc(randomUUID()), {
    aquariumId,
    ownerId: accounts.keeper.uid,
    parameterId: 'temperature',
    enteredValue: 20 + index / 10,
    enteredUnit: 'celsius',
    canonicalValue: 20 + index / 10,
    canonicalUnit: 'celsius',
    measuredAt: Timestamp.fromDate(measuredAt),
    recordedAt: Timestamp.fromDate(measuredAt),
    provenance: 'manual',
  });
  if ((index + 1) % 400 === 0) {
    await batch.commit();
    batch = firestore.batch();
  }
}
await batch.commit();

const recordedAt = Timestamp.fromDate(new Date('2026-08-17T11:00:00.000Z'));
await firestore.collection('observations').doc(randomUUID()).set({
  aquariumId,
  ownerId: accounts.keeper.uid,
  content: 'E2E observation',
  recordedAt,
});
await firestore.collection('careWorks').doc(randomUUID()).set({
  aquariumId,
  ownerId: accounts.keeper.uid,
  description: 'E2E care work',
  performedAt: recordedAt,
  recordedAt,
  provenance: 'manual',
});
await firestore
  .collection('livestock')
  .doc(randomUUID())
  .set({
    aquariumId,
    ownerId: accounts.keeper.uid,
    speciesProfileId: 'e2e-species-profile',
    category: 'fish',
    representation: 'individual',
    displayName: 'E2E clownfish',
    lifecycle: 'active',
    associatedAt: recordedAt,
    updatedAt: recordedAt,
    associationHistory: [{ aquariumId, associatedAt: recordedAt }],
  });
await firestore
  .collection('equipment')
  .doc(randomUUID())
  .set({
    aquariumId,
    ownerId: accounts.keeper.uid,
    category: 'filtration',
    name: 'E2E skimmer',
    lifecycle: 'active',
    associatedAt: recordedAt,
    updatedAt: recordedAt,
    associationHistory: [{ aquariumId, associatedAt: recordedAt }],
  });
await firestore.collection('waterChanges').doc(randomUUID()).set({
  aquariumId,
  ownerId: accounts.keeper.uid,
  volumeLitres: 12.5,
  performedAt: recordedAt,
  recordedAt,
  notes: 'E2E water change',
  provenance: 'manual',
});

await firestore
  .collection('aquariumAccessInvitations')
  .doc(invitationCode)
  .set({
    aquariumId,
    ownerId: accounts.keeper.uid,
    permissions: { aquarium: true },
    status: 'active',
    createdAt: Timestamp.fromDate(new Date('2026-08-17T10:00:00.000Z')),
    expiresAt: Timestamp.fromDate(new Date('2026-08-24T10:00:00.000Z')),
  });
await firestore
  .collection('aquariumAccessInvitations')
  .doc(keeperInvitationCode)
  .set({
    aquariumId: secondaryAquariumId,
    ownerId: accounts.editorial.uid,
    permissions: { aquarium: true },
    status: 'active',
    createdAt: Timestamp.fromDate(new Date('2026-08-17T10:00:00.000Z')),
    expiresAt: Timestamp.fromDate(new Date('2026-08-24T10:00:00.000Z')),
  });

console.log(
  JSON.stringify({
    password,
    aquariumId,
    secondaryAquariumId,
    invitationCode,
    keeperInvitationCode,
    accounts: Object.fromEntries(
      Object.entries(accounts).map(([role, account]) => [role, account.email]),
    ),
    accountIds: Object.fromEntries(
      Object.entries(accounts).map(([role, account]) => [role, account.uid]),
    ),
  }),
);
