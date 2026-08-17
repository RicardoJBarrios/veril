import { ActiveAquariumContext } from '../../shared/application/active-aquarium-context';
import { Clock, systemClock } from '../../shared/application/clock';
import {
  canonicalUnitFor,
  createMeasurement,
  createMeasurementId,
  Measurement,
  MeasurementId,
  ParameterId,
} from '../domain/measurement';
import {
  KeeperSession,
  MeasurementCorrector,
  MeasurementReader,
} from './ports';

export class CorrectMeasurement {
  constructor(
    private readonly reader: MeasurementReader,
    private readonly corrector: MeasurementCorrector,
    private readonly keeperSession: KeeperSession,
    private readonly activeContext: ActiveAquariumContext,
    private readonly clock: Clock = systemClock,
  ) {}

  async execute(
    targetId: MeasurementId,
    value: number,
    measuredAt: Date,
  ): Promise<Measurement> {
    const keeper = await this.keeperSession.requireAuthenticatedKeeper();
    const aquariumId = this.activeContext.get();
    if (!aquariumId) throw new Error('Aquarium context is required');

    const target = await this.reader.getOwned(keeper.id, aquariumId, targetId);
    if (!target) throw new Error('Measurement not found');
    if (target.correctsMeasurementId) {
      throw new Error('A corrected Measurement cannot be corrected again');
    }

    const parameterId = target.parameterId as ParameterId;
    const unit = canonicalUnitFor(parameterId);
    const replacement = createMeasurement({
      id: createMeasurementId(),
      aquariumId,
      parameterId,
      enteredValue: value,
      enteredUnit: unit,
      canonicalValue: value,
      canonicalUnit: unit,
      measuredAt,
      recordedAt: this.clock.now(),
      provenance: 'manual',
      correctsMeasurementId: targetId,
    });

    return this.corrector.correct({
      ...replacement,
      ownerKeeperId: keeper.id,
      correctsMeasurementId: targetId,
    });
  }
}
