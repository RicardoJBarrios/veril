import { ActiveAquariumContext } from '../../shared/application/active-aquarium-context';
import { Clock, systemClock } from '../../shared/application/clock';
import { AquariumId } from '../../shared/domain/aquarium-reference';
import { EquipmentId } from '../domain/equipment';
import { EquipmentWriter, KeeperSession } from './ports';
export class TransferEquipment {
  constructor(
    private readonly writer: EquipmentWriter,
    private readonly session: KeeperSession,
    private readonly context: ActiveAquariumContext,
    private readonly clock: Clock = systemClock,
  ) {}
  async execute(id: EquipmentId, toAquariumId: AquariumId): Promise<void> {
    const keeper = await this.session.requireAuthenticatedKeeper();
    const fromAquariumId = this.context.get();
    if (!fromAquariumId) throw new Error('Aquarium context is required');
    await this.writer.transfer({
      id,
      fromAquariumId,
      toAquariumId,
      ownerKeeperId: keeper.id,
      updatedAt: this.clock.now(),
    });
  }
}
