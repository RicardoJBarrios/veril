import { ActiveAquariumContext } from '../../shared/application/active-aquarium-context';
import { Clock, systemClock } from '../../shared/application/clock';
import { EquipmentId } from '../domain/equipment';
import { EquipmentWriter, KeeperSession } from './ports';
export class RetireEquipment {
  constructor(
    private readonly writer: EquipmentWriter,
    private readonly session: KeeperSession,
    private readonly context: ActiveAquariumContext,
    private readonly clock: Clock = systemClock,
  ) {}
  async execute(id: EquipmentId): Promise<void> {
    const keeper = await this.session.requireAuthenticatedKeeper();
    const aquariumId = this.context.get();
    if (!aquariumId) throw new Error('Aquarium context is required');
    await this.writer.retire({
      id,
      aquariumId,
      ownerKeeperId: keeper.id,
      updatedAt: this.clock.now(),
    });
  }
}
