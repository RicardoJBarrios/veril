import {
  AquariumId,
  AquariumTimeZone,
} from '../../shared/domain/aquarium-reference';
import {
  Measurement,
  MeasurementId,
  ParameterId,
  UnitId,
} from '../domain/measurement';
export type { KeeperSession } from '../../shared/application/keeper-session';

export interface RecordMeasurementInput {
  readonly id: MeasurementId;
  readonly aquariumId: AquariumId;
  readonly ownerKeeperId: string;
  readonly parameterId: ParameterId;
  readonly enteredValue: number;
  readonly enteredUnit: UnitId;
  readonly canonicalValue: number;
  readonly canonicalUnit: UnitId;
  readonly measuredAt: Date;
  readonly recordedAt: Date;
  readonly provenance: 'manual';
  readonly correctsMeasurementId?: MeasurementId;
}

export interface MeasurementWriter {
  record(input: RecordMeasurementInput): Promise<Measurement>;
}

export interface CorrectMeasurementInput extends RecordMeasurementInput {
  readonly correctsMeasurementId: MeasurementId;
}

export interface MeasurementCorrector {
  correct(input: CorrectMeasurementInput): Promise<Measurement>;
}

export type MeasurementCursor = string & {
  readonly __measurementCursor: unique symbol;
};

export interface MeasurementListItem {
  readonly id: MeasurementId;
  readonly parameterId: ParameterId;
  readonly canonicalValue: number;
  readonly canonicalUnit: UnitId;
  readonly measuredAt: Date;
  readonly recordedAt: Date;
  readonly provenance: 'manual';
  readonly correctsMeasurementId?: MeasurementId;
}

export interface MeasurementPage {
  readonly items: readonly MeasurementListItem[];
  readonly nextCursor?: MeasurementCursor;
}

export interface MeasurementReader {
  listOwned(
    ownerKeeperId: string,
    aquariumId: AquariumId,
    cursor?: MeasurementCursor,
    pageSize?: number,
  ): Promise<MeasurementPage>;
  getOwned(
    ownerKeeperId: string,
    aquariumId: AquariumId,
    measurementId: MeasurementId,
  ): Promise<MeasurementListItem | null>;
}

export interface CurrentMeasurementValue {
  readonly parameterId: ParameterId;
  readonly canonicalValue: number | null;
  readonly canonicalUnit: UnitId | null;
  readonly measuredAt: Date | null;
}

export interface CurrentMeasurementReader {
  findCurrentOwned(
    ownerKeeperId: string,
    aquariumId: AquariumId,
    parameterId: ParameterId,
  ): Promise<MeasurementListItem | null>;
}

export interface TimelineMeasurementReader {
  listRecentOwned(
    ownerKeeperId: string,
    aquariumId: AquariumId,
    limit: number,
  ): Promise<readonly MeasurementListItem[]>;
}

export interface MeasurementAquariumContextReader {
  getOwned(
    ownerKeeperId: string,
    aquariumId: AquariumId,
  ): Promise<{ readonly timeZone?: AquariumTimeZone } | null>;
}
