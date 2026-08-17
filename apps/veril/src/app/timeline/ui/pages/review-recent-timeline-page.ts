import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ActiveAquariumContext } from '../../../shared/application/active-aquarium-context';
import {
  MeasurementTimelineItem,
  ObservationTimelineItem,
  CareWorkTimelineItem,
  WaterChangeTimelineItem,
  ReviewRecentTimeline,
  TimelineItem,
} from '../../application/review-recent-timeline';
import { AquariumTimeZone } from '../../../shared/domain/aquarium-reference';
import { TIMELINE_AQUARIUM_CONTEXT_READER, KEEPER_SESSION } from '../providers';
import { parameterPresentationFor } from '../../../shared/ui/parameter-presentation';
import { formatAquariumDateTime } from '../../../shared/ui/aquarium-date-time';
import { AsyncListPageState } from '../../../shared/ui/page-state';

type PageState = AsyncListPageState;

@Component({
  selector: 'veril-review-recent-timeline-page',
  imports: [
    MatButtonModule,
    MatCardModule,
    MatProgressSpinnerModule,
    RouterLink,
  ],
  templateUrl: './review-recent-timeline-page.html',
  styleUrl: './review-recent-timeline-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReviewRecentTimelinePage implements OnInit {
  private readonly reviewTimeline = inject(ReviewRecentTimeline);
  private readonly activeContext = inject(ActiveAquariumContext);
  private readonly aquariumContextReader = inject(
    TIMELINE_AQUARIUM_CONTEXT_READER,
    {
      optional: true,
    },
  );
  private readonly keeperSession = inject(KEEPER_SESSION, { optional: true });

  readonly state = signal<PageState>('loading');
  readonly items = signal<readonly TimelineItem[]>([]);
  readonly errorMessage = signal('');
  readonly timeZone = signal<AquariumTimeZone | undefined>(undefined);

  ngOnInit(): void {
    if (!this.activeContext.get()) {
      this.state.set('no-context');
      return;
    }

    void this.loadTimeline();
  }

  retry(): void {
    this.state.set('loading');
    void this.loadTimeline();
  }

  isObservation(item: TimelineItem): item is ObservationTimelineItem {
    return item.kind === 'observation';
  }

  isMeasurement(item: TimelineItem): item is MeasurementTimelineItem {
    return item.kind === 'measurement';
  }

  isCareWork(item: TimelineItem): item is CareWorkTimelineItem {
    return item.kind === 'care-work';
  }

  isWaterChange(item: TimelineItem): item is WaterChangeTimelineItem {
    return item.kind === 'water-change';
  }

  measurementLabel(item: MeasurementTimelineItem): string {
    return parameterPresentationFor(item.parameterId).label;
  }

  measurementUnit(item: MeasurementTimelineItem): string {
    return parameterPresentationFor(item.parameterId).unit;
  }

  formatDate(date: Date): string {
    return formatAquariumDateTime(date, this.timeZone());
  }

  private async loadTimeline(): Promise<void> {
    try {
      await this.loadTimeZone();
      const items = await this.reviewTimeline.execute();
      this.items.set(items);
      this.state.set(items.length === 0 ? 'empty' : 'success');
    } catch {
      this.errorMessage.set(
        'No se ha podido cargar la actividad reciente. Inténtalo de nuevo.',
      );
      this.state.set('failure');
    }
  }

  private async loadTimeZone(): Promise<void> {
    if (!this.aquariumContextReader || !this.keeperSession) return;
    const aquariumId = this.activeContext.get();
    if (!aquariumId) return;
    const keeper = await this.keeperSession.requireAuthenticatedKeeper();
    const aquarium = await this.aquariumContextReader.getOwned(
      keeper.id,
      aquariumId,
    );
    if (!aquarium) throw new Error('Aquarium not found');
    this.timeZone.set(aquarium.timeZone);
  }
}
