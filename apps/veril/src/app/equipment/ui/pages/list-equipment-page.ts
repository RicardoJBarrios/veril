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
  DEFAULT_PAGE_SIZE,
  pageSizeFor,
} from '../../../shared/application/pagination';
import { AsyncListPageState } from '../../../shared/ui/page-state';
import { PaginationControls } from '../../../shared/ui/pagination-controls/pagination-controls';
import { ListEquipment } from '../../application/list-equipment';
import { RetireEquipment } from '../../application/retire-equipment';
import { EquipmentCursor } from '../../application/ports';
import { Equipment } from '../../domain/equipment';
import {
  EQUIPMENT_READER,
  EQUIPMENT_WRITER,
  KEEPER_SESSION,
} from '../providers';

@Component({
  selector: 'veril-list-equipment-page',
  imports: [
    MatButtonModule,
    MatCardModule,
    MatProgressSpinnerModule,
    PaginationControls,
    RouterLink,
  ],
  templateUrl: './list-equipment-page.html',
  styleUrl: './list-equipment-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: ListEquipment,
      useFactory: () =>
        new ListEquipment(
          inject(EQUIPMENT_READER),
          inject(KEEPER_SESSION),
          inject(ActiveAquariumContext),
        ),
    },
    {
      provide: RetireEquipment,
      useFactory: () =>
        new RetireEquipment(
          inject(EQUIPMENT_WRITER),
          inject(KEEPER_SESSION),
          inject(ActiveAquariumContext),
        ),
    },
  ],
})
export class ListEquipmentPage implements OnInit {
  private readonly listEquipment = inject(ListEquipment);
  private readonly retireEquipment = inject(RetireEquipment);
  private readonly context = inject(ActiveAquariumContext);
  readonly state = signal<AsyncListPageState>('loading');
  readonly items = signal<readonly Equipment[]>([]);
  readonly nextCursor = signal<EquipmentCursor | undefined>(undefined);
  readonly pageSize = signal(DEFAULT_PAGE_SIZE);
  readonly isLoadingMore = signal(false);
  readonly errorMessage = signal('');
  ngOnInit(): void {
    if (!this.context.get()) {
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
      const page = await this.listEquipment.execute(cursor, this.pageSize());
      this.items.update((items) => [...items, ...page.items]);
      this.nextCursor.set(page.nextCursor);
    } catch {
      this.errorMessage.set('No se han podido cargar más equipos.');
    } finally {
      this.isLoadingMore.set(false);
    }
  }
  changePageSize(value: number): void {
    const size = pageSizeFor({ pageSize: value });
    if (size === this.pageSize()) return;
    this.pageSize.set(size);
    void this.load();
  }
  async retire(id: Equipment['id']): Promise<void> {
    if (
      !globalThis.confirm(
        '¿Retirar este equipo? Se conservará para trazabilidad.',
      )
    )
      return;
    try {
      await this.retireEquipment.execute(id);
      await this.load();
    } catch {
      this.errorMessage.set('No se ha podido retirar el equipo.');
    }
  }
  private async load(): Promise<void> {
    try {
      const page = await this.listEquipment.execute(undefined, this.pageSize());
      this.items.set(page.items);
      this.nextCursor.set(page.nextCursor);
      this.state.set(page.items.length ? 'success' : 'empty');
    } catch {
      this.state.set('failure');
      this.errorMessage.set('No se ha podido cargar el equipamiento.');
    }
  }
}
