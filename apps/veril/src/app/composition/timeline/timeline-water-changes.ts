import { AquariumId } from '../../shared/domain/aquarium-reference';
import { WaterChangeReader } from '../../maintenance/application/ports';
import { TimelineWaterChangeReader } from '../../timeline/application/ports';

export class TimelineWaterChangeAdapter implements TimelineWaterChangeReader {
  constructor(private readonly reader: WaterChangeReader) {}

  async listRecentOwned(
    ownerKeeperId: string,
    aquariumId: AquariumId,
    limit: number,
  ) {
    const page = await this.reader.listRecentOwned(
      ownerKeeperId,
      aquariumId,
      undefined,
      limit,
    );
    return page.items;
  }
}
