import { AquariumId } from '../../shared/domain/aquarium-reference';
import { createUuidV4, isUuidV4 } from '../../shared/domain/uuid-v4';

export type EquipmentId = string & { readonly __equipmentId: unique symbol };
export function createEquipmentId(): EquipmentId {
  return createUuidV4() as EquipmentId;
}
export function equipmentIdFrom(value: string): EquipmentId {
  if (!isUuidV4(value)) throw new Error('Equipment ID must be a UUID v4');
  return value as EquipmentId;
}

export const EQUIPMENT_CATEGORIES = [
  'lighting',
  'filtration',
  'flow',
  'heating',
  'monitoring',
  'dosing',
  'other',
] as const;
export type EquipmentCategory = (typeof EQUIPMENT_CATEGORIES)[number];
export type EquipmentLifecycle = 'active' | 'retired';

export interface EquipmentAssociation {
  readonly aquariumId: AquariumId;
  readonly associatedAt: Date;
  readonly endedAt?: Date;
}

export interface Equipment {
  readonly id: EquipmentId;
  readonly aquariumId: AquariumId;
  readonly category: EquipmentCategory;
  readonly name: string;
  readonly manufacturer?: string;
  readonly model?: string;
  readonly serialNumber?: string;
  readonly lifecycle: EquipmentLifecycle;
  readonly associationHistory: readonly EquipmentAssociation[];
  readonly associatedAt: Date;
  readonly updatedAt: Date;
}

function validDate(date: Date, field: string): void {
  if (Number.isNaN(date.getTime())) throw new Error(`${field} must be valid`);
}
function bounded(value: string | undefined, field: string): string | undefined {
  if (value === undefined) return undefined;
  const normalized = value.trim();
  if (!normalized) return undefined;
  if (normalized.length > 200) throw new Error(`${field} is too long`);
  return normalized;
}

export function createEquipment(
  input: Omit<Equipment, 'lifecycle'>,
): Equipment {
  const name = input.name.trim();
  if (!name) throw new Error('Equipment name must not be empty');
  if (name.length > 200) throw new Error('Equipment name is too long');
  validDate(input.associatedAt, 'Equipment associatedAt');
  validDate(input.updatedAt, 'Equipment updatedAt');
  if (
    input.associationHistory.length !== 1 ||
    input.associationHistory[0].aquariumId !== input.aquariumId
  ) {
    throw new Error('Equipment must start with one aquarium association');
  }
  return {
    ...input,
    name,
    manufacturer: bounded(input.manufacturer, 'Equipment manufacturer'),
    model: bounded(input.model, 'Equipment model'),
    serialNumber: bounded(input.serialNumber, 'Equipment serial number'),
    lifecycle: 'active',
  };
}

export function editEquipment(
  equipment: Equipment,
  input: Pick<
    Equipment,
    'name' | 'category' | 'manufacturer' | 'model' | 'serialNumber'
  >,
  updatedAt: Date,
): Equipment {
  if (equipment.lifecycle !== 'active')
    throw new Error('Retired Equipment cannot be edited');
  const updated = createEquipment({ ...equipment, ...input, updatedAt });
  return { ...updated, associationHistory: equipment.associationHistory };
}

export function transferEquipment(
  equipment: Equipment,
  aquariumId: AquariumId,
  updatedAt: Date,
): Equipment {
  if (equipment.lifecycle !== 'active')
    throw new Error('Retired Equipment cannot be transferred');
  validDate(updatedAt, 'Equipment updatedAt');
  if (equipment.aquariumId === aquariumId)
    throw new Error('Equipment is already in this Aquarium');
  const current =
    equipment.associationHistory[equipment.associationHistory.length - 1];
  if (!current || current.endedAt)
    throw new Error('Equipment association history is invalid');
  return {
    ...equipment,
    aquariumId,
    updatedAt,
    associationHistory: [
      ...equipment.associationHistory.slice(0, -1),
      { ...current, endedAt: updatedAt },
      { aquariumId, associatedAt: updatedAt },
    ],
  };
}

export function retireEquipment(
  equipment: Equipment,
  updatedAt: Date,
): Equipment {
  if (equipment.lifecycle !== 'active')
    throw new Error('Equipment is already retired');
  validDate(updatedAt, 'Equipment updatedAt');
  return { ...equipment, lifecycle: 'retired', updatedAt };
}

export function restoreEquipment(input: Equipment): Equipment {
  const name = input.name.trim();
  if (!name) throw new Error('Equipment name must not be empty');
  if (name.length > 200) throw new Error('Equipment name is too long');
  validDate(input.associatedAt, 'Equipment associatedAt');
  validDate(input.updatedAt, 'Equipment updatedAt');
  if (!input.associationHistory.length)
    throw new Error('Equipment must have an association history');
  input.associationHistory.forEach((entry) => {
    validDate(entry.associatedAt, 'Equipment association date');
    if (entry.endedAt)
      validDate(entry.endedAt, 'Equipment association end date');
  });
  const current = input.associationHistory[input.associationHistory.length - 1];
  if (current.aquariumId !== input.aquariumId || current.endedAt)
    throw new Error('Equipment current aquarium must match its open history');
  return {
    ...input,
    name,
    manufacturer: bounded(input.manufacturer, 'Equipment manufacturer'),
    model: bounded(input.model, 'Equipment model'),
    serialNumber: bounded(input.serialNumber, 'Equipment serial number'),
  };
}
