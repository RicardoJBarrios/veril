import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { ActiveAquariumContext } from '../../../shared/application/active-aquarium-context';
import { systemClock } from '../../../shared/application/clock';
import {
  equipmentIdFrom,
  EQUIPMENT_CATEGORIES,
  editEquipment,
} from '../../domain/equipment';
import { AddEquipment } from '../../application/add-equipment';
import {
  EQUIPMENT_READER,
  EQUIPMENT_WRITER,
  KEEPER_SESSION,
} from '../providers';

@Component({
  selector: 'veril-equipment-form-page',
  imports: [
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    ReactiveFormsModule,
    RouterLink,
  ],
  templateUrl: './equipment-form-page.html',
  styleUrl: './equipment-form-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: AddEquipment,
      useFactory: () =>
        new AddEquipment(
          inject(EQUIPMENT_WRITER),
          inject(KEEPER_SESSION),
          inject(ActiveAquariumContext),
        ),
    },
  ],
})
export class EquipmentFormPage implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly addEquipment = inject(AddEquipment);
  private readonly reader = inject(EQUIPMENT_READER);
  private readonly writer = inject(EQUIPMENT_WRITER);
  private readonly session = inject(KEEPER_SESSION);
  private readonly context = inject(ActiveAquariumContext);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly categories = EQUIPMENT_CATEGORIES;
  readonly editingId = signal<string | null>(null);
  readonly errorMessage = signal('');
  readonly form = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(200)]],
    category: [
      'other' as (typeof EQUIPMENT_CATEGORIES)[number],
      Validators.required,
    ],
    manufacturer: ['', Validators.maxLength(200)],
    model: ['', Validators.maxLength(200)],
    serialNumber: ['', Validators.maxLength(200)],
  });
  async ngOnInit(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;
    this.editingId.set(id);
    const keeper = await this.session.requireAuthenticatedKeeper();
    const item = await this.reader.getOwned(keeper.id, equipmentIdFrom(id));
    if (!item) {
      this.errorMessage.set('Equipo no encontrado.');
      return;
    }
    this.form.patchValue(item);
  }
  async save(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    try {
      const value = this.form.getRawValue();
      const id = this.editingId();
      if (!id) await this.addEquipment.execute(value);
      else {
        const keeper = await this.session.requireAuthenticatedKeeper();
        const aquariumId = this.context.get();
        const current = await this.reader.getOwned(
          keeper.id,
          equipmentIdFrom(id),
        );
        if (!aquariumId || !current) throw new Error('Equipo no encontrado');
        await this.writer.update({
          id: current.id,
          aquariumId,
          ownerKeeperId: keeper.id,
          equipment: editEquipment(current, value, systemClock.now()),
        });
      }
      await this.router.navigateByUrl('/app/aquariums/equipment');
    } catch (error) {
      this.errorMessage.set(
        error instanceof Error
          ? error.message
          : 'No se ha podido guardar el equipo.',
      );
    }
  }
}
