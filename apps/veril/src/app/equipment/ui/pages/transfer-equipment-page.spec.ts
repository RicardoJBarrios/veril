import { createComponentFactory, Spectator } from '@ngneat/spectator/vitest';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ActiveAquariumContext } from '../../../shared/application/active-aquarium-context';
import { ActiveAquariumContextStorage } from '../../../shared/application/active-aquarium-context-storage';
import { aquariumIdFrom } from '../../../shared/domain/aquarium-reference';
import { KeeperSession } from '../../../shared/application/keeper-session';
import { ListEquipment } from '../../application/list-equipment';
import { TransferEquipment } from '../../application/transfer-equipment';
import { Equipment } from '../../domain/equipment';
import { EQUIPMENT_AQUARIUM_CATALOG, KEEPER_SESSION } from '../providers';
import { TransferEquipmentPage } from './transfer-equipment-page';

const currentAquariumId = aquariumIdFrom(
  '123e4567-e89b-42d3-a456-426614174000',
);
const destinationAquariumId = aquariumIdFrom(
  '123e4567-e89b-42d3-a456-426614174002',
);
const equipment: Equipment = {
  id: '123e4567-e89b-42d3-a456-426614174001' as Equipment['id'],
  aquariumId: currentAquariumId,
  category: 'filtration',
  name: 'Skimmer',
  lifecycle: 'active',
  associationHistory: [
    {
      aquariumId: currentAquariumId,
      associatedAt: new Date('2026-08-08T10:00:00.000Z'),
    },
  ],
  associatedAt: new Date('2026-08-08T10:00:00.000Z'),
  updatedAt: new Date('2026-08-08T10:00:00.000Z'),
};

describe('TransferEquipmentPage', () => {
  const listExecute = vi.fn();
  const transferExecute = vi.fn();
  const listOwned = vi.fn();
  const keeperSession: KeeperSession = {
    requireAuthenticatedKeeper: vi.fn().mockResolvedValue({ id: 'keeper-1' }),
  };

  const createComponent = createComponentFactory({
    component: TransferEquipmentPage,
    providers: [
      provideRouter([]),
      { provide: KEEPER_SESSION, useValue: keeperSession },
      { provide: EQUIPMENT_AQUARIUM_CATALOG, useValue: { listOwned } },
      {
        provide: ActiveAquariumContext,
        useFactory: () => {
          const storage: ActiveAquariumContextStorage = {
            load: vi.fn(),
            save: vi.fn(),
            clear: vi.fn(),
          };
          const context = new ActiveAquariumContext(storage);
          context.select(currentAquariumId);
          return context;
        },
      },
    ],
    overrideComponents: [
      [
        TransferEquipmentPage,
        {
          set: {
            providers: [
              { provide: ListEquipment, useValue: { execute: listExecute } },
              {
                provide: TransferEquipment,
                useValue: { execute: transferExecute },
              },
            ],
          },
        },
      ],
    ],
  });

  beforeEach(() => {
    listExecute.mockReset();
    transferExecute.mockReset();
    listOwned.mockReset();
    listExecute.mockResolvedValue({ items: [equipment] });
    listOwned.mockResolvedValue([
      { id: currentAquariumId, displayName: 'Acuario actual' },
      { id: destinationAquariumId, displayName: 'Acuario destino' },
    ]);
    transferExecute.mockResolvedValue(undefined);
  });

  async function settle(spectator: Spectator<TransferEquipmentPage>) {
    await spectator.fixture.whenStable();
    spectator.detectChanges();
  }

  it('loads active equipment and excludes the current aquarium', async () => {
    const spectator = createComponent();
    await settle(spectator);

    expect(spectator.component.state()).toBe('ready');
    expect(spectator.component.items()).toEqual([equipment]);
    expect(spectator.component.aquariums()).toEqual([
      { id: destinationAquariumId, displayName: 'Acuario destino' },
    ]);
    expect(spectator.component.equipmentId()).toBe(equipment.id);
    expect(spectator.component.aquariumId()).toBe(destinationAquariumId);
  });

  it('transfers the selected equipment to the selected aquarium', async () => {
    const spectator = createComponent();
    await settle(spectator);

    await spectator.component.submit();

    expect(transferExecute).toHaveBeenCalledWith(
      equipment.id,
      destinationAquariumId,
    );
    expect(spectator.component.state()).toBe('success');
  });

  it('shows a failure state when the transfer cannot be completed', async () => {
    transferExecute.mockRejectedValue(new Error('permission denied'));
    const spectator = createComponent();
    await settle(spectator);

    await spectator.component.submit();

    expect(spectator.component.state()).toBe('failure');
    expect(spectator.component.errorMessage()).toBe(
      'No se ha podido transferir el equipo.',
    );
  });
});
