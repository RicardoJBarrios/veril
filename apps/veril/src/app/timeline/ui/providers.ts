import { InjectionToken } from '@angular/core';
import {
  TimelineCareWorkReader,
  TimelineMeasurementReader,
  TimelineObservationReader,
  TimelineAquariumContextReader,
  TimelineWaterChangeReader,
} from '../application/ports';
export { KEEPER_SESSION } from '../../shared/ui/providers';

export const TIMELINE_OBSERVATION_READER =
  new InjectionToken<TimelineObservationReader>('TIMELINE_OBSERVATION_READER');
export const TIMELINE_MEASUREMENT_READER =
  new InjectionToken<TimelineMeasurementReader>('TIMELINE_MEASUREMENT_READER');
export const TIMELINE_CARE_WORK_READER =
  new InjectionToken<TimelineCareWorkReader>('TIMELINE_CARE_WORK_READER');
export const TIMELINE_WATER_CHANGE_READER =
  new InjectionToken<TimelineWaterChangeReader>('TIMELINE_WATER_CHANGE_READER');
export const TIMELINE_AQUARIUM_CONTEXT_READER =
  new InjectionToken<TimelineAquariumContextReader>(
    'TIMELINE_AQUARIUM_CONTEXT_READER',
  );
