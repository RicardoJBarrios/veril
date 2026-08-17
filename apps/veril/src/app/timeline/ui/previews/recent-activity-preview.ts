import {
  ChangeDetectionStrategy,
  Component,
  Input,
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
  CareWorkTimelineItem,
  MeasurementTimelineItem,
  ObservationTimelineItem,
  WaterChangeTimelineItem,
  ReviewRecentTimeline,
  TimelineItem,
} from '../../application/review-recent-timeline';
import { AquariumTimeZone } from '../../../shared/domain/aquarium-reference';
import { parameterPresentationFor } from '../../../shared/ui/parameter-presentation';
import { formatAquariumDateTime } from '../../../shared/ui/aquarium-date-time';

const RECENT_ACTIVITY_PREVIEW_LIMIT = 3;
type PreviewState = 'loading' | 'empty' | 'success' | 'failure' | 'no-context';

@Component({
  selector: 'veril-recent-activity-preview',
  imports: [
    MatButtonModule,
    MatCardModule,
    MatProgressSpinnerModule,
    RouterLink,
  ],
  templateUrl: './recent-activity-preview.html',
  styleUrl: './recent-activity-preview.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecentActivityPreview implements OnInit {
  @Input() timeZone?: AquariumTimeZone;

  private readonly reviewTimeline = inject(ReviewRecentTimeline);
  private readonly activeContext = inject(ActiveAquariumContext);

  readonly state = signal<PreviewState>('loading');
  readonly items = signal<readonly TimelineItem[]>([]);
  readonly errorMessage = signal('');

  ngOnInit(): void {
    if (!this.activeContext.get()) {
      this.state.set('no-context');
      return;
    }

    void this.load();
  }

  retry(): void {
    this.state.set('loading');
    void this.load();
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
    return formatAquariumDateTime(date, this.timeZone);
  }

  private async load(): Promise<void> {
    try {
      const items = await this.reviewTimeline.execute(
        RECENT_ACTIVITY_PREVIEW_LIMIT,
      );
      this.items.set(items);
      this.state.set(items.length === 0 ? 'empty' : 'success');
    } catch {
      this.errorMessage.set(
        'No se ha podido cargar la actividad reciente. Inténtalo de nuevo.',
      );
      this.state.set('failure');
    }
  }
}
