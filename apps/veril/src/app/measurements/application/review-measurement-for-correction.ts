import { ActiveAquariumContext } from '../../shared/application/active-aquarium-context';
import { MeasurementId } from '../domain/measurement';
import { KeeperSession, MeasurementListItem, MeasurementReader } from './ports';

export class ReviewMeasurementForCorrection {
  constructor(
    private readonly reader: MeasurementReader,
    private readonly keeperSession: KeeperSession,
    private readonly activeContext: ActiveAquariumContext,
  ) {}

  async execute(id: MeasurementId): Promise<MeasurementListItem> {
    const keeper = await this.keeperSession.requireAuthenticatedKeeper();
    const aquariumId = this.activeContext.get();
    if (!aquariumId) throw new Error('Aquarium context is required');
    const measurement = await this.reader.getOwned(keeper.id, aquariumId, id);
    if (!measurement) throw new Error('Measurement not found');
    if (measurement.correctsMeasurementId) {
      throw new Error('A corrected Measurement cannot be corrected again');
    }
    return measurement;
  }
}
