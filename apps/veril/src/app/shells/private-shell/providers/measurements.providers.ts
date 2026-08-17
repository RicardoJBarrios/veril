import { inject, Provider } from '@angular/core';
import { ActiveAquariumContext } from '../../../shared/application/active-aquarium-context';
import { ReviewCurrentMeasurements } from '../../../measurements/application/review-current-measurements';
import { ReviewMeasurementForCorrection } from '../../../measurements/application/review-measurement-for-correction';
import { CorrectMeasurement } from '../../../measurements/application/correct-measurement';
import { KEEPER_SESSION } from '../../../shared/ui/providers';
import { FirestoreMeasurementRepository } from '../../../measurements/infrastructure/firestore-measurement-repository';
import { FirestoreAquariumRepository } from '../../../aquarium-management/infrastructure/firestore-aquarium-repository';
import {
  CURRENT_MEASUREMENT_READER,
  MEASUREMENT_AQUARIUM_CONTEXT_READER,
  MEASUREMENT_READER,
  MEASUREMENT_WRITER,
  MEASUREMENT_CORRECTOR,
} from '../../../measurements/ui/providers';

export const PRIVATE_MEASUREMENT_PROVIDERS: Provider[] = [
  { provide: MEASUREMENT_WRITER, useClass: FirestoreMeasurementRepository },
  { provide: MEASUREMENT_CORRECTOR, useClass: FirestoreMeasurementRepository },
  { provide: MEASUREMENT_READER, useClass: FirestoreMeasurementRepository },
  {
    provide: CURRENT_MEASUREMENT_READER,
    useClass: FirestoreMeasurementRepository,
  },
  {
    provide: MEASUREMENT_AQUARIUM_CONTEXT_READER,
    useClass: FirestoreAquariumRepository,
  },
  {
    provide: ReviewCurrentMeasurements,
    useFactory: () =>
      new ReviewCurrentMeasurements(
        inject(CURRENT_MEASUREMENT_READER),
        inject(KEEPER_SESSION),
        inject(ActiveAquariumContext),
      ),
  },
  {
    provide: ReviewMeasurementForCorrection,
    useFactory: () =>
      new ReviewMeasurementForCorrection(
        inject(MEASUREMENT_READER),
        inject(KEEPER_SESSION),
        inject(ActiveAquariumContext),
      ),
  },
  {
    provide: CorrectMeasurement,
    useFactory: () =>
      new CorrectMeasurement(
        inject(MEASUREMENT_READER),
        inject(MEASUREMENT_CORRECTOR),
        inject(KEEPER_SESSION),
        inject(ActiveAquariumContext),
      ),
  },
];
