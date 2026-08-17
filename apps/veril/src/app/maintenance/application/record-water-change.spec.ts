import { describe, expect, it, vi } from 'vitest';
import { aquariumIdFrom } from '../../shared/domain/aquarium-reference';
import { ActiveAquariumContext } from '../../shared/application/active-aquarium-context';
import { RecordWaterChange } from './record-water-change';
import { WaterChangeWriter } from './ports';

describe('RecordWaterChange', () => {
  it('records the selected aquarium and current recording time', async () => {
    const writer: WaterChangeWriter = {
      record: vi.fn(async (input) => input as never),
    };
    const session = {
      requireAuthenticatedKeeper: vi.fn(async () => ({ id: 'keeper-1' })),
    };
    const context = {
      get: () => aquariumIdFrom('123e4567-e89b-42d3-a456-426614174000'),
    } as ActiveAquariumContext;
    const clock = { now: () => new Date('2026-08-17T11:00:00.000Z') };
    const useCase = new RecordWaterChange(writer, session, context, clock);

    await useCase.execute(10, new Date('2026-08-17T10:00:00.000Z'), '  Nota ');

    expect(writer.record).toHaveBeenCalledWith(
      expect.objectContaining({
        aquariumId: context.get(),
        ownerKeeperId: 'keeper-1',
        volumeLitres: 10,
        recordedAt: clock.now(),
        notes: 'Nota',
      }),
    );
  });
});
