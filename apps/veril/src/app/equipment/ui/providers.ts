import { InjectionToken } from '@angular/core';
import {
  EquipmentAquariumCatalog,
  EquipmentReader,
  EquipmentWriter,
} from '../application/ports';
export { KEEPER_SESSION } from '../../shared/ui/providers';
export const EQUIPMENT_READER = new InjectionToken<EquipmentReader>(
  'EQUIPMENT_READER',
);
export const EQUIPMENT_WRITER = new InjectionToken<EquipmentWriter>(
  'EQUIPMENT_WRITER',
);
export const EQUIPMENT_AQUARIUM_CATALOG =
  new InjectionToken<EquipmentAquariumCatalog>('EQUIPMENT_AQUARIUM_CATALOG');
