import { inject, Provider } from '@angular/core';
import { AQUARIUM_REPOSITORY } from '../../../aquarium-management/ui/providers';
import { MaintenanceAquariumContextAdapter } from '../../../composition/maintenance/maintenance-aquarium-context';
import { FirestoreWaterChangeRepository } from '../../../maintenance/infrastructure/firestore-water-change-repository';
import {
  WATER_CHANGE_READER,
  WATER_CHANGE_WRITER,
  MAINTENANCE_AQUARIUM_CONTEXT_READER,
} from '../../../maintenance/ui/providers';

export const PRIVATE_MAINTENANCE_PROVIDERS: Provider[] = [
  { provide: WATER_CHANGE_READER, useClass: FirestoreWaterChangeRepository },
  { provide: WATER_CHANGE_WRITER, useClass: FirestoreWaterChangeRepository },
  {
    provide: MAINTENANCE_AQUARIUM_CONTEXT_READER,
    useFactory: () =>
      new MaintenanceAquariumContextAdapter(inject(AQUARIUM_REPOSITORY)),
  },
];
