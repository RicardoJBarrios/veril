import { AquariumId } from '../../shared/domain/aquarium-reference';
import { createUuidV4, isUuidV4 } from '../../shared/domain/uuid-v4';

export type WaterChangeId = string & {
  readonly __waterChangeId: unique symbol;
};

export function createWaterChangeId(): WaterChangeId {
  return createUuidV4() as WaterChangeId;
}

export function waterChangeIdFrom(value: string): WaterChangeId {
  if (!isUuidV4(value)) throw new Error('WaterChangeId must be a UUID v4');
  return value as WaterChangeId;
}

export interface WaterChange {
  readonly id: WaterChangeId;
  readonly aquariumId: AquariumId;
  readonly volumeLitres: number;
  readonly performedAt: Date;
  readonly recordedAt: Date;
  readonly notes?: string;
  readonly provenance: 'manual';
}

export function createWaterChange(input: WaterChange): WaterChange {
  if (!Number.isFinite(input.volumeLitres) || input.volumeLitres <= 0) {
    throw new Error('Water Change volume must be a positive finite number');
  }
  if (Number.isNaN(input.performedAt.getTime())) {
    throw new Error('Water Change performedAt must be a valid date');
  }
  if (Number.isNaN(input.recordedAt.getTime())) {
    throw new Error('Water Change recordedAt must be a valid date');
  }
  const notes = input.notes?.trim();
  if (notes && notes.length > 1000) {
    throw new Error('Water Change notes are too long');
  }
  return { ...input, ...(notes ? { notes } : { notes: undefined }) };
}
