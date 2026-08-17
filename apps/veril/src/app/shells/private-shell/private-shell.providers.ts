import { Provider } from '@angular/core';
import { AquariumDashboardStore } from '../../composition/aquarium-dashboard/aquarium-dashboard-store';
import { PRIVATE_SHARED_PROVIDERS } from './providers/shared.providers';
import { PRIVATE_AQUARIUM_MANAGEMENT_PROVIDERS } from './providers/aquarium-management.providers';
import { PRIVATE_MEASUREMENT_PROVIDERS } from './providers/measurements.providers';
import { PRIVATE_OBSERVATION_PROVIDERS } from './providers/observations.providers';
import { PRIVATE_CARE_PROVIDERS } from './providers/care.providers';
import { PRIVATE_TIMELINE_PROVIDERS } from './providers/timeline.providers';
import { PRIVATE_LIVESTOCK_PROVIDERS } from './providers/livestock.providers';
import { PRIVATE_EQUIPMENT_PROVIDERS } from './providers/equipment.providers';
import { PRIVATE_MAINTENANCE_PROVIDERS } from './providers/maintenance.providers';

export const PRIVATE_SHELL_PROVIDERS: Provider[] = [
  ...PRIVATE_SHARED_PROVIDERS,
  ...PRIVATE_AQUARIUM_MANAGEMENT_PROVIDERS,
  ...PRIVATE_MEASUREMENT_PROVIDERS,
  ...PRIVATE_OBSERVATION_PROVIDERS,
  ...PRIVATE_CARE_PROVIDERS,
  ...PRIVATE_TIMELINE_PROVIDERS,
  ...PRIVATE_LIVESTOCK_PROVIDERS,
  ...PRIVATE_EQUIPMENT_PROVIDERS,
  ...PRIVATE_MAINTENANCE_PROVIDERS,
  AquariumDashboardStore,
];
