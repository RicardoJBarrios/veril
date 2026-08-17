import { describe, expect, it } from 'vitest';
import { createAquariumId } from '../../shared/domain/aquarium-reference';
import {
  createIdToken,
  createKeeperIdToken,
} from '../../shared/infrastructure/fixtures/keeper-accounts';

const emulatorTest =
  process.env['FIRESTORE_EMULATOR_HOST'] &&
  process.env['FIREBASE_AUTH_EMULATOR_HOST']
    ? it
    : it.skip;

const baseUrl =
  'http://127.0.0.1:8080/v1/projects/demo-veril/databases/(default)/documents';

async function writeDocument(
  collection: string,
  id: string,
  fields: Record<string, unknown>,
  token?: string,
): Promise<Response> {
  return fetch(`${baseUrl}/${collection}/${id}`, {
    method: 'PATCH',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ fields }),
  });
}

async function queryWaterChanges(
  aquariumId: string,
  ownerId: string,
  token?: string,
) {
  return fetch(`${baseUrl}:runQuery`, {
    method: 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: 'waterChanges' }],
        limit: 10,
        where: {
          compositeFilter: {
            op: 'AND',
            filters: [
              {
                fieldFilter: {
                  field: { fieldPath: 'aquariumId' },
                  op: 'EQUAL',
                  value: { stringValue: aquariumId },
                },
              },
              {
                fieldFilter: {
                  field: { fieldPath: 'ownerId' },
                  op: 'EQUAL',
                  value: { stringValue: ownerId },
                },
              },
            ],
          },
        },
      },
    }),
  });
}

describe('waterChanges Security Rules (Emulator Suite)', () => {
  emulatorTest(
    'enforces owner write and delegated read-only access',
    async () => {
      const owner = await createKeeperIdToken();
      const viewer = await createIdToken();
      const other = await createIdToken();
      const aquariumId = createAquariumId();
      const waterChangeId = createAquariumId();

      expect(
        (
          await writeDocument(
            'aquariums',
            aquariumId,
            {
              ownerId: { stringValue: owner.localId },
              name: { stringValue: 'Rules aquarium' },
              establishedBy: { stringValue: owner.localId },
              establishedAt: { timestampValue: new Date().toISOString() },
            },
            owner.idToken,
          )
        ).status,
      ).toBe(200);

      expect(
        (
          await writeDocument(
            'aquariumAccessGrants',
            `${aquariumId}_${viewer.localId}`,
            {
              aquariumId: { stringValue: aquariumId },
              ownerId: { stringValue: owner.localId },
              granteeUserId: { stringValue: viewer.localId },
              permissions: {
                mapValue: { fields: { waterChanges: { booleanValue: true } } },
              },
              status: { stringValue: 'active' },
              createdAt: { timestampValue: new Date().toISOString() },
            },
            owner.idToken,
          )
        ).status,
      ).toBe(200);

      expect(
        (
          await writeDocument(
            'waterChanges',
            waterChangeId,
            {
              aquariumId: { stringValue: aquariumId },
              ownerId: { stringValue: owner.localId },
              volumeLitres: { doubleValue: 12.5 },
              performedAt: { timestampValue: new Date().toISOString() },
              recordedAt: { timestampValue: new Date().toISOString() },
              provenance: { stringValue: 'manual' },
            },
            owner.idToken,
          )
        ).status,
      ).toBe(200);

      expect(
        (await queryWaterChanges(aquariumId, owner.localId, owner.idToken))
          .status,
      ).toBe(200);
      expect(
        (await queryWaterChanges(aquariumId, owner.localId, viewer.idToken))
          .status,
      ).toBe(200);
      expect([401, 403]).toContain(
        (await queryWaterChanges(aquariumId, owner.localId)).status,
      );
      expect(
        (await queryWaterChanges(aquariumId, owner.localId, other.idToken))
          .status,
      ).toBe(403);
      expect(
        (
          await writeDocument(
            'waterChanges',
            createAquariumId(),
            {
              aquariumId: { stringValue: aquariumId },
              ownerId: { stringValue: viewer.localId },
              volumeLitres: { doubleValue: 5 },
              performedAt: { timestampValue: new Date().toISOString() },
              recordedAt: { timestampValue: new Date().toISOString() },
              provenance: { stringValue: 'manual' },
            },
            viewer.idToken,
          )
        ).status,
      ).toBe(403);

      expect(
        (
          await fetch(`${baseUrl}/waterChanges/${waterChangeId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${viewer.idToken}` },
          })
        ).status,
      ).toBe(403);
    },
    20000,
  );
});
