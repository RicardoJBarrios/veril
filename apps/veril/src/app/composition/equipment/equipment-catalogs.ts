import { AquariumReader } from '../../aquarium-management/application/ports';
import { EquipmentAquariumCatalog } from '../../equipment/application/ports';

export class EquipmentAquariumCatalogAdapter implements EquipmentAquariumCatalog {
  constructor(private readonly reader: AquariumReader) {}

  async listOwned(ownerKeeperId: string) {
    const aquariums = await this.reader.listOwned(ownerKeeperId);
    return aquariums.items.map((aquarium) => ({
      id: aquarium.id,
      displayName: String(aquarium.name),
    }));
  }
}
