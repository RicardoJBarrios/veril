# Domain Rules

This document describes business truths, not architecture or implementation.
Rules are classified to avoid turning assumptions into code prematurely.

## Keeper and Aquarium cardinality

- A keeper may own or manage zero, one or many independent Aquariums.
- Each Aquarium is an independent aggregate root.
- In the first version, each Aquarium has one owning keeper. The owner may
  grant explicit read-only access to selected Aquarium resources for another
  authenticated user.

## Accepted rules for delegated Aquarium access

- A delegated access grant belongs to exactly one Aquarium and one grantee.
- The owner chooses the readable resource categories independently: Aquarium
  metadata, Measurements, Observations, Care Work, Planned Care Work or
  Livestock or Equipment.
- A delegated grantee cannot create, update, delete, transfer or revoke any
  Aquarium data or access grant.
- The owner may revoke a grant. Revocation is retained for traceability and
  immediately prevents further reads.
- Delegated access is scoped to the selected Aquarium and does not grant
  access to the owner's other Aquariums.
- Firebase custom claims remain global capabilities; per-Aquarium grants are
  persisted relationships and are not encoded as claims.

## Accepted rules for Establish an Aquarium

- A user with the Firebase custom claim `isKeeper: true` may establish any
  number of independent private Aquariums. Each Aquarium has one owning keeper
  in this first version; authentication without that claim is not sufficient.
- Establishment requires only an Aquarium name. It creates no Display, System,
  Equipment, Livestock or public representation.
- An Aquarium name is non-empty after surrounding whitespace is trimmed; no
  other naming rule is accepted for this slice.
- A successful establishment creates one durable Fact classified as
  `AquariumEstablished`. Later name or visibility changes do not rewrite that
  occurrence.
- `AquariumEstablished` occurs exactly once per Aquarium lifecycle, only after
  the root is successfully established. A failed attempt creates no event;
  retries create a second event only when they establish a distinct Aquarium.
- Establishment is online-required. These rules apply only to this use case and
  do not decide future ownership, cardinality or offline policy.

## Accepted rules for Record Care Work

- Care Work records one intentional action already performed for exactly one
  Aquarium in the first version.
- Care Work is an independent aggregate root and durable Fact. It references
  `AquariumId` and does not belong to the Aquarium aggregate consistency
  boundary.
- A Care Work record requires a non-empty description, `performedAt`,
  `recordedAt` and provenance `manual`.
- `performedAt` describes when the action happened; `recordedAt` describes when
  Veril accepted the evidence.
- Only the owning authenticated keeper may record Care Work. Active Context is
  not authorization.
- The first slice is append-only and online-required. Planning, recurrence,
  reminders, correction, deletion and offline synchronization are deferred.
- Recording Care Work does not automatically create a Domain Event.

## Accepted rules for Record Water Change

- A Water Change records one completed water replacement for exactly one
  Aquarium and is an independent Maintenance aggregate and durable Fact.
- The replacement volume is required, finite and strictly positive, expressed
  in litres. A Water Change cannot be inferred from a Measurement or Care Work.
- `performedAt` describes when the replacement happened; `recordedAt` describes
  when Veril accepted the evidence. Both are retained and must be valid.
- Notes are optional free text and are trimmed at the domain boundary; they do
  not replace the required volume or timestamps.
- Only the owning authenticated keeper may create or privately read Water
  Changes. A delegated guest may read them only through an explicit
  Aquarium-scoped `waterChanges` grant.
- Water Changes are append-only and online-required in the first slice.
  Editing, deletion, correction, scheduling, chemistry and batch provenance
  require separate accepted decisions.
- Recording a Water Change does not create a Measurement, Care Work record or
  Timeline source automatically.

## Accepted rules for Planned Care Work

- Planned work and completed Care Work remain separate records: completion
  creates a Care Work fact and removes the plan atomically; cancellation removes
  an unperformed plan without creating a Fact or Timeline item.

## Accepted rules for Weekly Recurring Care

- A Recurring Care Plan is a Care-specific independent aggregate that defines
  one weekly calendar intention for one owned Aquarium. It is neither a generic
  Task nor a scheduler.
- The Aquarium time zone is the single authoritative IANA time zone for its
  calendar Care. A keeper confirms it explicitly when recurrence first needs
  it; Veril never silently derives it from the active browser.
- The first recurring occurrence is chosen explicitly. Its local weekday and
  `HH:mm` time define the weekly rule; the schedule remains at that local clock
  time across daylight-saving changes.
- A recurring plan has at most one concrete outstanding Planned Care Work.
  That occurrence remains actionable even when overdue and blocks creation of
  another occurrence.
- Recurrence is schedule-driven. Completing or cancelling an occurrence creates
  the first scheduled occurrence strictly after the later of the occurrence's
  scheduled instant and the action time. It never recreates missed backlog.
- Cancelling an occurrence does not stop its recurring plan. Stopping a
  recurring plan is a separate operation that deletes the plan and its current
  outstanding occurrence without creating a Fact or Timeline item.
- A generated occurrence has provenance `recurring-plan`; a resulting Care
  Work remains `manual` because the keeper confirms that the work was actually
  performed.
- Calendar correctness belongs to the domain/application calculation. Rules
  protect ownership and structural links; a keeper manipulating their own
  future schedule does not authorize access to another Aquarium or create a
  historical Fact.

## Accepted rules for Configure Aquarium Timezone

- An authenticated owner may configure the `timeZone` of an Aquarium only when
  it is currently absent.
- Configuration requires explicit keeper confirmation of a valid IANA timezone
  identifier. The browser timezone is only a proposal, never silent domain
  truth.
- Configuration changes presentation and future calendar authority; it does
  not rewrite historical absolute instants or mutate Measurements,
  Observations, Care Work, Planned Care Work or Recurring Care Plans.
- Changing or clearing an existing Aquarium timezone is not part of this use
  case. Correction and physical relocation require a separate accepted
  decision before any existing schedule semantics are changed.
- The operation creates no Fact or Domain Event and is online-required.

## Accepted rules for Aquarium Location and Local Weather

- An Aquarium may transition from no location to one confirmed approximate
  location. Coordinates are rounded to two decimals and remain within WGS84
  latitude/longitude bounds; the locality label is non-empty.
- Only the authenticated owner may configure a missing location. Correction and
  physical relocation are separate future decisions.
- Location configuration does not rewrite historical timestamps, Measurements,
  Observations, Care Work or recurrence data.
- Local Weather is an ephemeral external read model. It is not persisted,
  treated as Aquarium evidence or included in Timeline; provider failure must
  not block Aquarium operational capabilities.

## Measurement age

- A persisted `Measurement` remains durable evidence regardless of age.
- The age of a Measurement is derived from `measuredAt` and an explicit current
  instant; it is not persisted and does not mutate the Measurement.
- Measurement cadence and freshness thresholds are separate product decisions
  and are not implied by the Measurement catalogue. Parameter Status compares
  only the latest known value with an explicit keeper target.

## Accepted rules for Correct Measurement

- Only the owning authenticated keeper may correct a Measurement.
- A correction creates one new immutable Measurement Fact referencing the
  original through `correctsMeasurementId`; it never updates or deletes the
  original.
- The original Parameter and canonical Unit remain unchanged. The correction
  may replace only the value and `measuredAt` in this increment.
- An original Measurement may be corrected at most once. A correction cannot
  itself be corrected in this increment.
- The replacement and its technical uniqueness marker are created atomically.
- A delegated guest may read the original and replacement when the Aquarium
  grant includes `measurements`, but cannot create, correct or delete either.

## Parameter policy

- The MVP Parameter catalogue is closed and system-defined; users cannot add
  custom Parameters.
- All five current Parameters are measurable and targetable, but no biological
  interpretation is accepted by default.
- A future Parameter Target belongs to Aquarium configuration and does not alter
  Measurement validity, provenance or historical meaning.
- A Parameter Target is an optional keeper-owned interval identified by
  `AquariumId + ParameterId`; there is at most one per Parameter, with finite
  non-negative canonical values and `minimum <= maximum`.
- The target map is persisted with Aquarium configuration. Absence means
  `uninterpreted`; there are no product defaults, target history or status
  persistence.
- Parameter Status is derived application state, not a Fact, Domain Event or
  persisted Measurement state. It classifies a known value as `below`,
  `within`, `above` or `uninterpreted` against an explicit target; Measurement
  Age remains independent and missing evidence has no value classification.

## Candidate invariants requiring validation

Other business invariants remain unaccepted. The following hypotheses must be
decided in a use-case specification before code, Rules, events or persistence
enforce them:

- Whether an Aquarium is the ownership boundary for Measurements.
- Whether Measurement corrections may include a reason or appear differently
  in Timeline remains a presentation decision.
- Livestock belongs to one Aquarium at a time; an accepted transfer records the
  previous association and moves it to another Aquarium owned by the keeper.
- Whether future Water Change corrections are compensating Facts or an explicit
  correction workflow.
- Whether an Observation may correct, qualify or otherwise relate to a
  Measurement.

## Soft conventions

These are preferred behaviors, but require product confirmation before becoming
enforced invariants:

- Equipment is an independent aggregate owned by the keeper through one
  Aquarium association at a time. Read-only sharing is granted per Aquarium;
  shared ownership is not part of the first workflow.
- Measurements may need timestamp, source and provenance where available.
- Events may need stable identifiers and original time.
- Timeline views should expose stale, cached or pending information clearly.
- Destructive changes may need explicit history when the domain requires
  auditability.

## Future rules

These are likely to matter but must wait for concrete features:

- Sensor calibration and measurement-quality rules.
- Controller safety limits and automation authorization.
- Alert severity, acknowledgement and resolution.
- Sensors, controllers, installation state, failure state and automation
  authority for Equipment.
- Livestock transfer, grouping and identification history are governed by the
  accepted Add Livestock specification; further lifecycle states remain future.
- Species Profiles are globally shared documentary Knowledge, not owned by a
  keeper or Aquarium. Published content is publicly readable; maintenance is
  restricted to a persistent keeper with the Firebase `editorialAdmin: true`
  custom claim, and objective claims require attribution.
- Conflict policy for concurrent edits to domain records.

## Unknown rules

The following are intentionally unresolved:

- Whether `Display` requires its own identity or lifecycle within the Aquarium
  aggregate.
- The accepted Livestock slice represents both individuals and groups; species
  taxonomy remains unresolved.
- Whether a Measurement can be corrected through a compensating Event.
- Which parameters are mandatory for each type of Aquarium.
- Which domain Events may be created offline.

Do not implement unknown rules by inference. Capture the decision with a domain
specification or ADR when the first affected feature is designed.
