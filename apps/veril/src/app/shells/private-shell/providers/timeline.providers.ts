import { inject, Provider } from '@angular/core';
import { ActiveAquariumContext } from '../../../shared/application/active-aquarium-context';
import { ReviewRecentTimeline } from '../../../timeline/application/review-recent-timeline';
import { KEEPER_SESSION } from '../../../shared/ui/providers';
import { FirestoreAquariumRepository } from '../../../aquarium-management/infrastructure/firestore-aquarium-repository';
import { FirestoreCareWorkRepository } from '../../../care/infrastructure/firestore-care-work-repository';
import { FirestoreMeasurementRepository } from '../../../measurements/infrastructure/firestore-measurement-repository';
import { FirestoreObservationRepository } from '../../../observations/infrastructure/firestore-observation-repository';
import { TimelineWaterChangeAdapter } from '../../../composition/timeline/timeline-water-changes';
import { WATER_CHANGE_READER } from '../../../maintenance/ui/providers';
import {
  TIMELINE_AQUARIUM_CONTEXT_READER,
  TIMELINE_CARE_WORK_READER,
  TIMELINE_MEASUREMENT_READER,
  TIMELINE_OBSERVATION_READER,
  TIMELINE_WATER_CHANGE_READER,
} from '../../../timeline/ui/providers';

export const PRIVATE_TIMELINE_PROVIDERS: Provider[] = [
  {
    provide: TIMELINE_OBSERVATION_READER,
    useClass: FirestoreObservationRepository,
  },
  {
    provide: TIMELINE_MEASUREMENT_READER,
    useClass: FirestoreMeasurementRepository,
  },
  {
    provide: TIMELINE_CARE_WORK_READER,
    useFactory: () => {
      const repository = new FirestoreCareWorkRepository();
      return {
        listRecentOwned: async (
          ownerKeeperId: string,
          aquariumId: Parameters<
            FirestoreCareWorkRepository['listRecentOwned']
          >[1],
          limit: number,
        ) =>
          (
            await repository.listRecentOwned(
              ownerKeeperId,
              aquariumId,
              undefined,
              limit,
            )
          ).items,
      };
    },
  },
  {
    provide: TIMELINE_AQUARIUM_CONTEXT_READER,
    useClass: FirestoreAquariumRepository,
  },
  {
    provide: TIMELINE_WATER_CHANGE_READER,
    useFactory: () =>
      new TimelineWaterChangeAdapter(inject(WATER_CHANGE_READER)),
  },
  {
    provide: ReviewRecentTimeline,
    useFactory: () =>
      new ReviewRecentTimeline(
        inject(TIMELINE_OBSERVATION_READER),
        inject(TIMELINE_MEASUREMENT_READER),
        inject(TIMELINE_CARE_WORK_READER),
        inject(TIMELINE_WATER_CHANGE_READER),
        inject(KEEPER_SESSION),
        inject(ActiveAquariumContext),
      ),
  },
];
