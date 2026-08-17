export const AQUARIUM_ACCESS_PERMISSIONS = [
  'aquarium',
  'measurements',
  'observations',
  'careWorks',
  'plannedCareWorks',
  'recurringCarePlans',
  'livestock',
  'equipment',
  'waterChanges',
] as const;

export type AquariumAccessPermission =
  (typeof AQUARIUM_ACCESS_PERMISSIONS)[number];

export type AquariumAccessPermissions = Partial<
  Record<AquariumAccessPermission, boolean>
>;

export type AquariumAccessGrant = {
  readonly id: string;
  readonly granteeUserId: string;
  readonly permissions: AquariumAccessPermissions;
  readonly status: 'active' | 'revoked';
};

export type AquariumAccessInvitation = {
  readonly code: string;
  readonly permissions: AquariumAccessPermissions;
};

export type SharedAquariumView = {
  readonly aquariumName: string;
  readonly sections: Readonly<
    Partial<Record<AquariumAccessPermission, number>>
  >;
};

export interface AquariumAccessService {
  createInvitation(input: {
    readonly aquariumId: string;
    readonly ownerId: string;
    readonly permissions: AquariumAccessPermissions;
  }): Promise<AquariumAccessInvitation>;
  listGrants(input: {
    readonly aquariumId: string;
    readonly ownerId: string;
  }): Promise<readonly AquariumAccessGrant[]>;
  revokeGrant(input: {
    readonly grantId: string;
    readonly revokedAt: Date;
  }): Promise<void>;
  readSharedAquarium(input: {
    readonly aquariumId: string;
  }): Promise<SharedAquariumView>;
}
