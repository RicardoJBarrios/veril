// @vitest-environment node
import { signOut } from 'firebase/auth';
import { describe, expect, it } from 'vitest';
import { EstablishAquarium } from '../../aquarium-management/application/establish-aquarium';
import { FirestoreAquariumRepository } from '../../aquarium-management/infrastructure/firestore-aquarium-repository';
import { ActiveAquariumContext } from '../../shared/application/active-aquarium-context';
import { ActiveAquariumContextStorage } from '../../shared/application/active-aquarium-context-storage';
import { getFirebaseClient } from '../../shared/infrastructure/firebase-client';
import { FirebaseKeeperSession } from '../../shared/infrastructure/firebase-keeper-session';
import { signInAsKeeper } from '../../shared/infrastructure/fixtures/keeper-accounts';
import { ListWaterChanges } from '../../maintenance/application/list-water-changes';
import { RecordWaterChange } from '../../maintenance/application/record-water-change';
import { FirestoreWaterChangeRepository } from '../../maintenance/infrastructure/firestore-water-change-repository';

const emulatorTest =
  process.env['FIRESTORE_EMULATOR_HOST'] &&
  process.env['FIREBASE_AUTH_EMULATOR_HOST']
    ? it
    : it.skip;

const storage: ActiveAquariumContextStorage = {
  load: () => null,
  save: () => undefined,
  clear: () => undefined,
};

describe('Water Change composition (Emulator Suite)', () => {
  emulatorTest(
    'completes recording and paginated listing',
    async () => {
      await signInAsKeeper();
      const session = new FirebaseKeeperSession();
      const aquarium = await new EstablishAquarium(
        new FirestoreAquariumRepository(),
        session,
      ).execute('Maintenance aquarium');
      const context = new ActiveAquariumContext(storage);
      context.select(aquarium.id);
      const repository = new FirestoreWaterChangeRepository();
      const clock = { now: () => new Date('2026-08-17T11:00:00.000Z') };

      await new RecordWaterChange(repository, session, context, clock).execute(
        15,
        new Date('2026-08-17T10:00:00.000Z'),
        'Cambio parcial',
      );

      const keeper = await session.requireAuthenticatedKeeper();
      const page = await new ListWaterChanges(
        repository,
        session,
        context,
      ).execute(undefined, 10);
      expect(page.items).toHaveLength(1);
      expect(page.items[0]).toMatchObject({
        volumeLitres: 15,
        notes: 'Cambio parcial',
      });
      expect(keeper.id).toBeTruthy();
      await signOut(getFirebaseClient().auth);
    },
    20000,
  );
});
