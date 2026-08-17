import { describe, expect, it, vi } from 'vitest';
import { ActiveAquariumContext } from '../../shared/application/active-aquarium-context';
import { ActiveAquariumContextStorage } from '../../shared/application/active-aquarium-context-storage';
import { KeeperSession } from '../../shared/application/keeper-session';
import { aquariumIdFrom } from '../../shared/domain/aquarium-reference';
import { MeasurementId } from '../domain/measurement';
import { CorrectMeasurement } from './correct-measurement';
import { MeasurementCorrector, MeasurementReader } from './ports';

const targetId = '123e4567-e89b-42d3-a456-426614174000' as MeasurementId;
const aquariumId = aquariumIdFrom('123e4567-e89b-42d3-a456-426614174001');

function context(): ActiveAquariumContext {
  const storage: ActiveAquariumContextStorage = {
    load: vi.fn(),
    save: vi.fn(),
    clear: vi.fn(),
  };
  const active = new ActiveAquariumContext(storage);
  active.select(aquariumId);
  return active;
}

describe('CorrectMeasurement', () => {
  it('creates a replacement Fact for the owner and keeps the target immutable', async () => {
    const reader: MeasurementReader = {
      listOwned: vi.fn(),
      getOwned: vi.fn().mockResolvedValue({
        id: targetId,
        parameterId: 'temperature',
        canonicalValue: 23,
        canonicalUnit: 'celsius',
        measuredAt: new Date('2026-08-17T10:00:00.000Z'),
        recordedAt: new Date('2026-08-17T10:01:00.000Z'),
        provenance: 'manual',
      }),
    };
    const corrector: MeasurementCorrector = {
      correct: vi.fn(async (input) => ({
        ...input,
        id: input.id,
      })),
    };
    const keeperSession: KeeperSession = {
      requireAuthenticatedKeeper: vi.fn().mockResolvedValue({
        id: 'keeper-1',
      }),
    };
    const useCase = new CorrectMeasurement(
      reader,
      corrector,
      keeperSession,
      context(),
      { now: () => new Date('2026-08-17T10:05:00.000Z') },
    );

    const result = await useCase.execute(
      targetId,
      24.5,
      new Date('2026-08-17T10:04:00.000Z'),
    );

    expect(result.correctsMeasurementId).toBe(targetId);
    expect(corrector.correct).toHaveBeenCalledWith(
      expect.objectContaining({
        ownerKeeperId: 'keeper-1',
        parameterId: 'temperature',
        canonicalValue: 24.5,
        correctsMeasurementId: targetId,
      }),
    );
  });

  it('rejects correcting a replacement again', async () => {
    const reader: MeasurementReader = {
      listOwned: vi.fn(),
      getOwned: vi.fn().mockResolvedValue({
        id: targetId,
        parameterId: 'temperature',
        canonicalValue: 24,
        canonicalUnit: 'celsius',
        measuredAt: new Date('2026-08-17T10:00:00.000Z'),
        recordedAt: new Date('2026-08-17T10:01:00.000Z'),
        provenance: 'manual',
        correctsMeasurementId:
          '123e4567-e89b-42d3-a456-426614174002' as MeasurementId,
      }),
    };
    const useCase = new CorrectMeasurement(
      reader,
      { correct: vi.fn() },
      {
        requireAuthenticatedKeeper: vi
          .fn()
          .mockResolvedValue({ id: 'keeper-1' }),
      },
      context(),
    );

    await expect(
      useCase.execute(targetId, 25, new Date('2026-08-17T10:04:00.000Z')),
    ).rejects.toThrow('cannot be corrected again');
  });
});
