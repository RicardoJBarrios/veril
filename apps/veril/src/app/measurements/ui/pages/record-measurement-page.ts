import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { ActiveAquariumContext } from '../../../shared/application/active-aquarium-context';
import { RecordMeasurement } from '../../application/record-measurement';
import { CorrectMeasurement } from '../../application/correct-measurement';
import { ReviewMeasurementForCorrection } from '../../application/review-measurement-for-correction';
import { measurementIdFrom, ParameterId } from '../../domain/measurement';
import { KEEPER_SESSION, MEASUREMENT_WRITER } from '../providers';
import {
  PARAMETER_PRESENTATIONS,
  parameterPresentationFor,
} from '../../../shared/ui/parameter-presentation';
import { currentDateTimeLocal } from '../../../shared/ui/date-time-input';
import { FormPageState } from '../../../shared/ui/page-state';

const parameters = PARAMETER_PRESENTATIONS;

type PageState = FormPageState;

@Component({
  selector: 'veril-record-measurement-page',
  imports: [
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    ReactiveFormsModule,
    RouterLink,
  ],
  templateUrl: './record-measurement-page.html',
  styleUrl: './record-measurement-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: RecordMeasurement,
      useFactory: () =>
        new RecordMeasurement(
          inject(MEASUREMENT_WRITER),
          inject(KEEPER_SESSION),
          inject(ActiveAquariumContext),
        ),
    },
  ],
})
export class RecordMeasurementPage implements OnInit {
  private readonly recordMeasurement = inject(RecordMeasurement);
  private readonly correctMeasurement = inject(CorrectMeasurement, {
    optional: true,
  });
  private readonly reviewMeasurementForCorrection = inject(
    ReviewMeasurementForCorrection,
    { optional: true },
  );
  private readonly route = inject(ActivatedRoute);
  private readonly activeContext = inject(ActiveAquariumContext);

  readonly parameters = parameters;
  readonly state = signal<PageState>('ready');
  readonly targetState = signal<'idle' | 'loading' | 'ready' | 'error'>('idle');
  readonly isCorrection = signal(false);
  readonly targetId = signal<ReturnType<typeof measurementIdFrom> | undefined>(
    undefined,
  );
  readonly errorMessage = signal('');
  readonly form = new FormGroup({
    parameterId: new FormControl<ParameterId>('temperature', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    value: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    measuredAt: new FormControl(currentDateTimeLocal(), {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;
    this.isCorrection.set(true);
    this.targetState.set('loading');
    try {
      this.targetId.set(measurementIdFrom(id));
      const targetId = this.targetId();
      if (!targetId) throw new Error('Measurement id is required');
      void this.loadTarget(targetId);
    } catch {
      this.targetState.set('error');
      this.errorMessage.set('La medición indicada no es válida.');
    }
  }

  get hasActiveContext(): boolean {
    return this.activeContext.get() !== null;
  }

  get selectedUnit(): string {
    const parameterId = this.form.controls.parameterId.value;
    return parameterPresentationFor(parameterId).unit;
  }

  async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = Number(this.form.controls.value.value);
    const measuredAt = new Date(this.form.controls.measuredAt.value);
    if (!Number.isFinite(value) || Number.isNaN(measuredAt.getTime())) {
      this.form.controls.value.markAsTouched();
      return;
    }

    this.state.set('saving');
    this.errorMessage.set('');

    try {
      if (this.isCorrection()) {
        const targetId = this.targetId();
        if (!targetId || !this.correctMeasurement)
          throw new Error('Correction unavailable');
        await this.correctMeasurement.execute(targetId, value, measuredAt);
      } else {
        await this.recordMeasurement.execute(
          this.form.controls.parameterId.value,
          value,
          measuredAt,
        );
      }
      this.form.controls.value.reset();
      this.state.set('success');
    } catch {
      this.errorMessage.set(
        'No se ha podido guardar la medición. Inténtalo de nuevo.',
      );
      this.state.set('error');
    }
  }

  private async loadTarget(
    targetId: ReturnType<typeof measurementIdFrom>,
  ): Promise<void> {
    if (!this.reviewMeasurementForCorrection) {
      this.targetState.set('error');
      this.errorMessage.set('No se puede corregir esta medición.');
      return;
    }
    try {
      const target =
        await this.reviewMeasurementForCorrection.execute(targetId);
      this.form.patchValue({
        parameterId: target.parameterId,
        value: String(target.canonicalValue),
        measuredAt: currentDateTimeLocal(target.measuredAt),
      });
      this.form.controls.parameterId.disable();
      this.targetState.set('ready');
    } catch {
      this.targetState.set('error');
      this.errorMessage.set('No se ha podido cargar la medición.');
    }
  }
}
