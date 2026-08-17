import {
  AquariumId,
  AquariumTimeZone,
} from '../../shared/domain/aquarium-reference';
import { ParameterId, UnitId } from '../../shared/domain/parameter-reference';
export type { KeeperSession } from '../../shared/application/keeper-session';

export interface TimelineObservation {
  readonly id: string;
  readonly content: string;
  readonly recordedAt: Date;
}

export interface TimelineMeasurement {
  readonly id: string;
  readonly parameterId: ParameterId;
  readonly canonicalValue: number;
  readonly canonicalUnit: UnitId;
  readonly measuredAt: Date;
  readonly recordedAt: Date;
  readonly provenance: 'manual';
  readonly correctsMeasurementId?: string;
}

export interface TimelineCareWork {
  readonly id: string;
  readonly description: string;
  readonly performedAt: Date;
  readonly recordedAt: Date;
}

export interface TimelineWaterChange {
  readonly id: string;
  readonly volumeLitres: number;
  readonly notes?: string;
  readonly performedAt: Date;
  readonly recordedAt: Date;
}

export interface TimelineObservationReader {
  listRecentOwned(
    ownerKeeperId: string,
    aquariumId: AquariumId,
    limit: number,
  ): Promise<readonly TimelineObservation[]>;
}

export interface TimelineMeasurementReader {
  listRecentOwned(
    ownerKeeperId: string,
    aquariumId: AquariumId,
    limit: number,
  ): Promise<readonly TimelineMeasurement[]>;
}

export interface TimelineCareWorkReader {
  listRecentOwned(
    ownerKeeperId: string,
    aquariumId: AquariumId,
    limit: number,
  ): Promise<readonly TimelineCareWork[]>;
}

export interface TimelineWaterChangeReader {
  listRecentOwned(
    ownerKeeperId: string,
    aquariumId: AquariumId,
    limit: number,
  ): Promise<readonly TimelineWaterChange[]>;
}

export type ObservationListItem = TimelineObservation;
export type MeasurementListItem = TimelineMeasurement;
export type CareWorkListItem = TimelineCareWork;
export type CareWorkReader = TimelineCareWorkReader;

export interface TimelineAquariumContextReader {
  getOwned(
    ownerKeeperId: string,
    aquariumId: AquariumId,
  ): Promise<{ readonly timeZone?: AquariumTimeZone } | null>;
}
