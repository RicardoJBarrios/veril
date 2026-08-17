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
import { systemClock } from '../../../shared/application/clock';
import {
  AQUARIUM_ACCESS_PERMISSIONS,
  AquariumAccessGrant,
  AquariumAccessPermission,
  AquariumAccessPermissions,
} from '../../application/ports';
import { FirestoreAquariumAccessService } from '../../infrastructure/firestore-aquarium-access-service';
import { KEEPER_SESSION } from '../../../shared/ui/providers';
import { AQUARIUM_ACCESS_SERVICE } from '../providers';

type PageState = 'loading' | 'ready' | 'saving' | 'failure' | 'no-context';

@Component({
  selector: 'veril-manage-aquarium-access-page',
  imports: [FormsModule, MatButtonModule, MatCardModule, RouterLink],
  templateUrl: './manage-aquarium-access-page.html',
  styleUrl: './manage-aquarium-access-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: FirestoreAquariumAccessService,
      useFactory: () => new FirestoreAquariumAccessService(),
    },
    {
      provide: AQUARIUM_ACCESS_SERVICE,
      useExisting: FirestoreAquariumAccessService,
    },
  ],
})
export class ManageAquariumAccessPage implements OnInit {
  private readonly service = inject(AQUARIUM_ACCESS_SERVICE);
  private readonly keeperSession = inject(KEEPER_SESSION);
  private readonly activeContext = inject(ActiveAquariumContext);

  readonly permissions = AQUARIUM_ACCESS_PERMISSIONS;
  readonly selectedPermissions = signal<AquariumAccessPermissions>({
    aquarium: true,
  });
  readonly grants = signal<readonly AquariumAccessGrant[]>([]);
  readonly invitationCode = signal<string | null>(null);
  readonly state = signal<PageState>('loading');
  readonly errorMessage = signal('');

  ngOnInit(): void {
    void this.load();
  }

  toggle(permission: AquariumAccessPermission, checked: boolean): void {
    this.selectedPermissions.update((current) => ({
      ...current,
      [permission]: checked,
    }));
  }

  async createInvitation(): Promise<void> {
    const aquariumId = this.activeContext.get();
    if (!aquariumId) return;
    this.state.set('saving');
    this.errorMessage.set('');
    try {
      const keeper = await this.keeperSession.requireAuthenticatedKeeper();
      const invitation = await this.service.createInvitation({
        aquariumId,
        ownerId: keeper.id,
        permissions: this.selectedPermissions(),
      });
      this.invitationCode.set(invitation.code);
      this.state.set('ready');
    } catch {
      this.errorMessage.set('No se ha podido crear la invitación.');
      this.state.set('failure');
    }
  }

  async revoke(grant: AquariumAccessGrant): Promise<void> {
    this.state.set('saving');
    try {
      await this.service.revokeGrant({
        grantId: grant.id,
        revokedAt: systemClock.now(),
      });
      this.grants.update((current) =>
        current.map((entry) =>
          entry.id === grant.id ? { ...entry, status: 'revoked' } : entry,
        ),
      );
      this.state.set('ready');
    } catch {
      this.errorMessage.set('No se ha podido revocar el acceso.');
      this.state.set('failure');
    }
  }

  permissionLabel(permission: AquariumAccessPermission): string {
    return {
      aquarium: 'Datos del acuario',
      measurements: 'Mediciones',
      observations: 'Observaciones',
      careWorks: 'Cuidados realizados',
      plannedCareWorks: 'Cuidados planificados',
      recurringCarePlans: 'Planes recurrentes',
      livestock: 'Livestock',
      equipment: 'Equipment',
      waterChanges: 'Cambios de agua',
    }[permission];
  }

  private async load(): Promise<void> {
    const aquariumId = this.activeContext.get();
    if (!aquariumId) {
      this.state.set('no-context');
      return;
    }
    try {
      const keeper = await this.keeperSession.requireAuthenticatedKeeper();
      this.grants.set(
        await this.service.listGrants({
          aquariumId,
          ownerId: keeper.id,
        }),
      );
      this.state.set('ready');
    } catch {
      this.errorMessage.set('No se han podido cargar los accesos.');
      this.state.set('failure');
    }
  }
}
