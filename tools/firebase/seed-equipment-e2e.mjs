import { randomUUID } from 'node:crypto';
import { getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

const app =
  getApps().find((candidate) => candidate.name === 'veril-equipment-e2e') ??
  initializeApp({ projectId: 'demo-veril' }, 'veril-equipment-e2e');
const auth = getAuth(app);
const firestore = getFirestore(app);
const runId = randomUUID().slice(0, 8);
const account = {
  uid: `e2e-equipment-${runId}`,
  email: `equipment-${runId}@example.test`,
  password: 'equipment-password',
};
try {
  await auth.updateUser(account.uid, {
    email: account.email,
    password: account.password,
    emailVerified: true,
    disabled: false,
  });
} catch {
  await auth.createUser({
    uid: account.uid,
    email: account.email,
    password: account.password,
    emailVerified: true,
  });
}
await auth.setCustomUserClaims(account.uid, { isKeeper: true });
const aquariumId = `123e4567-e89b-42d3-a456-${runId.padEnd(12, '0').slice(0, 12)}`;
const destinationAquariumId = `123e4567-e89b-42d3-a456-${randomUUID().replaceAll('-', '').slice(0, 12)}`;
await firestore
  .collection('aquariums')
  .doc(aquariumId)
  .set({
    ownerId: account.uid,
    name: 'Equipment Aquarium',
    establishedBy: account.uid,
    establishedAt: Timestamp.fromDate(new Date('2026-08-17T10:00:00.000Z')),
    timeZone: 'Atlantic/Canary',
  });
await firestore
  .collection('aquariums')
  .doc(destinationAquariumId)
  .set({
    ownerId: account.uid,
    name: 'Equipment Destination',
    establishedBy: account.uid,
    establishedAt: Timestamp.fromDate(new Date('2026-08-17T10:00:00.000Z')),
    timeZone: 'Atlantic/Canary',
  });
const recordedAt = Timestamp.fromDate(new Date('2026-08-17T11:00:00.000Z'));
console.log(
  JSON.stringify({
    credentials: { email: account.email, password: account.password },
    aquariumId,
    destinationAquariumId,
    recordedAt: recordedAt.toDate().toISOString(),
  }),
);
