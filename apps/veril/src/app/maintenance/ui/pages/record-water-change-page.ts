import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { ActiveAquariumContext } from '../../../shared/application/active-aquarium-context';
import { currentDateTimeLocal } from '../../../shared/ui/date-time-input';
import { FormPageState } from '../../../shared/ui/page-state';
import { RecordWaterChange } from '../../application/record-water-change';
import { KEEPER_SESSION, WATER_CHANGE_WRITER } from '../providers';

@Component({
  selector: 'veril-record-water-change-page',
  imports: [
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    ReactiveFormsModule,
    RouterLink,
  ],
  templateUrl: './record-water-change-page.html',
  styleUrl: './record-water-change-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: RecordWaterChange,
      useFactory: () =>
        new RecordWaterChange(
          inject(WATER_CHANGE_WRITER),
          inject(KEEPER_SESSION),
          inject(ActiveAquariumContext),
        ),
    },
  ],
})
export class RecordWaterChangePage {
  private readonly recordWaterChange = inject(RecordWaterChange);
  private readonly activeContext = inject(ActiveAquariumContext);
  readonly state = signal<FormPageState>('ready');
  readonly errorMessage = signal('');
  readonly form = new FormGroup({
    volumeLitres: new FormControl<number | null>(null, {
      validators: [Validators.required, Validators.min(Number.MIN_VALUE)],
    }),
    performedAt: new FormControl(currentDateTimeLocal(), {
      nonNullable: true,
      validators: [Validators.required],
    }),
    notes: new FormControl('', { nonNullable: true }),
  });

  get hasActiveContext(): boolean {
    return this.activeContext.get() !== null;
  }

  async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const performedAt = new Date(this.form.controls.performedAt.value);
    if (Number.isNaN(performedAt.getTime())) {
      this.form.controls.performedAt.markAsTouched();
      return;
    }
    this.state.set('saving');
    this.errorMessage.set('');
    try {
      await this.recordWaterChange.execute(
        this.form.controls.volumeLitres.value as number,
        performedAt,
        this.form.controls.notes.value,
      );
      this.form.reset({
        volumeLitres: null,
        performedAt: currentDateTimeLocal(),
        notes: '',
      });
      this.state.set('success');
    } catch {
      this.errorMessage.set(
        'No se ha podido guardar el cambio de agua. Inténtalo de nuevo.',
      );
      this.state.set('error');
    }
  }
}
