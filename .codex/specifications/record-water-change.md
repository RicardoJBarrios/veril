# Record Water Change

**Status:** Accepted for implementation as the first Maintenance increment

## User value

The keeper can preserve an exact water-replacement operation and distinguish it
from free-form Care Work, Measurements and observations.

## Actor and trigger

The actor is an authenticated aquarium keeper. The trigger is the keeper
recording a completed water change for the selected Aquarium.

## Preconditions

- the keeper has an authenticated session with `isKeeper: true`;
- Active Context contains an Aquarium owned by the keeper;
- the keeper supplies a positive finite replacement volume in litres;
- the keeper supplies a valid time for when the change occurred.

## Scope

This slice records one completed water change. It does not calculate salinity,
temperature or chemistry, manage a reservoir, track salt batches, create a
Measurement, modify Equipment or Livestock, plan future work, send reminders,
or infer that the change improved an Observation.

## Aggregate and domain meaning

`WaterChange` is an independent Maintenance aggregate root and durable Fact. It
references `AquariumId` but is not part of the Aquarium consistency boundary.
It is not a generic Care Work record because its replacement volume is a
required domain fact with its own unit and validation.

The first aggregate contains:

- `WaterChangeId`;
- `AquariumId`;
- `volumeLitres`, a finite positive number;
- `performedAt`, when the replacement happened;
- `recordedAt`, when Veril accepted the evidence;
- optional trimmed notes;
- provenance `manual`.

The aggregate is append-only in this increment. Editing, deletion, correction,
batch provenance, salinity and water-source details require separate accepted
use cases. The original fact remains available for traceability.

## Main flow

1. Require an authenticated keeper.
2. Require the current Active Context.
3. Validate the positive finite volume, dates and optional notes.
4. Persist one Water Change for the selected owned Aquarium.
5. Confirm that the operation was saved.

## Read flow

The keeper can list recent Water Changes for the selected Aquarium. The read
uses cursor pagination with the shared bounded page policy and orders records by
`performedAt` descending, `recordedAt` descending and `WaterChangeId` ascending.
An empty page is valid and does not imply that no historical records exist
beyond the current page.

## Authorization and sharing

- only the owning keeper may create a Water Change;
- only the owning keeper may list, read or otherwise access the private source;
- a delegated guest may read Water Changes only when the Aquarium owner grants
  the `waterChanges` permission;
- a guest cannot create, update, delete or otherwise mutate the record;
- the grant is scoped to one Aquarium and revocation takes effect immediately;
- Active Context is never authorization.

Firebase custom claims provide global capabilities such as `isKeeper`; the
per-Aquarium `waterChanges` grant remains a persisted relationship.

## Persistence boundary

Water Changes use a dedicated top-level `waterChanges` collection. Documents
contain the domain fields plus `ownerId` for Rules authorization. Firestore
timestamps and transport DTOs remain infrastructure concerns and are validated
with Zod before reconstruction.

The operation is online-required. No offline queue, optimistic success or
synchronization policy is introduced.

## UX acceptance criteria

- the selected-Aquarium workflow exposes `Registrar cambio de agua`;
- loading, no-context, empty, validation, saving, success and recoverable error
  states are explicit and accessible;
- the form uses litres and an Aquarium-local date/time input;
- a successful record can be found in `Ver cambios de agua`;
- a delegated guest with `waterChanges` can read the list but sees no write
  controls and cannot mutate through the API.

## Testing path

- domain: volume, notes and timestamp invariants;
- application: authentication, context, success, validation and failure;
- adapter: Zod reconstruction, pagination and persisted shape against the
  Firebase Emulator;
- Rules: owner write, owner read, unauthenticated rejection, cross-owner
  rejection, guest read grant and guest write rejection;
- Angular: all relevant form and list states;
- E2E: keeper records and lists a Water Change; guest read-only access is
  covered in the shared-permission journey.

## Explicitly deferred

Water-change correction, deletion, scheduled maintenance, recurring work,
feeding, equipment service plans, chemical calculations, automatic measurements
and notification semantics remain outside this slice.

## Definition of Ready

The first Maintenance slice has an accepted actor, user value, aggregate,
invariants, ownership, sharing, persistence, pagination, UX and validation
path. The deferred questions are explicit and are not implemented by inference.
