import { ActiveAquariumContext } from '../../shared/application/active-aquarium-context';
import { Clock, systemClock } from '../../shared/application/clock';
import {
  createWaterChange,
  createWaterChangeId,
  WaterChange,
} from '../domain/water-change';
import { WaterChangeWriter, KeeperSession } from './ports';

export class RecordWaterChange {
  constructor(
    private readonly writer: WaterChangeWriter,
    private readonly keeperSession: KeeperSession,
    private readonly activeContext: ActiveAquariumContext,
    private readonly clock: Clock = systemClock,
  ) {}

  async execute(
    volumeLitres: number,
    performedAt: Date,
    notes?: string,
  ): Promise<WaterChange> {
    const keeper = await this.keeperSession.requireAuthenticatedKeeper();
    const aquariumId = this.activeContext.get();
    if (!aquariumId) throw new Error('Aquarium context is required');
    const waterChange = createWaterChange({
      id: createWaterChangeId(),
      aquariumId,
      volumeLitres,
      performedAt,
      recordedAt: this.clock.now(),
      notes,
      provenance: 'manual',
    });
    return this.writer.record({ ...waterChange, ownerKeeperId: keeper.id });
  }
}
