import { Provider } from '@angular/core';
import { inject } from '@angular/core';
import { AquariumReader } from '../../../aquarium-management/application/ports';
import { AQUARIUM_REPOSITORY } from '../../../aquarium-management/ui/providers';
import { EquipmentAquariumCatalogAdapter } from '../../../composition/equipment/equipment-catalogs';
import { FirestoreEquipmentRepository } from '../../../equipment/infrastructure/firestore-equipment-repository';
import {
  EQUIPMENT_AQUARIUM_CATALOG,
  EQUIPMENT_READER,
  EQUIPMENT_WRITER,
} from '../../../equipment/ui/providers';
export const PRIVATE_EQUIPMENT_PROVIDERS: Provider[] = [
  { provide: EQUIPMENT_READER, useClass: FirestoreEquipmentRepository },
  { provide: EQUIPMENT_WRITER, useClass: FirestoreEquipmentRepository },
  {
    provide: EQUIPMENT_AQUARIUM_CATALOG,
    useFactory: () =>
      new EquipmentAquariumCatalogAdapter(
        inject(AQUARIUM_REPOSITORY) as AquariumReader,
      ),
  },
];
