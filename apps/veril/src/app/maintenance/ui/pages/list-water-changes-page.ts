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
import { AquariumTimeZone } from '../../../shared/domain/aquarium-reference';
import {
  DEFAULT_PAGE_SIZE,
  pageSizeFor,
} from '../../../shared/application/pagination';
import {
  WaterChangeCursor,
  WaterChangeListItem,
} from '../../application/ports';
import { ListWaterChanges } from '../../application/list-water-changes';
import {
  KEEPER_SESSION,
  MAINTENANCE_AQUARIUM_CONTEXT_READER,
  WATER_CHANGE_READER,
} from '../providers';
import { AsyncListPageState } from '../../../shared/ui/page-state';
import { PaginationControls } from '../../../shared/ui/pagination-controls/pagination-controls';
import { formatAquariumDateTime } from '../../../shared/ui/aquarium-date-time';

@Component({
  selector: 'veril-list-water-changes-page',
  imports: [
    MatButtonModule,
    MatCardModule,
    MatProgressSpinnerModule,
    PaginationControls,
    RouterLink,
  ],
  templateUrl: './list-water-changes-page.html',
  styleUrl: './list-water-changes-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: ListWaterChanges,
      useFactory: () =>
        new ListWaterChanges(
          inject(WATER_CHANGE_READER),
          inject(KEEPER_SESSION),
          inject(ActiveAquariumContext),
        ),
    },
  ],
})
export class ListWaterChangesPage implements OnInit {
  private readonly listWaterChanges = inject(ListWaterChanges);
  private readonly activeContext = inject(ActiveAquariumContext);
  private readonly aquariumContextReader = inject(
    MAINTENANCE_AQUARIUM_CONTEXT_READER,
    { optional: true },
  );
  private readonly keeperSession = inject(KEEPER_SESSION, { optional: true });
  readonly state = signal<AsyncListPageState>('loading');
  readonly items = signal<readonly WaterChangeListItem[]>([]);
  readonly errorMessage = signal('');
  readonly nextCursor = signal<WaterChangeCursor | undefined>(undefined);
  readonly isLoadingMore = signal(false);
  readonly pageSize = signal(DEFAULT_PAGE_SIZE);
  readonly timeZone = signal<AquariumTimeZone | undefined>(undefined);

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

  async loadMore(): Promise<void> {
    const cursor = this.nextCursor();
    if (!cursor || this.isLoadingMore()) return;
    this.isLoadingMore.set(true);
    try {
      const page = await this.listWaterChanges.execute(cursor, this.pageSize());
      this.items.update((items) => [...items, ...page.items]);
      this.nextCursor.set(page.nextCursor);
    } catch {
      this.errorMessage.set(
        'No se han podido cargar más cambios de agua. Inténtalo de nuevo.',
      );
    } finally {
      this.isLoadingMore.set(false);
    }
  }

  changePageSize(value: number): void {
    const nextPageSize = pageSizeFor({ pageSize: value });
    if (nextPageSize === this.pageSize()) return;
    this.pageSize.set(nextPageSize);
    this.items.set([]);
    this.nextCursor.set(undefined);
    this.state.set('loading');
    void this.load();
  }

  formatPerformedAt(item: WaterChangeListItem): string {
    return formatAquariumDateTime(item.performedAt, this.timeZone());
  }

  private async load(): Promise<void> {
    try {
      await this.loadTimeZone();
      const page = await this.listWaterChanges.execute(
        undefined,
        this.pageSize(),
      );
      this.items.set(page.items);
      this.nextCursor.set(page.nextCursor);
      this.state.set(page.items.length ? 'success' : 'empty');
    } catch {
      this.errorMessage.set(
        'No se han podido cargar los cambios de agua. Inténtalo de nuevo.',
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
