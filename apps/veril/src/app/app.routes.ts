import { Route } from '@angular/router';
import { authenticatedAccessGuard } from './shared/ui/guards/authenticated-access.guard';
import { editorialAccessGuard } from './shared/ui/guards/editorial-access.guard';
import { keeperAccessGuard } from './shared/ui/guards/keeper-access.guard';

export const appRoutes: Route[] = [
  {
    path: 'access/accept',
    canActivate: [authenticatedAccessGuard],
    loadComponent: () =>
      import('./shared-access/ui/accept-aquarium-invitation-page').then(
        ({ AcceptAquariumInvitationPage }) => AcceptAquariumInvitationPage,
      ),
  },
  {
    path: 'shared/aquariums/:aquariumId',
    canActivate: [authenticatedAccessGuard],
    loadComponent: () =>
      import('./shared-access/ui/shared-aquarium-page').then(
        ({ SharedAquariumPage }) => SharedAquariumPage,
      ),
  },
  {
    path: 'sign-in',
    loadComponent: () =>
      import('./species-knowledge/ui/pages/editorial-sign-in-page').then(
        ({ EditorialSignInPage }) => EditorialSignInPage,
      ),
  },
  {
    path: 'editorial/species-knowledge',
    canActivate: [editorialAccessGuard],
    loadChildren: () =>
      import('./composition/editorial/editorial.routes').then(
        ({ EDITORIAL_SPECIES_KNOWLEDGE_ROUTES }) =>
          EDITORIAL_SPECIES_KNOWLEDGE_ROUTES,
      ),
  },
  {
    path: '',
    loadComponent: () =>
      import('./shells/public-shell/public-shell').then(
        ({ PublicShell }) => PublicShell,
      ),
    children: [
      {
        path: 'species-knowledge/:id',
        loadComponent: () =>
          import('./species-knowledge/ui/pages/species-profile-page').then(
            ({ SpeciesProfilePage }) => SpeciesProfilePage,
          ),
      },
    ],
  },
  {
    path: 'app',
    canActivate: [keeperAccessGuard],
    loadComponent: () =>
      import('./shells/private-shell/private-shell').then(
        ({ PrivateShell }) => PrivateShell,
      ),
    children: [
      {
        path: 'aquariums',
        pathMatch: 'full',
        loadComponent: () =>
          import('./aquarium-management/ui/pages/list-my-aquariums-page').then(
            ({ ListMyAquariumsPage }) => ListMyAquariumsPage,
          ),
      },
      {
        path: 'aquariums/new',
        loadComponent: () =>
          import('./aquarium-management/ui/pages/establish-aquarium-page').then(
            ({ EstablishAquariumPage }) => EstablishAquariumPage,
          ),
      },
      {
        path: 'aquariums/current',
        loadComponent: () =>
          import('./composition/aquarium-dashboard/aquarium-dashboard-page').then(
            ({ AquariumDashboardPage }) => AquariumDashboardPage,
          ),
      },
      {
        path: 'aquariums/access',
        loadComponent: () =>
          import('./shared-access/ui/pages/manage-aquarium-access-page').then(
            ({ ManageAquariumAccessPage }) => ManageAquariumAccessPage,
          ),
      },
      {
        path: 'aquariums/timezone',
        loadComponent: () =>
          import('./aquarium-management/ui/pages/configure-aquarium-time-zone-page').then(
            ({ ConfigureAquariumTimeZonePage }) =>
              ConfigureAquariumTimeZonePage,
          ),
      },
      {
        path: 'aquariums/location',
        loadComponent: () =>
          import('./aquarium-management/ui/pages/configure-aquarium-location-page').then(
            ({ ConfigureAquariumLocationPage }) =>
              ConfigureAquariumLocationPage,
          ),
      },
      {
        path: 'aquariums/parameter-targets',
        loadComponent: () =>
          import('./aquarium-management/ui/pages/configure-parameter-targets-page').then(
            ({ ConfigureParameterTargetsPage }) =>
              ConfigureParameterTargetsPage,
          ),
      },
      {
        path: 'aquariums/equipment',
        pathMatch: 'full',
        loadComponent: () =>
          import('./equipment/ui/pages/list-equipment-page').then(
            ({ ListEquipmentPage }) => ListEquipmentPage,
          ),
      },
      {
        path: 'aquariums/equipment/new',
        loadComponent: () =>
          import('./equipment/ui/pages/equipment-form-page').then(
            ({ EquipmentFormPage }) => EquipmentFormPage,
          ),
      },
      {
        path: 'aquariums/equipment/transfer',
        loadComponent: () =>
          import('./equipment/ui/pages/transfer-equipment-page').then(
            ({ TransferEquipmentPage }) => TransferEquipmentPage,
          ),
      },
      {
        path: 'aquariums/equipment/:id',
        loadComponent: () =>
          import('./equipment/ui/pages/equipment-form-page').then(
            ({ EquipmentFormPage }) => EquipmentFormPage,
          ),
      },
      {
        path: 'aquariums/livestock',
        pathMatch: 'full',
        loadComponent: () =>
          import('./livestock/ui/pages/list-livestock-page').then(
            ({ ListLivestockPage }) => ListLivestockPage,
          ),
      },
      {
        path: 'aquariums/livestock/new',
        loadComponent: () =>
          import('./livestock/ui/pages/add-livestock-page').then(
            ({ AddLivestockPage }) => AddLivestockPage,
          ),
      },
      {
        path: 'aquariums/livestock/transfer',
        loadComponent: () =>
          import('./livestock/ui/pages/transfer-livestock-page').then(
            ({ TransferLivestockPage }) => TransferLivestockPage,
          ),
      },
      {
        path: 'aquariums/livestock/history',
        loadComponent: () =>
          import('./livestock/ui/pages/livestock-history-page').then(
            ({ LivestockHistoryPage }) => LivestockHistoryPage,
          ),
      },
      {
        path: 'aquariums/livestock/:id',
        loadComponent: () =>
          import('./livestock/ui/pages/livestock-detail-page').then(
            ({ LivestockDetailPage }) => LivestockDetailPage,
          ),
      },
      {
        path: 'aquariums/observations/new',
        loadComponent: () =>
          import('./observations/ui/pages/record-observation-page').then(
            ({ RecordObservationPage }) => RecordObservationPage,
          ),
      },
      {
        path: 'aquariums/observations',
        loadComponent: () =>
          import('./observations/ui/pages/list-observations-page').then(
            ({ ListObservationsPage }) => ListObservationsPage,
          ),
      },
      {
        path: 'aquariums/measurements',
        loadComponent: () =>
          import('./measurements/ui/pages/list-measurements-page').then(
            ({ ListMeasurementsPage }) => ListMeasurementsPage,
          ),
      },
      {
        path: 'aquariums/timeline',
        loadComponent: () =>
          import('./timeline/ui/pages/review-recent-timeline-page').then(
            ({ ReviewRecentTimelinePage }) => ReviewRecentTimelinePage,
          ),
      },
      {
        path: 'aquariums/measurements/:id/correct',
        loadComponent: () =>
          import('./measurements/ui/pages/record-measurement-page').then(
            ({ RecordMeasurementPage }) => RecordMeasurementPage,
          ),
      },
      {
        path: 'aquariums/measurements/new',
        loadComponent: () =>
          import('./measurements/ui/pages/record-measurement-page').then(
            ({ RecordMeasurementPage }) => RecordMeasurementPage,
          ),
      },
      {
        path: 'aquariums/care/new',
        loadComponent: () =>
          import('./care/ui/pages/record-care-work-page').then(
            ({ RecordCareWorkPage }) => RecordCareWorkPage,
          ),
      },
      {
        path: 'aquariums/maintenance/new',
        loadComponent: () =>
          import('./maintenance/ui/pages/record-water-change-page').then(
            ({ RecordWaterChangePage }) => RecordWaterChangePage,
          ),
      },
      {
        path: 'aquariums/maintenance',
        loadComponent: () =>
          import('./maintenance/ui/pages/list-water-changes-page').then(
            ({ ListWaterChangesPage }) => ListWaterChangesPage,
          ),
      },
      {
        path: 'aquariums/care/planned/new',
        loadComponent: () =>
          import('./care/ui/pages/plan-care-work-page').then(
            ({ PlanCareWorkPage }) => PlanCareWorkPage,
          ),
      },
      {
        path: 'aquariums/care/recurring/new',
        loadComponent: () =>
          import('./care/ui/pages/establish-weekly-recurring-care-page').then(
            ({ EstablishWeeklyRecurringCarePage }) =>
              EstablishWeeklyRecurringCarePage,
          ),
      },
      {
        path: 'aquariums/care/planned',
        loadComponent: () =>
          import('./care/ui/pages/list-planned-care-work-page').then(
            ({ ListPlannedCareWorkPage }) => ListPlannedCareWorkPage,
          ),
      },
      {
        path: 'aquariums/care',
        loadComponent: () =>
          import('./care/ui/pages/list-care-work-page').then(
            ({ ListCareWorkPage }) => ListCareWorkPage,
          ),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
