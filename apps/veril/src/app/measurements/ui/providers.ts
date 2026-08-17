import { InjectionToken } from '@angular/core';
import {
  CurrentMeasurementReader,
  MeasurementReader,
  MeasurementWriter,
  MeasurementCorrector,
  MeasurementAquariumContextReader,
} from '../application/ports';
export { KEEPER_SESSION } from '../../shared/ui/providers';

export const MEASUREMENT_WRITER = new InjectionToken<MeasurementWriter>(
  'MEASUREMENT_WRITER',
);
export const MEASUREMENT_CORRECTOR = new InjectionToken<MeasurementCorrector>(
  'MEASUREMENT_CORRECTOR',
);
export const MEASUREMENT_READER = new InjectionToken<MeasurementReader>(
  'MEASUREMENT_READER',
);
export const CURRENT_MEASUREMENT_READER =
  new InjectionToken<CurrentMeasurementReader>('CURRENT_MEASUREMENT_READER');
export const MEASUREMENT_AQUARIUM_CONTEXT_READER =
  new InjectionToken<MeasurementAquariumContextReader>(
    'MEASUREMENT_AQUARIUM_CONTEXT_READER',
  );
