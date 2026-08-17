import type { AquariumId } from '../../shared/domain/aquarium-reference';
import { createUuidV4, isUuidV4 } from '../../shared/domain/uuid-v4';

export const PARAMETER_IDS = [
  'temperature',
  'salinity',
  'alkalinity',
  'nitrate',
  'phosphate',
] as const;

export type ParameterId = (typeof PARAMETER_IDS)[number];

export const UNIT_IDS = [
  'celsius',
  'parts-per-thousand',
  'degrees-kh',
  'milligrams-per-litre-as-no3',
  'milligrams-per-litre-as-po4',
] as const;

export type UnitId = (typeof UNIT_IDS)[number];
export type MeasurementProvenance = 'manual';
export type MeasurementId = string & {
  readonly __measurementId: unique symbol;
};

const CANONICAL_UNITS: Readonly<Record<ParameterId, UnitId>> = {
  temperature: 'celsius',
  salinity: 'parts-per-thousand',
  alkalinity: 'degrees-kh',
  nitrate: 'milligrams-per-litre-as-no3',
  phosphate: 'milligrams-per-litre-as-po4',
};

export function createMeasurementId(): MeasurementId {
  return createUuidV4() as MeasurementId;
}

export function measurementIdFrom(value: string): MeasurementId {
  if (!isUuidV4(value)) {
    throw new Error('MeasurementId must be a UUID v4');
  }

  return value as MeasurementId;
}

export function isParameterId(value: string): value is ParameterId {
  return (PARAMETER_IDS as readonly string[]).includes(value);
}

export function canonicalUnitFor(parameterId: ParameterId): UnitId {
  const unit = CANONICAL_UNITS[parameterId];
  if (!unit) {
    throw new Error('Unsupported Measurement Parameter');
  }

  return unit;
}

export interface Measurement {
  readonly id: MeasurementId;
  readonly aquariumId: AquariumId;
  readonly parameterId: ParameterId;
  readonly enteredValue: number;
  readonly enteredUnit: UnitId;
  readonly canonicalValue: number;
  readonly canonicalUnit: UnitId;
  readonly measuredAt: Date;
  readonly recordedAt: Date;
  readonly provenance: MeasurementProvenance;
  readonly correctsMeasurementId?: MeasurementId;
}

export function createMeasurement(input: {
  readonly id: MeasurementId;
  readonly aquariumId: AquariumId;
  readonly parameterId: ParameterId;
  readonly enteredValue: number;
  readonly enteredUnit: UnitId;
  readonly canonicalValue: number;
  readonly canonicalUnit: UnitId;
  readonly measuredAt: Date;
  readonly recordedAt: Date;
  readonly provenance: MeasurementProvenance;
  readonly correctsMeasurementId?: MeasurementId;
}): Measurement {
  if (!isParameterId(input.parameterId)) {
    throw new Error('Unsupported Measurement Parameter');
  }

  if (!Number.isFinite(input.enteredValue)) {
    throw new Error('Measurement value must be finite');
  }

  if (!Number.isFinite(input.canonicalValue)) {
    throw new Error('Measurement value must be finite');
  }

  if (input.enteredValue < 0 || input.canonicalValue < 0) {
    throw new Error('Measurement value must not be negative');
  }

  const canonicalUnit = canonicalUnitFor(input.parameterId);
  if (
    input.enteredUnit !== canonicalUnit ||
    input.canonicalUnit !== canonicalUnit
  ) {
    throw new Error('Measurement unit is incompatible with its Parameter');
  }

  if (input.enteredValue !== input.canonicalValue) {
    throw new Error('Measurement values must match without conversion');
  }

  if (Number.isNaN(input.measuredAt.getTime())) {
    throw new Error('Measurement measuredAt must be a valid date');
  }

  if (Number.isNaN(input.recordedAt.getTime())) {
    throw new Error('Measurement recordedAt must be a valid date');
  }

  if (input.provenance !== 'manual') {
    throw new Error('Measurement provenance must be manual');
  }

  if (input.correctsMeasurementId === input.id) {
    throw new Error('Measurement cannot correct itself');
  }

  return { ...input };
}
