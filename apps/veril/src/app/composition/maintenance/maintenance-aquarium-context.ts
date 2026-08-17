import { AquariumReader } from '../../aquarium-management/application/ports';
import { AquariumId } from '../../shared/domain/aquarium-reference';
import { MaintenanceAquariumContextReader } from '../../maintenance/application/ports';

export class MaintenanceAquariumContextAdapter implements MaintenanceAquariumContextReader {
  constructor(private readonly reader: AquariumReader) {}

  async getOwned(ownerKeeperId: string, aquariumId: AquariumId) {
    const aquarium = await this.reader.getOwned(ownerKeeperId, aquariumId);
    if (!aquarium) return null;
    return { timeZone: aquarium.timeZone };
  }
}
