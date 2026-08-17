import { ActiveAquariumContext } from '../../shared/application/active-aquarium-context';
import { KeeperSession, WaterChangeReader, WaterChangeCursor } from './ports';
import { WaterChangePage } from './ports';

export class ListWaterChanges {
  constructor(
    private readonly reader: WaterChangeReader,
    private readonly keeperSession: KeeperSession,
    private readonly activeContext: ActiveAquariumContext,
  ) {}

  async execute(
    cursor?: WaterChangeCursor,
    pageSize?: number,
  ): Promise<WaterChangePage> {
    const keeper = await this.keeperSession.requireAuthenticatedKeeper();
    const aquariumId = this.activeContext.get();
    if (!aquariumId) throw new Error('Aquarium context is required');
    return this.reader.listRecentOwned(keeper.id, aquariumId, cursor, pageSize);
  }
}
