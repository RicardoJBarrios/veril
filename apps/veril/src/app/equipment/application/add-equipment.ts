import { ActiveAquariumContext } from '../../shared/application/active-aquarium-context';
import { Clock, systemClock } from '../../shared/application/clock';
import { createEquipment, createEquipmentId } from '../domain/equipment';
import { EquipmentWriter, KeeperSession } from './ports';
export class AddEquipment {
  constructor(
    private readonly writer: EquipmentWriter,
    private readonly session: KeeperSession,
    private readonly context: ActiveAquariumContext,
    private readonly clock: Clock = systemClock,
  ) {}
  async execute(input: {
    name: string;
    category: Parameters<typeof createEquipment>[0]['category'];
    manufacturer?: string;
    model?: string;
    serialNumber?: string;
  }): Promise<void> {
    const keeper = await this.session.requireAuthenticatedKeeper();
    const aquariumId = this.context.get();
    if (!aquariumId) throw new Error('Aquarium context is required');
    const now = this.clock.now();
    const equipment = createEquipment({
      id: createEquipmentId(),
      aquariumId,
      ...input,
      associatedAt: now,
      updatedAt: now,
      associationHistory: [{ aquariumId, associatedAt: now }],
    });
    await this.writer.create({ ...equipment, ownerKeeperId: keeper.id });
  }
}
