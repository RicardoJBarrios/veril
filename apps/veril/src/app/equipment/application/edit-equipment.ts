import { ActiveAquariumContext } from '../../shared/application/active-aquarium-context';
import { Clock, systemClock } from '../../shared/application/clock';
import { editEquipment, EquipmentId } from '../domain/equipment';
import { EquipmentReader, EquipmentWriter, KeeperSession } from './ports';
export class EditEquipment {
  constructor(
    private readonly writer: EquipmentWriter,
    private readonly reader: EquipmentReader,
    private readonly session: KeeperSession,
    private readonly context: ActiveAquariumContext,
    private readonly clock: Clock = systemClock,
  ) {}
  async execute(
    id: EquipmentId,
    input: Parameters<typeof editEquipment>[1],
  ): Promise<void> {
    const keeper = await this.session.requireAuthenticatedKeeper();
    const aquariumId = this.context.get();
    if (!aquariumId) throw new Error('Aquarium context is required');
    const current = await this.reader.getOwned(keeper.id, id);
    if (!current) throw new Error('Equipment not found');
    await this.writer.update({
      id,
      aquariumId,
      ownerKeeperId: keeper.id,
      equipment: editEquipment(current, input, this.clock.now()),
    });
  }
}
