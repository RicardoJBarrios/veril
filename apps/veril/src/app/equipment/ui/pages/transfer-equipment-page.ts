import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { ActiveAquariumContext } from '../../../shared/application/active-aquarium-context';
import { aquariumIdFrom } from '../../../shared/domain/aquarium-reference';
import { TransferEquipment } from '../../application/transfer-equipment';
import { ListEquipment } from '../../application/list-equipment';
import { EquipmentAquariumOption } from '../../application/ports';
import { Equipment } from '../../domain/equipment';
import { equipmentIdFrom } from '../../domain/equipment';
import {
  EQUIPMENT_AQUARIUM_CATALOG,
  EQUIPMENT_READER,
  EQUIPMENT_WRITER,
  KEEPER_SESSION,
} from '../providers';

@Component({
  selector: 'veril-transfer-equipment-page',
  imports: [FormsModule, MatButtonModule, MatCardModule, RouterLink],
  templateUrl: './transfer-equipment-page.html',
  styleUrl: './transfer-equipment-page.css',
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
      provide: TransferEquipment,
      useFactory: () =>
        new TransferEquipment(
          inject(EQUIPMENT_WRITER),
          inject(KEEPER_SESSION),
          inject(ActiveAquariumContext),
        ),
    },
  ],
})
export class TransferEquipmentPage implements OnInit {
  private readonly listEquipment = inject(ListEquipment);
  private readonly transferEquipment = inject(TransferEquipment);
  private readonly session = inject(KEEPER_SESSION);
  private readonly catalog = inject(EQUIPMENT_AQUARIUM_CATALOG);
  private readonly context = inject(ActiveAquariumContext);
  readonly items = signal<readonly Equipment[]>([]);
  readonly aquariums = signal<readonly EquipmentAquariumOption[]>([]);
  readonly equipmentId = signal('');
  readonly aquariumId = signal('');
  readonly state = signal<
    'loading' | 'ready' | 'saving' | 'success' | 'failure'
  >('loading');
  readonly errorMessage = signal('');
  ngOnInit(): void {
    void this.load();
  }
  async submit(): Promise<void> {
    this.state.set('saving');
    try {
      await this.transferEquipment.execute(
        equipmentIdFrom(this.equipmentId()),
        aquariumIdFrom(this.aquariumId()),
      );
      this.state.set('success');
    } catch {
      this.errorMessage.set('No se ha podido transferir el equipo.');
      this.state.set('failure');
    }
  }
  private async load(): Promise<void> {
    try {
      const keeper = await this.session.requireAuthenticatedKeeper();
      const current = this.context.get();
      if (!current) throw new Error('Aquarium context is required');
      const [items, aquariums] = await Promise.all([
        this.listEquipment.execute(),
        this.catalog.listOwned(keeper.id),
      ]);
      this.items.set(items.items);
      this.aquariums.set(
        aquariums.filter((aquarium) => aquarium.id !== current),
      );
      this.equipmentId.set(items.items[0]?.id ?? '');
      this.aquariumId.set(
        aquariums.find((aquarium) => aquarium.id !== current)?.id ?? '',
      );
      this.state.set('ready');
    } catch {
      this.errorMessage.set('No se han podido cargar los equipos y acuarios.');
      this.state.set('failure');
    }
  }
}
