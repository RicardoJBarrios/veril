import { AquariumId } from '../../shared/domain/aquarium-reference';
import { Page } from '../../shared/application/pagination';
import { KeeperSession } from '../../shared/application/keeper-session';
import { Equipment, EquipmentCategory, EquipmentId } from '../domain/equipment';
export type { KeeperSession };

export interface EquipmentAquariumOption {
  readonly id: AquariumId;
  readonly displayName: string;
}

export interface EquipmentAquariumCatalog {
  listOwned(ownerKeeperId: string): Promise<readonly EquipmentAquariumOption[]>;
}

export interface CreateEquipmentInput {
  readonly id: EquipmentId;
  readonly aquariumId: AquariumId;
  readonly ownerKeeperId: string;
  readonly category: EquipmentCategory;
  readonly name: string;
  readonly manufacturer?: string;
  readonly model?: string;
  readonly serialNumber?: string;
  readonly associationHistory: Equipment['associationHistory'];
  readonly associatedAt: Date;
  readonly updatedAt: Date;
}
export interface EquipmentWriter {
  create(input: CreateEquipmentInput): Promise<Equipment>;
  update(input: {
    id: EquipmentId;
    aquariumId: AquariumId;
    ownerKeeperId: string;
    equipment: Equipment;
  }): Promise<Equipment>;
  transfer(input: {
    id: EquipmentId;
    fromAquariumId: AquariumId;
    toAquariumId: AquariumId;
    ownerKeeperId: string;
    updatedAt: Date;
  }): Promise<Equipment>;
  retire(input: {
    id: EquipmentId;
    aquariumId: AquariumId;
    ownerKeeperId: string;
    updatedAt: Date;
  }): Promise<void>;
}
export type EquipmentCursor = string & {
  readonly __equipmentCursor: unique symbol;
};
export type EquipmentPage = Page<Equipment, EquipmentCursor>;
export interface EquipmentReader {
  listActiveOwned(
    ownerKeeperId: string,
    aquariumId: AquariumId,
    cursor?: EquipmentCursor,
    pageSize?: number,
  ): Promise<EquipmentPage>;
  getOwned(ownerKeeperId: string, id: EquipmentId): Promise<Equipment | null>;
  listHistory(
    ownerKeeperId: string,
    aquariumId: AquariumId,
    cursor?: EquipmentCursor,
    pageSize?: number,
  ): Promise<EquipmentPage>;
}
