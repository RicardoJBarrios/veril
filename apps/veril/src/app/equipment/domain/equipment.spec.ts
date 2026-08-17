import { describe, expect, it } from 'vitest';
import { aquariumIdFrom } from '../../shared/domain/aquarium-reference';
import {
  createEquipment,
  equipmentIdFrom,
  editEquipment,
  retireEquipment,
  transferEquipment,
} from './equipment';

const aquarium = aquariumIdFrom('123e4567-e89b-42d3-a456-426614174000');
const otherAquarium = aquariumIdFrom('123e4567-e89b-42d3-a456-426614174001');
const at = new Date('2026-01-01T00:00:00.000Z');
const later = new Date('2026-01-02T00:00:00.000Z');
function item() {
  return createEquipment({
    id: equipmentIdFrom('123e4567-e89b-42d3-a456-426614174002'),
    aquariumId: aquarium,
    category: 'filtration',
    name: 'Skimmer',
    associatedAt: at,
    updatedAt: at,
    associationHistory: [{ aquariumId: aquarium, associatedAt: at }],
  });
}

describe('Equipment aggregate', () => {
  it('starts active with a normalized name', () =>
    expect(item()).toMatchObject({ lifecycle: 'active', name: 'Skimmer' }));
  it('edits active descriptive data without changing association history', () => {
    const result = editEquipment(
      item(),
      { name: 'Skimmer nuevo', category: 'other' },
      later,
    );
    expect(result).toMatchObject({
      name: 'Skimmer nuevo',
      category: 'other',
      aquariumId: aquarium,
    });
    expect(result.associationHistory).toHaveLength(1);
  });
  it('transfers and closes the previous association', () => {
    const result = transferEquipment(item(), otherAquarium, later);
    expect(result.aquariumId).toBe(otherAquarium);
    expect(result.associationHistory[0].endedAt).toEqual(later);
    expect(result.associationHistory[1].aquariumId).toBe(otherAquarium);
  });
  it('retires as a soft delete and rejects further transfer', () => {
    const result = retireEquipment(item(), later);
    expect(result.lifecycle).toBe('retired');
    expect(() => transferEquipment(result, otherAquarium, later)).toThrow(
      'Retired Equipment',
    );
  });
  it('rejects a blank name', () =>
    expect(() => createEquipment({ ...item(), name: ' ' })).toThrow(
      'name must not be empty',
    ));
});
