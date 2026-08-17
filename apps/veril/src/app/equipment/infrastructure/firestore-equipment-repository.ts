import { Injectable } from '@angular/core';
import {
  Timestamp,
  collection,
  doc,
  documentId,
  getDoc,
  orderBy,
  query,
  runTransaction,
  setDoc,
  where,
} from 'firebase/firestore';
import { z } from 'zod';
import {
  AquariumId,
  aquariumIdFrom,
} from '../../shared/domain/aquarium-reference';
import { readFirestorePage } from '../../shared/infrastructure/firestore-page';
import { getFirebaseClient } from '../../shared/infrastructure/firebase-client';
import {
  CreateEquipmentInput,
  EquipmentCursor,
  EquipmentPage,
  EquipmentReader,
  EquipmentWriter,
} from '../application/ports';
import {
  Equipment,
  equipmentIdFrom,
  restoreEquipment,
  transferEquipment,
  retireEquipment,
} from '../domain/equipment';

const association = z.object({
  aquariumId: z.string().min(1),
  associatedAt: z.instanceof(Timestamp),
  endedAt: z.instanceof(Timestamp).optional(),
});
const documentSchema = z.object({
  aquariumId: z.string().min(1),
  ownerId: z.string().min(1),
  category: z.enum([
    'lighting',
    'filtration',
    'flow',
    'heating',
    'monitoring',
    'dosing',
    'other',
  ]),
  name: z.string().min(1).max(200),
  manufacturer: z.string().max(200).optional(),
  model: z.string().max(200).optional(),
  serialNumber: z.string().max(200).optional(),
  lifecycle: z.enum(['active', 'retired']),
  associatedAt: z.instanceof(Timestamp),
  updatedAt: z.instanceof(Timestamp),
  associationHistory: z.array(association).min(1),
});
const cursorSchema = z.object({ name: z.string(), equipmentId: z.string() });
function encodeCursor(item: Equipment): EquipmentCursor {
  return encodeURIComponent(
    JSON.stringify({ name: item.name, equipmentId: item.id }),
  ) as EquipmentCursor;
}
function decodeCursor(cursor: EquipmentCursor) {
  return cursorSchema.parse(JSON.parse(decodeURIComponent(cursor)));
}
function toDto(input: CreateEquipmentInput | Equipment, ownerId: string) {
  return documentSchema.parse({
    aquariumId: input.aquariumId,
    ownerId,
    category: input.category,
    name: input.name,
    ...(input.manufacturer ? { manufacturer: input.manufacturer } : {}),
    ...(input.model ? { model: input.model } : {}),
    ...(input.serialNumber ? { serialNumber: input.serialNumber } : {}),
    lifecycle: 'lifecycle' in input ? input.lifecycle : 'active',
    associatedAt: Timestamp.fromDate(input.associatedAt),
    updatedAt: Timestamp.fromDate(input.updatedAt),
    associationHistory: input.associationHistory.map((item) => ({
      aquariumId: item.aquariumId,
      associatedAt: Timestamp.fromDate(item.associatedAt),
      ...(item.endedAt ? { endedAt: Timestamp.fromDate(item.endedAt) } : {}),
    })),
  });
}
function fromDto(id: string, data: z.infer<typeof documentSchema>): Equipment {
  return restoreEquipment({
    id: equipmentIdFrom(id),
    aquariumId: aquariumIdFrom(data.aquariumId),
    category: data.category,
    name: data.name,
    ...(data.manufacturer ? { manufacturer: data.manufacturer } : {}),
    ...(data.model ? { model: data.model } : {}),
    ...(data.serialNumber ? { serialNumber: data.serialNumber } : {}),
    lifecycle: data.lifecycle,
    associatedAt: data.associatedAt.toDate(),
    updatedAt: data.updatedAt.toDate(),
    associationHistory: data.associationHistory.map((item) => ({
      aquariumId: aquariumIdFrom(item.aquariumId),
      associatedAt: item.associatedAt.toDate(),
      ...(item.endedAt ? { endedAt: item.endedAt.toDate() } : {}),
    })),
  });
}

@Injectable()
export class FirestoreEquipmentRepository
  implements EquipmentWriter, EquipmentReader
{
  async create(input: CreateEquipmentInput): Promise<Equipment> {
    const { firestore } = getFirebaseClient();
    const reference = doc(firestore, 'equipment', input.id);
    await setDoc(reference, toDto(input, input.ownerKeeperId));
    return this.read(reference.id);
  }
  private async read(id: string): Promise<Equipment> {
    const { firestore } = getFirebaseClient();
    const snapshot = await getDoc(doc(firestore, 'equipment', id));
    if (!snapshot.exists()) throw new Error('Equipment not found');
    return fromDto(snapshot.id, documentSchema.parse(snapshot.data()));
  }
  async getOwned(ownerKeeperId: string, id: string): Promise<Equipment | null> {
    const { firestore } = getFirebaseClient();
    const snapshot = await getDoc(doc(firestore, 'equipment', id));
    if (!snapshot.exists()) return null;
    const data = documentSchema.parse(snapshot.data());
    return data.ownerId === ownerKeeperId ? fromDto(snapshot.id, data) : null;
  }
  private list(
    ownerKeeperId: string,
    aquariumId: AquariumId,
    lifecycle: 'active' | 'retired' | undefined,
    cursor?: EquipmentCursor,
    requestedPageSize?: number,
  ): Promise<EquipmentPage> {
    const { firestore } = getFirebaseClient();
    return readFirestorePage({
      baseQuery: query(
        collection(firestore, 'equipment'),
        where('ownerId', '==', ownerKeeperId),
        where('aquariumId', '==', aquariumId),
        ...(lifecycle ? [where('lifecycle', '==', lifecycle)] : []),
        orderBy('name', 'asc'),
        orderBy(documentId(), 'asc'),
      ),
      request:
        cursor || requestedPageSize
          ? { ...(cursor ? { cursor } : {}), pageSize: requestedPageSize }
          : undefined,
      decodeCursor: (value) => {
        const decoded = decodeCursor(value as EquipmentCursor);
        return [decoded.name, decoded.equipmentId];
      },
      encodeCursor,
      map: (entry) => fromDto(entry.id, documentSchema.parse(entry.data())),
    });
  }
  listActiveOwned(
    ownerKeeperId: string,
    aquariumId: AquariumId,
    cursor?: EquipmentCursor,
    pageSize?: number,
  ) {
    return this.list(ownerKeeperId, aquariumId, 'active', cursor, pageSize);
  }
  listHistory(
    ownerKeeperId: string,
    aquariumId: AquariumId,
    cursor?: EquipmentCursor,
    pageSize?: number,
  ) {
    return this.list(ownerKeeperId, aquariumId, undefined, cursor, pageSize);
  }
  async update(input: {
    id: Equipment['id'];
    aquariumId: AquariumId;
    ownerKeeperId: string;
    equipment: Equipment;
  }): Promise<Equipment> {
    const current = await this.getOwned(input.ownerKeeperId, input.id);
    if (!current || current.aquariumId !== input.aquariumId)
      throw new Error('Equipment is not owned or not in the active Aquarium');
    await setDoc(
      doc(getFirebaseClient().firestore, 'equipment', input.id),
      toDto(input.equipment, input.ownerKeeperId),
    );
    return input.equipment;
  }
  async transfer(
    input: Parameters<EquipmentWriter['transfer']>[0],
  ): Promise<Equipment> {
    const { firestore } = getFirebaseClient();
    const reference = doc(firestore, 'equipment', input.id);
    let result!: Equipment;
    await runTransaction(firestore, async (transaction) => {
      const [item, destination] = await Promise.all([
        transaction.get(reference),
        transaction.get(doc(firestore, 'aquariums', input.toAquariumId)),
      ]);
      if (!item.exists()) throw new Error('Equipment not found');
      if (
        !destination.exists() ||
        destination.data()?.['ownerId'] !== input.ownerKeeperId
      )
        throw new Error('Aquarium is not owned by the keeper');
      const data = documentSchema.parse(item.data());
      if (
        data.ownerId !== input.ownerKeeperId ||
        data.aquariumId !== input.fromAquariumId
      )
        throw new Error('Equipment is not owned or not in the active Aquarium');
      result = transferEquipment(
        fromDto(item.id, data),
        input.toAquariumId,
        input.updatedAt,
      );
      transaction.set(reference, toDto(result, input.ownerKeeperId));
    });
    return result;
  }
  async retire(input: Parameters<EquipmentWriter['retire']>[0]): Promise<void> {
    const current = await this.getOwned(input.ownerKeeperId, input.id);
    if (!current || current.aquariumId !== input.aquariumId)
      throw new Error('Equipment is not owned or not in the active Aquarium');
    await setDoc(
      doc(getFirebaseClient().firestore, 'equipment', input.id),
      toDto(retireEquipment(current, input.updatedAt), input.ownerKeeperId),
    );
  }
}
