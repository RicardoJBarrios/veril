import { ActiveAquariumContext } from '../../shared/application/active-aquarium-context';
import {
  EquipmentCursor,
  EquipmentPage,
  EquipmentReader,
  KeeperSession,
} from './ports';
export class ListEquipment {
  constructor(
    private readonly reader: EquipmentReader,
    private readonly session: KeeperSession,
    private readonly context: ActiveAquariumContext,
  ) {}
  async execute(
    cursor?: EquipmentCursor,
    pageSize?: number,
  ): Promise<EquipmentPage> {
    const keeper = await this.session.requireAuthenticatedKeeper();
    const aquariumId = this.context.get();
    if (!aquariumId) throw new Error('Aquarium context is required');
    return this.reader.listActiveOwned(keeper.id, aquariumId, cursor, pageSize);
  }
}
