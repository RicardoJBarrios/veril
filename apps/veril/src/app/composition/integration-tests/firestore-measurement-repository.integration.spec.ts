// @vitest-environment node

import { signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { describe, expect, it } from 'vitest';
import {
  AquariumName,
  createAquariumId,
} from '../../shared/domain/aquarium-reference';
import {
  createMeasurementId,
  measurementIdFrom,
} from '../../measurements/domain/measurement';
import { getFirebaseClient } from '../../shared/infrastructure/firebase-client';
import { FirebaseKeeperSession } from '../../shared/infrastructure/firebase-keeper-session';
import { signInAsKeeper } from '../../shared/infrastructure/fixtures/keeper-accounts';
import { FirestoreAquariumRepository } from '../../aquarium-management/infrastructure/firestore-aquarium-repository';
import { FirestoreMeasurementRepository } from '../../measurements/infrastructure/firestore-measurement-repository';

const emulatorTest =
  process.env['FIRESTORE_EMULATOR_HOST'] &&
  process.env['FIREBASE_AUTH_EMULATOR_HOST']
    ? it
    : it.skip;

describe('FirestoreMeasurementRepository (Emulator Suite)', () => {
  emulatorTest(
    'returns the canonical latest Measurement for a Parameter',
    async () => {
      await signInAsKeeper();
      const session = new FirebaseKeeperSession();
      const keeper = await session.requireAuthenticatedKeeper();
      const aquarium = await new FirestoreAquariumRepository().establish({
        id: createAquariumId(),
        name: AquariumName.create('Actuales'),
        ownerKeeperId: keeper.id,
        establishedAt: new Date('2026-08-08T09:00:00.000Z'),
      });
      const repository = new FirestoreMeasurementRepository();
      const olderId = measurementIdFrom('123e4567-e89b-42d3-a456-426614174010');
      const latestId = measurementIdFrom(
        '123e4567-e89b-42d3-a456-426614174011',
      );
      const retrospectivelyRecordedId = measurementIdFrom(
        '123e4567-e89b-42d3-a456-426614174012',
      );

      await repository.record({
        id: olderId,
        aquariumId: aquarium.id,
        ownerKeeperId: keeper.id,
        parameterId: 'temperature',
        enteredValue: 23,
        enteredUnit: 'celsius',
        canonicalValue: 23,
        canonicalUnit: 'celsius',
        measuredAt: new Date('2026-08-08T09:01:00.000Z'),
        recordedAt: new Date('2026-08-08T09:02:00.000Z'),
        provenance: 'manual',
      });
      await repository.record({
        id: latestId,
        aquariumId: aquarium.id,
        ownerKeeperId: keeper.id,
        parameterId: 'temperature',
        enteredValue: 25.4,
        enteredUnit: 'celsius',
        canonicalValue: 25.4,
        canonicalUnit: 'celsius',
        measuredAt: new Date('2026-08-08T09:03:00.000Z'),
        recordedAt: new Date('2026-08-08T09:04:00.000Z'),
        provenance: 'manual',
      });
      await repository.record({
        id: retrospectivelyRecordedId,
        aquariumId: aquarium.id,
        ownerKeeperId: keeper.id,
        parameterId: 'temperature',
        enteredValue: 24,
        enteredUnit: 'celsius',
        canonicalValue: 24,
        canonicalUnit: 'celsius',
        measuredAt: new Date('2026-08-08T09:00:00.000Z'),
        recordedAt: new Date('2026-08-08T09:05:00.000Z'),
        provenance: 'manual',
      });

      await expect(
        repository.findCurrentOwned(keeper.id, aquarium.id, 'temperature'),
      ).resolves.toMatchObject({ id: latestId, canonicalValue: 25.4 });
      await expect(
        repository.findCurrentOwned(keeper.id, aquarium.id, 'salinity'),
      ).resolves.toBeNull();

      const { auth } = getFirebaseClient();
      await signOut(auth);
    },
    20000,
  );

  emulatorTest(
    'creates one append-only correction and resolves it as current',
    async () => {
      await signInAsKeeper();
      const session = new FirebaseKeeperSession();
      const keeper = await session.requireAuthenticatedKeeper();
      const aquarium = await new FirestoreAquariumRepository().establish({
        id: createAquariumId(),
        name: AquariumName.create('Correcciones'),
        ownerKeeperId: keeper.id,
        establishedAt: new Date('2026-08-17T10:00:00.000Z'),
      });
      const repository = new FirestoreMeasurementRepository();
      const originalId = measurementIdFrom(
        '123e4567-e89b-42d3-a456-426614174020',
      );
      await repository.record({
        id: originalId,
        aquariumId: aquarium.id,
        ownerKeeperId: keeper.id,
        parameterId: 'temperature',
        enteredValue: 23,
        enteredUnit: 'celsius',
        canonicalValue: 23,
        canonicalUnit: 'celsius',
        measuredAt: new Date('2026-08-17T10:01:00.000Z'),
        recordedAt: new Date('2026-08-17T10:02:00.000Z'),
        provenance: 'manual',
      });

      const replacementId = measurementIdFrom(
        '123e4567-e89b-42d3-a456-426614174021',
      );
      const replacement = await repository.correct({
        id: replacementId,
        aquariumId: aquarium.id,
        ownerKeeperId: keeper.id,
        parameterId: 'temperature',
        enteredValue: 24.5,
        enteredUnit: 'celsius',
        canonicalValue: 24.5,
        canonicalUnit: 'celsius',
        measuredAt: new Date('2026-08-17T10:01:00.000Z'),
        recordedAt: new Date('2026-08-17T10:03:00.000Z'),
        provenance: 'manual',
        correctsMeasurementId: originalId,
      });

      expect(replacement.correctsMeasurementId).toBe(originalId);
      await expect(
        repository.findCurrentOwned(keeper.id, aquarium.id, 'temperature'),
      ).resolves.toMatchObject({ id: replacementId, canonicalValue: 24.5 });
      await expect(
        repository.correct({
          id: createMeasurementId(),
          aquariumId: aquarium.id,
          ownerKeeperId: keeper.id,
          parameterId: 'temperature',
          enteredValue: 25,
          enteredUnit: 'celsius',
          canonicalValue: 25,
          canonicalUnit: 'celsius',
          measuredAt: new Date('2026-08-17T10:01:00.000Z'),
          recordedAt: new Date('2026-08-17T10:04:00.000Z'),
          provenance: 'manual',
          correctsMeasurementId: originalId,
        }),
      ).rejects.toThrow('already been corrected');

      const { firestore } = getFirebaseClient();
      const originalSnapshot = await getDoc(
        doc(firestore, 'measurements', originalId),
      );
      expect(originalSnapshot.data()).toMatchObject({ canonicalValue: 23 });
      await signOut(getFirebaseClient().auth);
    },
    20000,
  );

  emulatorTest(
    'persists independent manual measurements for the owner Aquarium',
    async () => {
      await signInAsKeeper();
      const session = new FirebaseKeeperSession();
      const keeper = await session.requireAuthenticatedKeeper();
      const aquarium = await new FirestoreAquariumRepository().establish({
        id: createAquariumId(),
        name: AquariumName.create('Veril'),
        ownerKeeperId: keeper.id,
        establishedAt: new Date('2026-08-08T10:00:00.000Z'),
      });
      const measuredAt = new Date('2026-08-08T10:02:00.000Z');
      const firstId = createMeasurementId();
      const secondId = createMeasurementId();
      const repository = new FirestoreMeasurementRepository();

      const first = await repository.record({
        id: firstId,
        aquariumId: aquarium.id,
        ownerKeeperId: keeper.id,
        parameterId: 'temperature',
        enteredValue: 23.5,
        enteredUnit: 'celsius',
        canonicalValue: 23.5,
        canonicalUnit: 'celsius',
        measuredAt,
        recordedAt: new Date('2026-08-08T10:05:00.000Z'),
        provenance: 'manual',
      });
      const second = await repository.record({
        id: secondId,
        aquariumId: aquarium.id,
        ownerKeeperId: keeper.id,
        parameterId: 'salinity',
        enteredValue: 35,
        enteredUnit: 'parts-per-thousand',
        canonicalValue: 35,
        canonicalUnit: 'parts-per-thousand',
        measuredAt,
        recordedAt: new Date('2026-08-08T10:06:00.000Z'),
        provenance: 'manual',
      });

      const { auth, firestore } = getFirebaseClient();
      const firstStored = await getDoc(
        doc(firestore, 'measurements', first.id),
      );
      const secondStored = await getDoc(
        doc(firestore, 'measurements', second.id),
      );

      expect(first).toMatchObject({
        id: firstId,
        aquariumId: aquarium.id,
        parameterId: 'temperature',
        canonicalUnit: 'celsius',
        measuredAt,
        provenance: 'manual',
      });
      expect(second).toMatchObject({
        id: secondId,
        aquariumId: aquarium.id,
        parameterId: 'salinity',
        canonicalUnit: 'parts-per-thousand',
      });
      expect(firstStored.exists()).toBe(true);
      expect(secondStored.exists()).toBe(true);
      expect(firstStored.data()).toMatchObject({
        ownerId: keeper.id,
        parameterId: 'temperature',
        enteredValue: 23.5,
        enteredUnit: 'celsius',
        canonicalValue: 23.5,
        canonicalUnit: 'celsius',
        provenance: 'manual',
      });
      expect(firstStored.data()?.['measuredAt'].toDate()).toEqual(measuredAt);
      expect(firstStored.data()?.['recordedAt'].toDate()).toEqual(
        new Date('2026-08-08T10:05:00.000Z'),
      );
      expect(secondStored.data()).toMatchObject({
        ownerId: keeper.id,
        parameterId: 'salinity',
        enteredValue: 35,
        canonicalUnit: 'parts-per-thousand',
      });

      const listed = await repository.listOwned(keeper.id, aquarium.id);
      expect(listed.items).toHaveLength(2);
      expect(listed.items.map((item) => item.parameterId)).toEqual([
        'salinity',
        'temperature',
      ]);
      expect(listed.items[0]).toMatchObject({
        canonicalValue: 35,
        canonicalUnit: 'parts-per-thousand',
        measuredAt,
        recordedAt: new Date('2026-08-08T10:06:00.000Z'),
      });

      await signOut(auth);
    },
    20000,
  );

  emulatorTest(
    'orders equal timestamps by MeasurementId and resumes without duplicates',
    async () => {
      await signInAsKeeper();
      const session = new FirebaseKeeperSession();
      const keeper = await session.requireAuthenticatedKeeper();
      const aquarium = await new FirestoreAquariumRepository().establish({
        id: createAquariumId(),
        name: AquariumName.create('Ordenación'),
        ownerKeeperId: keeper.id,
        establishedAt: new Date('2026-08-08T11:00:00.000Z'),
      });
      const repository = new FirestoreMeasurementRepository();
      const otherAquarium = await new FirestoreAquariumRepository().establish({
        id: createAquariumId(),
        name: AquariumName.create('Otro acuario'),
        ownerKeeperId: keeper.id,
        establishedAt: new Date('2026-08-08T11:01:00.000Z'),
      });
      const ids = Array.from({ length: 21 }, (_, index) =>
        measurementIdFrom(
          `123e4567-e89b-42d3-a456-426614175${index
            .toString()
            .padStart(3, '0')}`,
        ),
      );
      const measuredAt = new Date('2026-08-08T11:10:00.000Z');
      const recordedAt = new Date('2026-08-08T11:11:00.000Z');

      await repository.record({
        id: createMeasurementId(),
        aquariumId: otherAquarium.id,
        ownerKeeperId: keeper.id,
        parameterId: 'temperature',
        enteredValue: 19,
        enteredUnit: 'celsius',
        canonicalValue: 19,
        canonicalUnit: 'celsius',
        measuredAt,
        recordedAt,
        provenance: 'manual',
      });

      for (const id of ids) {
        await repository.record({
          id,
          aquariumId: aquarium.id,
          ownerKeeperId: keeper.id,
          parameterId: 'temperature',
          enteredValue: 23,
          enteredUnit: 'celsius',
          canonicalValue: 23,
          canonicalUnit: 'celsius',
          measuredAt,
          recordedAt,
          provenance: 'manual',
        });
      }

      const firstPage = await repository.listOwned(keeper.id, aquarium.id);
      const secondPage = await repository.listOwned(
        keeper.id,
        aquarium.id,
        firstPage.nextCursor,
      );
      const listedIds = [...firstPage.items, ...secondPage.items].map(
        (item) => item.id,
      );

      expect(firstPage.items).toHaveLength(20);
      expect(secondPage.items).toHaveLength(1);
      expect(listedIds).toEqual(ids);
      expect(new Set(listedIds).size).toBe(21);

      const { auth } = getFirebaseClient();
      await signOut(auth);
    },
    30000,
  );

  emulatorTest(
    'returns a bounded recent Measurement source page',
    async () => {
      await signInAsKeeper();
      const session = new FirebaseKeeperSession();
      const keeper = await session.requireAuthenticatedKeeper();
      const aquarium = await new FirestoreAquariumRepository().establish({
        id: createAquariumId(),
        name: AquariumName.create('Actividad reciente'),
        ownerKeeperId: keeper.id,
        establishedAt: new Date('2026-08-08T13:00:00.000Z'),
      });
      const repository = new FirestoreMeasurementRepository();

      await repository.record({
        id: createMeasurementId(),
        aquariumId: aquarium.id,
        ownerKeeperId: keeper.id,
        parameterId: 'temperature',
        enteredValue: 24,
        enteredUnit: 'celsius',
        canonicalValue: 24,
        canonicalUnit: 'celsius',
        measuredAt: new Date('2026-08-08T13:02:00.000Z'),
        recordedAt: new Date('2026-08-08T13:03:00.000Z'),
        provenance: 'manual',
      });
      await repository.record({
        id: createMeasurementId(),
        aquariumId: aquarium.id,
        ownerKeeperId: keeper.id,
        parameterId: 'temperature',
        enteredValue: 23,
        enteredUnit: 'celsius',
        canonicalValue: 23,
        canonicalUnit: 'celsius',
        measuredAt: new Date('2026-08-08T13:01:00.000Z'),
        recordedAt: new Date('2026-08-08T13:02:00.000Z'),
        provenance: 'manual',
      });

      const items = await repository.listRecentOwned(keeper.id, aquarium.id, 1);

      expect(items).toHaveLength(1);
      expect(items[0]?.canonicalValue).toBe(24);

      const { auth } = getFirebaseClient();
      await signOut(auth);
    },
    20000,
  );
});
