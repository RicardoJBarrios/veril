import {
  AquariumId,
  AquariumTimeZone,
} from '../../shared/domain/aquarium-reference';
import { Page } from '../../shared/application/pagination';
import { WaterChange, WaterChangeId } from '../domain/water-change';
export type { KeeperSession } from '../../shared/application/keeper-session';

export interface MaintenanceAquariumContextReader {
  getOwned(
    ownerKeeperId: string,
    aquariumId: AquariumId,
  ): Promise<{ readonly timeZone?: AquariumTimeZone } | null>;
}

export interface RecordWaterChangeInput {
  readonly id: WaterChangeId;
  readonly aquariumId: AquariumId;
  readonly ownerKeeperId: string;
  readonly volumeLitres: number;
  readonly performedAt: Date;
  readonly recordedAt: Date;
  readonly notes?: string;
  readonly provenance: 'manual';
}

export interface WaterChangeWriter {
  record(input: RecordWaterChangeInput): Promise<WaterChange>;
}

export interface WaterChangeListItem {
  readonly id: WaterChangeId;
  readonly volumeLitres: number;
  readonly performedAt: Date;
  readonly recordedAt: Date;
  readonly notes?: string;
}

export type WaterChangeCursor = string & {
  readonly __waterChangeCursor: unique symbol;
};
export type WaterChangePage = Page<WaterChangeListItem, WaterChangeCursor>;

export interface WaterChangeReader {
  listRecentOwned(
    ownerKeeperId: string,
    aquariumId: AquariumId,
    cursor?: WaterChangeCursor,
    pageSize?: number,
  ): Promise<WaterChangePage>;
}
