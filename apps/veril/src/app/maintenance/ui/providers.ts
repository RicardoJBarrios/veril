import { InjectionToken } from '@angular/core';
import {
  MaintenanceAquariumContextReader,
  WaterChangeReader,
  WaterChangeWriter,
} from '../application/ports';
export { KEEPER_SESSION } from '../../shared/ui/providers';

export const WATER_CHANGE_WRITER = new InjectionToken<WaterChangeWriter>(
  'WATER_CHANGE_WRITER',
);
export const WATER_CHANGE_READER = new InjectionToken<WaterChangeReader>(
  'WATER_CHANGE_READER',
);
export const MAINTENANCE_AQUARIUM_CONTEXT_READER =
  new InjectionToken<MaintenanceAquariumContextReader>(
    'MAINTENANCE_AQUARIUM_CONTEXT_READER',
  );
