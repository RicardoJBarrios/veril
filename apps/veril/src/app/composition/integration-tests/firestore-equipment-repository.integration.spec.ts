// @vitest-environment node
import { signOut } from 'firebase/auth';
import { describe, expect, it } from 'vitest';
import { EstablishAquarium } from '../../aquarium-management/application/establish-aquarium';
import { FirestoreAquariumRepository } from '../../aquarium-management/infrastructure/firestore-aquarium-repository';
import { AddEquipment } from '../../equipment/application/add-equipment';
import { RetireEquipment } from '../../equipment/application/retire-equipment';
import { TransferEquipment } from '../../equipment/application/transfer-equipment';
import { FirestoreEquipmentRepository } from '../../equipment/infrastructure/firestore-equipment-repository';
import { ActiveAquariumContext } from '../../shared/application/active-aquarium-context';
import { ActiveAquariumContextStorage } from '../../shared/application/active-aquarium-context-storage';
import { getFirebaseClient } from '../../shared/infrastructure/firebase-client';
import { FirebaseKeeperSession } from '../../shared/infrastructure/firebase-keeper-session';
import { signInAsKeeper } from '../../shared/infrastructure/fixtures/keeper-accounts';

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
describe('Equipment composition (Emulator Suite)', () => {
  emulatorTest(
    'completes create, transfer and soft retirement',
    async () => {
      await signInAsKeeper();
      const session = new FirebaseKeeperSession();
      const keeper = await session.requireAuthenticatedKeeper();
      const aquariums = new FirestoreAquariumRepository();
      const origin = await new EstablishAquarium(aquariums, session).execute(
        'Equipment origen',
      );
      const destination = await new EstablishAquarium(
        aquariums,
        session,
      ).execute('Equipment destino');
      const context = new ActiveAquariumContext(storage);
      const repository = new FirestoreEquipmentRepository();
      context.select(origin.id);
      await new AddEquipment(repository, session, context).execute({
        name: 'Bomba',
        category: 'flow',
        manufacturer: 'Test',
      });
      const page = await repository.listActiveOwned(keeper.id, origin.id);
      expect(page.items).toHaveLength(1);
      await new TransferEquipment(repository, session, context).execute(
        page.items[0].id,
        destination.id,
      );
      const transferred = await repository.getOwned(
        keeper.id,
        page.items[0].id,
      );
      expect(transferred).toMatchObject({
        aquariumId: destination.id,
        lifecycle: 'active',
      });
      expect(transferred?.associationHistory).toHaveLength(2);
      context.select(destination.id);
      await new RetireEquipment(repository, session, context).execute(
        page.items[0].id,
      );
      expect(
        await repository.listActiveOwned(keeper.id, destination.id),
      ).toEqual({ items: [] });
      expect(
        await repository.getOwned(keeper.id, page.items[0].id),
      ).toMatchObject({ lifecycle: 'retired' });
      await signOut(getFirebaseClient().auth);
    },
    20000,
  );
});
