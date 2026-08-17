import { ActiveAquariumContext } from '../../shared/application/active-aquarium-context';
import {
  KeeperSession,
  CareWorkListItem,
  CareWorkReader,
  MeasurementListItem,
  TimelineMeasurementReader,
  TimelineObservationReader,
  ObservationListItem,
  TimelineWaterChange,
  TimelineWaterChangeReader,
} from './ports';

export const RECENT_TIMELINE_LIMIT = 20;

export type ObservationTimelineItem = {
  readonly kind: 'observation';
  readonly observationId: ObservationListItem['id'];
  readonly content: string;
  readonly effectiveAt: Date;
  readonly recordedAt: Date;
};

export type MeasurementTimelineItem = {
  readonly kind: 'measurement';
  readonly measurementId: MeasurementListItem['id'];
  readonly parameterId: MeasurementListItem['parameterId'];
  readonly canonicalValue: number;
  readonly canonicalUnit: MeasurementListItem['canonicalUnit'];
  readonly effectiveAt: Date;
  readonly measuredAt: Date;
  readonly recordedAt: Date;
  readonly correctsMeasurementId?: string;
};

export type CareWorkTimelineItem = {
  readonly kind: 'care-work';
  readonly careWorkId: CareWorkListItem['id'];
  readonly description: string;
  readonly effectiveAt: Date;
  readonly performedAt: Date;
  readonly recordedAt: Date;
};

export type WaterChangeTimelineItem = {
  readonly kind: 'water-change';
  readonly waterChangeId: TimelineWaterChange['id'];
  readonly volumeLitres: number;
  readonly notes?: string;
  readonly effectiveAt: Date;
  readonly performedAt: Date;
  readonly recordedAt: Date;
};

export type TimelineItem =
  | ObservationTimelineItem
  | MeasurementTimelineItem
  | CareWorkTimelineItem
  | WaterChangeTimelineItem;

const sourceOrder: Record<TimelineItem['kind'], number> = {
  measurement: 0,
  observation: 1,
  'care-work': 2,
  'water-change': 3,
};

function toTimelineItem(
  item:
    | ObservationListItem
    | MeasurementListItem
    | CareWorkListItem
    | TimelineWaterChange,
): TimelineItem {
  if ('content' in item) {
    return {
      kind: 'observation',
      observationId: item.id,
      content: item.content,
      effectiveAt: item.recordedAt,
      recordedAt: item.recordedAt,
    };
  }

  if ('description' in item) {
    return {
      kind: 'care-work',
      careWorkId: item.id,
      description: item.description,
      effectiveAt: item.performedAt,
      performedAt: item.performedAt,
      recordedAt: item.recordedAt,
    };
  }

  if ('volumeLitres' in item) {
    return {
      kind: 'water-change',
      waterChangeId: item.id,
      volumeLitres: item.volumeLitres,
      ...(item.notes ? { notes: item.notes } : {}),
      effectiveAt: item.performedAt,
      performedAt: item.performedAt,
      recordedAt: item.recordedAt,
    };
  }

  return {
    kind: 'measurement',
    measurementId: item.id,
    parameterId: item.parameterId,
    canonicalValue: item.canonicalValue,
    canonicalUnit: item.canonicalUnit,
    effectiveAt: item.measuredAt,
    measuredAt: item.measuredAt,
    recordedAt: item.recordedAt,
    ...(item.correctsMeasurementId
      ? { correctsMeasurementId: item.correctsMeasurementId }
      : {}),
  };
}

function compareTimelineItems(left: TimelineItem, right: TimelineItem): number {
  const effectiveTime =
    right.effectiveAt.getTime() - left.effectiveAt.getTime();
  if (effectiveTime !== 0) {
    return effectiveTime;
  }

  const recordedTime = right.recordedAt.getTime() - left.recordedAt.getTime();
  if (recordedTime !== 0) {
    return recordedTime;
  }

  const sourceDifference = sourceOrder[left.kind] - sourceOrder[right.kind];
  if (sourceDifference !== 0) {
    return sourceDifference;
  }

  const leftId =
    left.kind === 'measurement'
      ? left.measurementId
      : left.kind === 'observation'
        ? left.observationId
        : left.kind === 'care-work'
          ? left.careWorkId
          : left.waterChangeId;
  const rightId =
    right.kind === 'measurement'
      ? right.measurementId
      : right.kind === 'observation'
        ? right.observationId
        : right.kind === 'care-work'
          ? right.careWorkId
          : right.waterChangeId;
  return leftId < rightId ? -1 : leftId > rightId ? 1 : 0;
}

export class ReviewRecentTimeline {
  constructor(
    private readonly observationReader: TimelineObservationReader,
    private readonly measurementReader: TimelineMeasurementReader,
    private readonly careWorkReader: CareWorkReader,
    private readonly waterChangeReader: TimelineWaterChangeReader,
    private readonly keeperSession: KeeperSession,
    private readonly activeContext: ActiveAquariumContext,
  ) {}

  async execute(
    limit = RECENT_TIMELINE_LIMIT,
  ): Promise<readonly TimelineItem[]> {
    const keeper = await this.keeperSession.requireAuthenticatedKeeper();
    const aquariumId = this.activeContext.get();

    if (!aquariumId) {
      throw new Error('Aquarium context is required');
    }

    const [observations, measurements, careWorks, waterChanges] =
      await Promise.all([
        this.observationReader.listRecentOwned(keeper.id, aquariumId, limit),
        this.measurementReader.listRecentOwned(keeper.id, aquariumId, limit),
        this.careWorkReader.listRecentOwned(keeper.id, aquariumId, limit),
        this.waterChangeReader.listRecentOwned(keeper.id, aquariumId, limit),
      ]);

    return [...observations, ...measurements, ...careWorks, ...waterChanges]
      .map((item) => toTimelineItem(item))
      .sort(compareTimelineItems)
      .slice(0, limit);
  }
}
