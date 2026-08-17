import { describe, expect, it } from 'vitest';
import { aquariumIdFrom } from '../../shared/domain/aquarium-reference';
import { createWaterChange, waterChangeIdFrom } from './water-change';

const input = () =>
  createWaterChange({
    id: waterChangeIdFrom('123e4567-e89b-42d3-a456-426614174001'),
    aquariumId: aquariumIdFrom('123e4567-e89b-42d3-a456-426614174000'),
    volumeLitres: 12.5,
    performedAt: new Date('2026-08-17T10:00:00.000Z'),
    recordedAt: new Date('2026-08-17T10:05:00.000Z'),
    notes: '  Cambio parcial  ',
    provenance: 'manual',
  });

describe('WaterChange aggregate', () => {
  it('trims optional notes', () => {
    expect(input().notes).toBe('Cambio parcial');
  });

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])(
    'rejects invalid volume %s',
    (volumeLitres) => {
      expect(() => createWaterChange({ ...input(), volumeLitres })).toThrow(
        'positive finite',
      );
    },
  );

  it('rejects oversized notes', () => {
    expect(() =>
      createWaterChange({ ...input(), notes: 'x'.repeat(1001) }),
    ).toThrow('notes are too long');
  });
});
