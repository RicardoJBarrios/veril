import { Injectable } from '@angular/core';
import {
  Timestamp,
  collection,
  doc,
  documentId,
  orderBy,
  query,
  setDoc,
  where,
} from 'firebase/firestore';
import { z } from 'zod';
import {
  AquariumId,
  aquariumIdFrom,
} from '../../shared/domain/aquarium-reference';
import { getFirebaseClient } from '../../shared/infrastructure/firebase-client';
import { readFirestorePage } from '../../shared/infrastructure/firestore-page';
import {
  createWaterChange,
  waterChangeIdFrom,
  WaterChange,
} from '../domain/water-change';
import {
  RecordWaterChangeInput,
  WaterChangeCursor,
  WaterChangeListItem,
  WaterChangePage,
  WaterChangeReader,
  WaterChangeWriter,
} from '../application/ports';

const cursorSchema = z.object({
  performedAt: z.string(),
  recordedAt: z.string(),
  waterChangeId: z.string(),
});

export const waterChangeDocument = z.object({
  aquariumId: z.string().min(1),
  ownerId: z.string().min(1),
  volumeLitres: z.number().positive(),
  performedAt: z.instanceof(Timestamp),
  recordedAt: z.instanceof(Timestamp),
  notes: z.string().max(1000).optional(),
  provenance: z.literal('manual'),
});

function encodeCursor(item: WaterChangeListItem): WaterChangeCursor {
  return encodeURIComponent(
    JSON.stringify({
      performedAt: item.performedAt.toISOString(),
      recordedAt: item.recordedAt.toISOString(),
      waterChangeId: item.id,
    }),
  ) as WaterChangeCursor;
}

function decodeCursor(cursor: WaterChangeCursor) {
  const value = cursorSchema.parse(JSON.parse(decodeURIComponent(cursor)));
  const performedAt = new Date(value.performedAt);
  const recordedAt = new Date(value.recordedAt);
  if (
    Number.isNaN(performedAt.getTime()) ||
    Number.isNaN(recordedAt.getTime())
  ) {
    throw new Error('Water Change cursor contains invalid dates');
  }
  return { performedAt, recordedAt, waterChangeId: value.waterChangeId };
}

function toDomain(id: string, data: z.infer<typeof waterChangeDocument>) {
  return createWaterChange({
    id: waterChangeIdFrom(id),
    aquariumId: aquariumIdFrom(data.aquariumId),
    volumeLitres: data.volumeLitres,
    performedAt: data.performedAt.toDate(),
    recordedAt: data.recordedAt.toDate(),
    notes: data.notes,
    provenance: data.provenance,
  });
}

@Injectable()
export class FirestoreWaterChangeRepository
  implements WaterChangeWriter, WaterChangeReader
{
  async record(input: RecordWaterChangeInput): Promise<WaterChange> {
    const { firestore } = getFirebaseClient();
    const reference = doc(firestore, 'waterChanges', input.id);
    const dto = waterChangeDocument.parse({
      aquariumId: input.aquariumId,
      ownerId: input.ownerKeeperId,
      volumeLitres: input.volumeLitres,
      performedAt: Timestamp.fromDate(input.performedAt),
      recordedAt: Timestamp.fromDate(input.recordedAt),
      ...(input.notes ? { notes: input.notes } : {}),
      provenance: input.provenance,
    });
    await setDoc(reference, dto);
    return toDomain(reference.id, dto);
  }

  async listRecentOwned(
    ownerKeeperId: string,
    aquariumId: AquariumId,
    cursor?: WaterChangeCursor,
    requestedPageSize?: number,
  ): Promise<WaterChangePage> {
    const { firestore } = getFirebaseClient();
    const waterChanges = collection(firestore, 'waterChanges');
    return readFirestorePage({
      baseQuery: query(
        waterChanges,
        where('ownerId', '==', ownerKeeperId),
        where('aquariumId', '==', aquariumId),
        orderBy('performedAt', 'desc'),
        orderBy('recordedAt', 'desc'),
        orderBy(documentId(), 'asc'),
      ),
      request:
        cursor || requestedPageSize
          ? { ...(cursor ? { cursor } : {}), pageSize: requestedPageSize }
          : undefined,
      decodeCursor: (value) => {
        const decoded = decodeCursor(value as WaterChangeCursor);
        return [decoded.performedAt, decoded.recordedAt, decoded.waterChangeId];
      },
      encodeCursor,
      map: (entry) => {
        const dto = waterChangeDocument.parse(entry.data());
        const item = toDomain(entry.id, dto);
        return {
          id: item.id,
          volumeLitres: item.volumeLitres,
          performedAt: item.performedAt,
          recordedAt: item.recordedAt,
          ...(item.notes ? { notes: item.notes } : {}),
        };
      },
    });
  }
}
