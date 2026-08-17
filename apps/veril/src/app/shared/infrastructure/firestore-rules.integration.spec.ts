import { describe, expect, it } from 'vitest';
import { createAquariumId } from '../../shared/domain/aquarium-reference';
import { createIdToken, createKeeperIdToken } from './fixtures/keeper-accounts';

const emulatorTest =
  process.env['FIRESTORE_EMULATOR_HOST'] &&
  process.env['FIREBASE_AUTH_EMULATOR_HOST']
    ? it
    : it.skip;

async function createKeeper() {
  return createKeeperIdToken();
}

async function writeAquarium(
  id: string,
  ownerId: string,
  token: string,
  name: string,
) {
  return fetch(
    `http://127.0.0.1:8080/v1/projects/demo-veril/databases/(default)/documents/aquariums/${id}`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fields: {
          ownerId: { stringValue: ownerId },
          name: { stringValue: name },
          establishedBy: { stringValue: ownerId },
          establishedAt: { timestampValue: new Date().toISOString() },
        },
      }),
    },
  );
}

async function createAquariumInvitation(
  aquariumId: string,
  ownerId: string,
  invitationCode: string,
  ownerToken: string,
  permissions: Record<string, boolean>,
) {
  return fetch(
    `http://127.0.0.1:8080/v1/projects/demo-veril/databases/(default)/documents/aquariumAccessInvitations/${invitationCode}`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${ownerToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fields: {
          aquariumId: { stringValue: aquariumId },
          ownerId: { stringValue: ownerId },
          permissions: {
            mapValue: {
              fields: Object.fromEntries(
                Object.entries(permissions).map(([key, value]) => [
                  key,
                  { booleanValue: value },
                ]),
              ),
            },
          },
          status: { stringValue: 'active' },
          createdAt: { timestampValue: new Date().toISOString() },
          expiresAt: {
            timestampValue: new Date(
              Date.now() + 24 * 60 * 60 * 1000,
            ).toISOString(),
          },
        },
      }),
    },
  );
}

async function acceptAquariumInvitation(
  aquariumId: string,
  ownerId: string,
  granteeUserId: string,
  invitationCode: string,
  granteeToken: string,
  permissions: Record<string, boolean>,
) {
  const grantId = `${aquariumId}_${granteeUserId}`;
  return fetch(
    'http://127.0.0.1:8080/v1/projects/demo-veril/databases/(default)/documents:commit',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${granteeToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        writes: [
          {
            update: {
              name: `projects/demo-veril/databases/(default)/documents/aquariumAccessGrants/${grantId}`,
              fields: {
                aquariumId: { stringValue: aquariumId },
                ownerId: { stringValue: ownerId },
                granteeUserId: { stringValue: granteeUserId },
                invitationCode: { stringValue: invitationCode },
                permissions: {
                  mapValue: {
                    fields: Object.fromEntries(
                      Object.entries(permissions).map(([key, value]) => [
                        key,
                        { booleanValue: value },
                      ]),
                    ),
                  },
                },
                status: { stringValue: 'active' },
                createdAt: { timestampValue: new Date().toISOString() },
              },
            },
            currentDocument: { exists: false },
          },
          {
            update: {
              name: `projects/demo-veril/databases/(default)/documents/aquariumAccessInvitations/${invitationCode}`,
              fields: {
                status: { stringValue: 'consumed' },
                redeemedBy: { stringValue: granteeUserId },
                redeemedAt: { timestampValue: new Date().toISOString() },
              },
            },
            updateMask: {
              fieldPaths: ['status', 'redeemedBy', 'redeemedAt'],
            },
            currentDocument: { exists: true },
          },
        ],
      }),
    },
  );
}

async function revokeAquariumReadAccess(
  aquariumId: string,
  granteeUserId: string,
  ownerToken: string,
) {
  const grantId = `${aquariumId}_${granteeUserId}`;
  return fetch(
    `http://127.0.0.1:8080/v1/projects/demo-veril/databases/(default)/documents/aquariumAccessGrants/${grantId}?updateMask.fieldPaths=status&updateMask.fieldPaths=revokedAt`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${ownerToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fields: {
          status: { stringValue: 'revoked' },
          revokedAt: { timestampValue: new Date().toISOString() },
        },
      }),
    },
  );
}

async function updateAquarium(
  id: string,
  token: string | undefined,
  fields: Record<string, unknown>,
  updateMask = ['timeZone'],
) {
  const mask = updateMask
    .map((field) => `updateMask.fieldPaths=${encodeURIComponent(field)}`)
    .join('&');
  return fetch(
    `http://127.0.0.1:8080/v1/projects/demo-veril/databases/(default)/documents/aquariums/${id}?${mask}`,
    {
      method: 'PATCH',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fields }),
    },
  );
}

function targetFields(
  targets: Record<
    string,
    {
      readonly minimum: number;
      readonly maximum: number;
      readonly extra?: boolean;
    }
  >,
) {
  return {
    parameterTargets: {
      mapValue: {
        fields: Object.fromEntries(
          Object.entries(targets).map(([parameterId, target]) => [
            parameterId,
            {
              mapValue: {
                fields: {
                  minimum: { doubleValue: target.minimum },
                  maximum: { doubleValue: target.maximum },
                  ...(target.extra
                    ? { unexpected: { stringValue: 'no' } }
                    : {}),
                },
              },
            },
          ]),
        ),
      },
    },
  };
}

async function queryAquariums(ownerId: string, token?: string) {
  return fetch(
    'http://127.0.0.1:8080/v1/projects/demo-veril/databases/(default)/documents:runQuery',
    {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: 'aquariums' }],
          limit: 50,
          where: {
            fieldFilter: {
              field: { fieldPath: 'ownerId' },
              op: 'EQUAL',
              value: { stringValue: ownerId },
            },
          },
        },
      }),
    },
  );
}

async function queryObservations(
  aquariumId: string,
  ownerId: string,
  token?: string,
) {
  return fetch(
    'http://127.0.0.1:8080/v1/projects/demo-veril/databases/(default)/documents:runQuery',
    {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: 'observations' }],
          limit: 50,
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
          orderBy: [
            { field: { fieldPath: 'recordedAt' }, direction: 'DESCENDING' },
            { field: { fieldPath: '__name__' }, direction: 'ASCENDING' },
          ],
        },
      }),
    },
  );
}

async function writeObservation(
  id: string,
  aquariumId: string,
  ownerId: string,
  token?: string,
) {
  return fetch(
    `http://127.0.0.1:8080/v1/projects/demo-veril/databases/(default)/documents/observations/${id}`,
    {
      method: 'PATCH',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fields: {
          aquariumId: { stringValue: aquariumId },
          ownerId: { stringValue: ownerId },
          content: { stringValue: 'El coral está abierto' },
          recordedAt: { timestampValue: new Date().toISOString() },
        },
      }),
    },
  );
}

async function writeMeasurement(
  id: string,
  aquariumId: string,
  ownerId: string,
  token?: string,
  overrides: Record<string, unknown> = {},
) {
  const fields = {
    aquariumId: { stringValue: aquariumId },
    ownerId: { stringValue: ownerId },
    parameterId: { stringValue: 'temperature' },
    enteredValue: { doubleValue: 23.5 },
    enteredUnit: { stringValue: 'celsius' },
    canonicalValue: { doubleValue: 23.5 },
    canonicalUnit: { stringValue: 'celsius' },
    measuredAt: { timestampValue: new Date().toISOString() },
    recordedAt: { timestampValue: new Date().toISOString() },
    provenance: { stringValue: 'manual' },
    ...overrides,
  };

  return fetch(
    `http://127.0.0.1:8080/v1/projects/demo-veril/databases/(default)/documents/measurements/${id}`,
    {
      method: 'PATCH',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fields }),
    },
  );
}

async function queryMeasurements(
  aquariumId: string,
  ownerId: string,
  token?: string,
) {
  return fetch(
    'http://127.0.0.1:8080/v1/projects/demo-veril/databases/(default)/documents:runQuery',
    {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: 'measurements' }],
          limit: 50,
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
    },
  );
}

async function queryCurrentMeasurement(
  aquariumId: string,
  ownerId: string,
  token?: string,
) {
  return fetch(
    'http://127.0.0.1:8080/v1/projects/demo-veril/databases/(default)/documents:runQuery',
    {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: 'measurements' }],
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
                {
                  fieldFilter: {
                    field: { fieldPath: 'parameterId' },
                    op: 'EQUAL',
                    value: { stringValue: 'temperature' },
                  },
                },
              ],
            },
          },
          orderBy: [
            { field: { fieldPath: 'measuredAt' }, direction: 'DESCENDING' },
            { field: { fieldPath: 'recordedAt' }, direction: 'DESCENDING' },
            { field: { fieldPath: '__name__' }, direction: 'ASCENDING' },
          ],
          limit: 1,
        },
      }),
    },
  );
}

async function queryCareWorks(
  aquariumId: string,
  ownerId: string,
  token?: string,
) {
  return fetch(
    'http://127.0.0.1:8080/v1/projects/demo-veril/databases/(default)/documents:runQuery',
    {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: 'careWorks' }],
          limit: 50,
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
    },
  );
}

async function writeCareWork(
  id: string,
  aquariumId: string,
  ownerId: string,
  token?: string,
  overrides: Record<string, unknown> = {},
) {
  const fields = {
    aquariumId: { stringValue: aquariumId },
    ownerId: { stringValue: ownerId },
    description: { stringValue: 'Limpié la copa del skimmer' },
    performedAt: { timestampValue: new Date().toISOString() },
    recordedAt: { timestampValue: new Date().toISOString() },
    provenance: { stringValue: 'manual' },
    ...overrides,
  };

  return fetch(
    `http://127.0.0.1:8080/v1/projects/demo-veril/databases/(default)/documents/careWorks/${id}`,
    {
      method: 'PATCH',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fields }),
    },
  );
}

describe('Firestore Security Rules (Emulator Suite)', () => {
  emulatorTest(
    'allows selected read-only access and supports owner revocation',
    async () => {
      const owner = await createKeeper();
      const viewer = await createIdToken('aquarium-viewer');
      const aquariumId = createAquariumId();
      const observationId = createAquariumId();
      const measurementId = createAquariumId();

      expect(
        (
          await writeAquarium(
            aquariumId,
            owner.localId,
            owner.idToken,
            'Acuario compartido',
          )
        ).status,
      ).toBe(200);
      expect(
        (
          await createAquariumInvitation(
            aquariumId,
            owner.localId,
            'invite-measurements',
            owner.idToken,
            { aquarium: true, measurements: true },
          )
        ).status,
      ).toBe(200);
      expect(
        (
          await acceptAquariumInvitation(
            aquariumId,
            owner.localId,
            viewer.localId,
            'invite-measurements',
            viewer.idToken,
            { aquarium: true, measurements: true },
          )
        ).status,
      ).toBe(200);
      expect(
        (
          await writeObservation(
            observationId,
            aquariumId,
            owner.localId,
            owner.idToken,
          )
        ).status,
      ).toBe(200);
      expect(
        (
          await writeMeasurement(
            measurementId,
            aquariumId,
            owner.localId,
            owner.idToken,
          )
        ).status,
      ).toBe(200);

      const documentUrl = (collection: string, id: string) =>
        `http://127.0.0.1:8080/v1/projects/demo-veril/databases/(default)/documents/${collection}/${id}`;
      expect(
        (
          await fetch(documentUrl('aquariums', aquariumId), {
            headers: { Authorization: `Bearer ${viewer.idToken}` },
          })
        ).status,
      ).toBe(200);
      expect(
        (
          await fetch(documentUrl('measurements', measurementId), {
            headers: { Authorization: `Bearer ${viewer.idToken}` },
          })
        ).status,
      ).toBe(200);
      expect(
        (
          await writeMeasurement(
            createAquariumId(),
            aquariumId,
            viewer.localId,
            viewer.idToken,
            {
              correctsMeasurementId: { stringValue: measurementId },
            },
          )
        ).status,
      ).toBe(403);
      expect(
        (
          await fetch(documentUrl('measurementCorrections', measurementId), {
            method: 'PATCH',
            headers: {
              Authorization: `Bearer ${viewer.idToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              fields: {
                aquariumId: { stringValue: aquariumId },
                ownerId: { stringValue: viewer.localId },
                replacementMeasurementId: {
                  stringValue: createAquariumId(),
                },
                createdAt: { timestampValue: new Date().toISOString() },
              },
            }),
          })
        ).status,
      ).toBe(403);
      expect(
        (
          await fetch(documentUrl('observations', observationId), {
            headers: { Authorization: `Bearer ${viewer.idToken}` },
          })
        ).status,
      ).toBe(403);
      expect(
        (
          await fetch(
            'http://127.0.0.1:8080/v1/projects/demo-veril/databases/(default)/documents/aquariumAccessInvitations',
            { headers: { Authorization: `Bearer ${viewer.idToken}` } },
          )
        ).status,
      ).toBe(403);
      expect(
        (
          await writeAquarium(
            createAquariumId(),
            viewer.localId,
            viewer.idToken,
            'No puede escribir',
          )
        ).status,
      ).toBe(403);
      const secondViewer = await createIdToken('aquarium-viewer-second');
      expect(
        (
          await acceptAquariumInvitation(
            aquariumId,
            owner.localId,
            secondViewer.localId,
            'invite-measurements',
            secondViewer.idToken,
            { aquarium: true, measurements: true },
          )
        ).status,
      ).toBe(403);
      expect(
        (
          await revokeAquariumReadAccess(
            aquariumId,
            viewer.localId,
            owner.idToken,
          )
        ).status,
      ).toBe(200);
      expect(
        (
          await fetch(documentUrl('aquariums', aquariumId), {
            headers: { Authorization: `Bearer ${viewer.idToken}` },
          })
        ).status,
      ).toBe(403);
    },
  );

  emulatorTest(
    'denies Aquarium creation without the isKeeper claim',
    async () => {
      const user = await createIdToken('user-without-keeper-claim');

      expect(
        (
          await writeAquarium(
            createAquariumId(),
            user.localId,
            user.idToken,
            'No autorizado',
          )
        ).status,
      ).toBe(403);
    },
  );

  emulatorTest(
    'allow independent Aquariums and isolate owners',
    async () => {
      const keeperA = await createKeeper();
      const keeperB = await createKeeper();
      const aquariumA = createAquariumId();
      const aquariumB = createAquariumId();

      expect(
        (
          await writeAquarium(
            aquariumA,
            keeperA.localId,
            keeperA.idToken,
            'Acuario A',
          )
        ).status,
      ).toBe(200);

      const observationId = createAquariumId();
      expect(
        (
          await writeObservation(
            observationId,
            aquariumA,
            keeperA.localId,
            keeperA.idToken,
          )
        ).status,
      ).toBe(200);
      const ownerObservationRead = await fetch(
        `http://127.0.0.1:8080/v1/projects/demo-veril/databases/(default)/documents/observations/${observationId}`,
        { headers: { Authorization: `Bearer ${keeperA.idToken}` } },
      );
      expect(ownerObservationRead.status).toBe(200);

      const anonymousObservationRead = await fetch(
        `http://127.0.0.1:8080/v1/projects/demo-veril/databases/(default)/documents/observations/${observationId}`,
      );
      expect([401, 403]).toContain(anonymousObservationRead.status);

      const crossOwnerObservationRead = await fetch(
        `http://127.0.0.1:8080/v1/projects/demo-veril/databases/(default)/documents/observations/${observationId}`,
        { headers: { Authorization: `Bearer ${keeperB.idToken}` } },
      );
      expect(crossOwnerObservationRead.status).toBe(403);
      const ownerObservationQuery = await queryObservations(
        aquariumA,
        keeperA.localId,
        keeperA.idToken,
      );
      expect(ownerObservationQuery.status).toBe(200);
      expect(
        (await ownerObservationQuery.text()).match(/"document"/g),
      ).toHaveLength(1);
      expect(
        [401, 403].includes(
          (await queryObservations(aquariumA, keeperA.localId)).status,
        ),
      ).toBe(true);
      expect(
        (await queryObservations(aquariumA, keeperA.localId, keeperB.idToken))
          .status,
      ).toBe(403);
      expect(
        (await writeObservation(createAquariumId(), aquariumA, keeperA.localId))
          .status,
      ).toBe(403);
      expect(
        (
          await writeObservation(
            createAquariumId(),
            aquariumA,
            keeperB.localId,
            keeperB.idToken,
          )
        ).status,
      ).toBe(403);
      const measurementId = createAquariumId();
      expect(
        (
          await writeMeasurement(
            measurementId,
            aquariumA,
            keeperA.localId,
            keeperA.idToken,
          )
        ).status,
      ).toBe(200);
      const ownerMeasurementQuery = await queryMeasurements(
        aquariumA,
        keeperA.localId,
        keeperA.idToken,
      );
      expect(ownerMeasurementQuery.status).toBe(200);
      expect(
        (await ownerMeasurementQuery.text()).match(/"document"/g),
      ).toHaveLength(1);

      const ownerCurrentMeasurementQuery = await queryCurrentMeasurement(
        aquariumA,
        keeperA.localId,
        keeperA.idToken,
      );
      expect(ownerCurrentMeasurementQuery.status).toBe(200);
      expect(
        (await ownerCurrentMeasurementQuery.text()).match(/"document"/g),
      ).toHaveLength(1);

      const anonymousMeasurementQuery = await queryMeasurements(
        aquariumA,
        keeperA.localId,
      );
      expect([401, 403]).toContain(anonymousMeasurementQuery.status);

      const crossOwnerMeasurementQuery = await queryMeasurements(
        aquariumA,
        keeperA.localId,
        keeperB.idToken,
      );
      expect(crossOwnerMeasurementQuery.status).toBe(403);
      expect(
        [401, 403].includes(
          (await queryCurrentMeasurement(aquariumA, keeperA.localId)).status,
        ),
      ).toBe(true);
      expect(
        (
          await queryCurrentMeasurement(
            aquariumA,
            keeperA.localId,
            keeperB.idToken,
          )
        ).status,
      ).toBe(403);
      expect(
        (await writeMeasurement(createAquariumId(), aquariumA, keeperA.localId))
          .status,
      ).toBe(403);
      expect(
        (
          await writeMeasurement(
            createAquariumId(),
            aquariumA,
            keeperB.localId,
            keeperB.idToken,
          )
        ).status,
      ).toBe(403);
      expect(
        (
          await writeMeasurement(
            createAquariumId(),
            aquariumA,
            keeperA.localId,
            keeperA.idToken,
            { ownerId: { stringValue: keeperB.localId } },
          )
        ).status,
      ).toBe(403);
      expect(
        (
          await writeMeasurement(
            createAquariumId(),
            aquariumA,
            keeperA.localId,
            keeperA.idToken,
            {
              parameterId: { stringValue: 'temperature' },
              enteredValue: { stringValue: 'bad' },
            },
          )
        ).status,
      ).toBe(403);
      const careWorkId = createAquariumId();
      expect(
        (
          await writeCareWork(
            careWorkId,
            aquariumA,
            keeperA.localId,
            keeperA.idToken,
          )
        ).status,
      ).toBe(200);
      const ownerCareWorkRead = await fetch(
        `http://127.0.0.1:8080/v1/projects/demo-veril/databases/(default)/documents/careWorks/${careWorkId}`,
        { headers: { Authorization: `Bearer ${keeperA.idToken}` } },
      );
      expect(ownerCareWorkRead.status).toBe(200);
      const ownerCareWorkQuery = await queryCareWorks(
        aquariumA,
        keeperA.localId,
        keeperA.idToken,
      );
      expect(ownerCareWorkQuery.status).toBe(200);
      expect(
        (await ownerCareWorkQuery.text()).match(/"document"/g),
      ).toHaveLength(1);
      expect(
        [401, 403].includes(
          (await queryCareWorks(aquariumA, keeperA.localId)).status,
        ),
      ).toBe(true);
      expect(
        (await queryCareWorks(aquariumA, keeperA.localId, keeperB.idToken))
          .status,
      ).toBe(403);
      const anonymousCareWorkRead = await fetch(
        `http://127.0.0.1:8080/v1/projects/demo-veril/databases/(default)/documents/careWorks/${careWorkId}`,
      );
      expect([401, 403]).toContain(anonymousCareWorkRead.status);
      const crossOwnerCareWorkRead = await fetch(
        `http://127.0.0.1:8080/v1/projects/demo-veril/databases/(default)/documents/careWorks/${careWorkId}`,
        { headers: { Authorization: `Bearer ${keeperB.idToken}` } },
      );
      expect(crossOwnerCareWorkRead.status).toBe(403);
      expect(
        (await writeCareWork(createAquariumId(), aquariumA, keeperA.localId))
          .status,
      ).toBe(403);
      expect(
        (
          await writeCareWork(
            createAquariumId(),
            aquariumA,
            keeperB.localId,
            keeperB.idToken,
          )
        ).status,
      ).toBe(403);
      expect(
        (
          await writeCareWork(
            createAquariumId(),
            aquariumA,
            keeperA.localId,
            keeperA.idToken,
            { ownerId: { stringValue: keeperB.localId } },
          )
        ).status,
      ).toBe(403);
      expect(
        (
          await writeAquarium(
            aquariumB,
            keeperA.localId,
            keeperA.idToken,
            'Acuario B',
          )
        ).status,
      ).toBe(200);

      const ownerQuery = await queryAquariums(keeperA.localId, keeperA.idToken);
      expect(ownerQuery.status).toBe(200);
      const ownerQueryBody = await ownerQuery.text();
      expect(ownerQueryBody.match(/"document"/g)).toHaveLength(2);

      const ownerRead = await fetch(
        `http://127.0.0.1:8080/v1/projects/demo-veril/databases/(default)/documents/aquariums/${aquariumA}`,
        { headers: { Authorization: `Bearer ${keeperA.idToken}` } },
      );
      expect(ownerRead.status).toBe(200);

      const anonymousRead = await fetch(
        `http://127.0.0.1:8080/v1/projects/demo-veril/databases/(default)/documents/aquariums/${aquariumA}`,
      );
      expect([401, 403]).toContain(anonymousRead.status);

      const anonymousQuery = await queryAquariums(keeperA.localId);
      expect([401, 403]).toContain(anonymousQuery.status);

      const privateRead = await fetch(
        `http://127.0.0.1:8080/v1/projects/demo-veril/databases/(default)/documents/aquariums/${aquariumA}`,
        { headers: { Authorization: `Bearer ${keeperB.idToken}` } },
      );

      expect(privateRead.status).toBe(403);

      const crossOwnerQuery = await queryAquariums(
        keeperB.localId,
        keeperA.idToken,
      );
      expect(crossOwnerQuery.status).toBe(403);

      const otherOwnerAquarium = createAquariumId();
      expect(
        (
          await writeAquarium(
            otherOwnerAquarium,
            keeperB.localId,
            keeperB.idToken,
            'Acuario de otro keeper',
          )
        ).status,
      ).toBe(200);

      expect(
        (
          await updateAquarium(aquariumA, keeperA.idToken, {
            timeZone: { stringValue: 'Atlantic/Canary' },
          })
        ).status,
      ).toBe(200);
      expect(
        [401, 403].includes(
          (
            await updateAquarium(aquariumB, undefined, {
              timeZone: { stringValue: 'Atlantic/Canary' },
            })
          ).status,
        ),
      ).toBe(true);
      expect(
        (
          await updateAquarium(aquariumA, keeperB.idToken, {
            timeZone: { stringValue: 'Europe/Madrid' },
          })
        ).status,
      ).toBe(403);
      expect(
        (
          await updateAquarium(otherOwnerAquarium, keeperA.idToken, {
            timeZone: { stringValue: 'Atlantic/Canary' },
          })
        ).status,
      ).toBe(403);
      expect(
        (
          await updateAquarium(aquariumA, keeperA.idToken, {
            timeZone: { stringValue: 'Europe/Madrid' },
          })
        ).status,
      ).toBe(403);
      expect(
        (
          await updateAquarium(
            aquariumA,
            keeperA.idToken,
            {
              timeZone: { stringValue: 'Atlantic/Canary' },
              name: { stringValue: 'Mutación no autorizada' },
            },
            ['timeZone', 'name'],
          )
        ).status,
      ).toBe(403);

      expect(
        (
          await updateAquarium(
            aquariumA,
            keeperA.idToken,
            targetFields({
              temperature: { minimum: 24, maximum: 25 },
            }),
            ['parameterTargets'],
          )
        ).status,
      ).toBe(200);
      expect(
        (
          await updateAquarium(
            aquariumA,
            keeperA.idToken,
            targetFields({
              temperature: { minimum: 24.5, maximum: 25.5 },
              salinity: { minimum: 34, maximum: 35 },
            }),
            ['parameterTargets'],
          )
        ).status,
      ).toBe(200);
      expect(
        (
          await updateAquarium(
            aquariumA,
            keeperA.idToken,
            targetFields({ salinity: { minimum: 34, maximum: 35 } }),
            ['parameterTargets'],
          )
        ).status,
      ).toBe(200);
      expect(
        [401, 403].includes(
          (
            await updateAquarium(
              aquariumA,
              undefined,
              targetFields({ temperature: { minimum: 24, maximum: 25 } }),
              ['parameterTargets'],
            )
          ).status,
        ),
      ).toBe(true);
      expect(
        (
          await updateAquarium(
            otherOwnerAquarium,
            keeperA.idToken,
            targetFields({ temperature: { minimum: 24, maximum: 25 } }),
            ['parameterTargets'],
          )
        ).status,
      ).toBe(403);
      expect(
        (
          await updateAquarium(
            aquariumA,
            keeperA.idToken,
            targetFields({ unknown: { minimum: 1, maximum: 2 } }),
            ['parameterTargets'],
          )
        ).status,
      ).toBe(403);
      expect(
        (
          await updateAquarium(
            aquariumA,
            keeperA.idToken,
            targetFields({ temperature: { minimum: -1, maximum: 2 } }),
            ['parameterTargets'],
          )
        ).status,
      ).toBe(403);
      expect(
        (
          await updateAquarium(
            aquariumA,
            keeperA.idToken,
            targetFields({ temperature: { minimum: 2, maximum: 1 } }),
            ['parameterTargets'],
          )
        ).status,
      ).toBe(403);
      expect(
        (
          await updateAquarium(
            aquariumA,
            keeperA.idToken,
            targetFields({
              temperature: { minimum: 1, maximum: 2, extra: true },
            }),
            ['parameterTargets'],
          )
        ).status,
      ).toBe(403);
      expect(
        (
          await updateAquarium(
            aquariumA,
            keeperA.idToken,
            {
              ...targetFields({ temperature: { minimum: 24, maximum: 25 } }),
              name: { stringValue: 'Mutación no autorizada' },
            },
            ['parameterTargets', 'name'],
          )
        ).status,
      ).toBe(403);

      expect(
        (
          await updateAquarium(
            aquariumB,
            undefined,
            {
              location: {
                mapValue: {
                  fields: {
                    latitude: { doubleValue: 28.12 },
                    longitude: { doubleValue: -16.46 },
                    displayName: { stringValue: 'Anónimo' },
                  },
                },
              },
            },
            ['location'],
          )
        ).status,
      ).toBe(403);
      expect(
        (
          await updateAquarium(
            aquariumB,
            keeperA.idToken,
            {
              location: {
                mapValue: {
                  fields: {
                    latitude: { doubleValue: 28.12 },
                    longitude: { doubleValue: -16.46 },
                    displayName: { stringValue: 'Santa Cruz, España' },
                  },
                },
              },
            },
            ['location'],
          )
        ).status,
      ).toBe(200);
      expect(
        (
          await updateAquarium(
            aquariumB,
            keeperB.idToken,
            {
              location: {
                mapValue: {
                  fields: {
                    latitude: { doubleValue: 28.12 },
                    longitude: { doubleValue: -16.46 },
                    displayName: { stringValue: 'No autorizado' },
                  },
                },
              },
            },
            ['location'],
          )
        ).status,
      ).toBe(403);
      expect(
        (
          await updateAquarium(
            otherOwnerAquarium,
            keeperB.idToken,
            {
              location: {
                mapValue: {
                  fields: {
                    latitude: { doubleValue: 91 },
                    longitude: { doubleValue: -16.46 },
                    displayName: { stringValue: 'Fuera de rango' },
                  },
                },
              },
            },
            ['location'],
          )
        ).status,
      ).toBe(403);
    },
    20000,
  );
});
