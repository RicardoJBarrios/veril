# Review Recent Timeline

**Status:** Accepted and implemented with Care Work and Water Changes

## User value

An authenticated keeper can answer “what happened recently in this Aquarium?”
by reviewing qualitative Observations, quantitative Measurements, completed
Care Work and recorded Water Changes together in one chronological read
surface.

This is a recent contextual view, not a complete historical archive. The
existing Observation, Measurement, Care Work and Water Change records remain
the sources of truth.

## Actor and preconditions

The actor is an authenticated aquarium keeper with an owned Aquarium in Active
Context. Without an Active Context, no source query is executed and the keeper
is directed to Aquarium selection.

## Scope

The increment reads only the existing Observation, Measurement, Care Work and
Water Change sources. It does not include Domain Events that have no persisted
source yet,
Livestock, Equipment, Interpretations, charts, filters, grouping, editing,
deletion or Timeline mutations.

The result is explicitly bounded to the most recent combined items. The UI must
describe it as recent activity so omission of older records is not presented as
a complete history. Full historical continuation is a later decision.

## Timeline classification

Timeline is an application read model assembled from accepted durable Facts. It
is not an Aggregate, Entity, Fact, Domain Event, persistence source or mutation
API. Observation, Measurement and Care Work remain independent aggregates and
their corrections, if accepted later, belong to their source capabilities.

## Source variants

The read model uses discriminated variants that preserve source meaning:

```text
ObservationTimelineItem
  kind: observation
  observationId
  content
  effectiveAt
  recordedAt

MeasurementTimelineItem
  kind: measurement
  measurementId
  parameterId
  canonicalValue
  canonicalUnit
  effectiveAt
  measuredAt
  recordedAt

CareWorkTimelineItem
  kind: care-work
  careWorkId
  description
  effectiveAt
  performedAt
  recordedAt

WaterChangeTimelineItem
  kind: water-change
  waterChangeId
  volumeLitres
  notes?
  effectiveAt
  performedAt
  recordedAt
```

`effectiveAt` exists only in the read model. It is not added to either source
aggregate or Firestore document.

## Time and ordering

- Observation `effectiveAt` is `recordedAt`, because that is the only accepted
  Observation time and means when Veril accepted the evidence.
- Measurement `effectiveAt` is `measuredAt`, because it represents when the
  quantitative condition was measured.
- Care Work `effectiveAt` is `performedAt`, because it represents when the
  intentional action occurred.
- Water Change `effectiveAt` is `performedAt`, because it represents when the
  recorded maintenance action occurred.

The total order is:

1. `effectiveAt` descending;
2. `recordedAt` descending;
3. source kind using the explicit order `measurement`, `observation`,
   `care-work`, `water-change`;
4. source identifier ascending.

The third and fourth dimensions are deterministic tie-breakers only. They do
not claim that one kind of evidence is more important than another. This order
does not alter either source list's accepted ordering.

## Query architecture

The implementation executes four owner- and Aquarium-scoped bounded queries,
one per source, then merges their read models in the application/read boundary.
It must not read an unbounded collection.

Each source query returns at most the capability-local limit of 20 items. The
merged result returns the newest 20 combined items. The limit is an
implementation detail but is visible in tests and must not be described as
complete history.

This approach keeps source ownership and validation explicit. It avoids a
materialized collection, duplicated writes, projection backfill and a new
trusted write path while usage remains low and manual.

## Pagination and materialization

Full Timeline pagination is deferred. Combining independent cursors requires a
multi-source cursor, stable snapshot semantics and duplicate handling that are
not justified by the current value of a recent bounded view.

`timelineItems` is not introduced now. A materialized projection may become
appropriate when a real consumer needs complete history, low-latency repeated
reads or additional sources beyond the current four. It would then require an
explicit backfill, ownership, consistency and rebuild policy. It must never
replace Observation or Measurement history.

## Ownership and security

Each source query is authorized by the existing Firestore Rules. The application
does not merge data from different Aquariums, and client-side filtering is not
authorization. Timeline exposes no additional private-resource existence.

## UX

The minimum page shows:

- a clear “Actividad reciente” or equivalent heading;
- visibly distinct Observation, Measurement, Care Work and Water Change items;
- the relevant time;
- Observation text;
- Measurement Parameter, canonical value and Unit;
- loading, empty, error and missing-context states.

Material 3 tokens and accessible semantics are reused. Distinction must not
depend on color alone. No Dashboard is required; the page is an action from the
selected Aquarium context.

## Testing path

- application: merge variants, effective-time ordering, ties, empty and source
  failure behavior across all four sources;
- integration: the four owner-scoped source queries, mapping and malformed-
  source rejection;
- Angular: mixed rendering, Care Work and Water Change semantics, loading, empty, error and
  missing context;
- E2E: record one Observation, one Measurement, one Care Work action and one
  Water Change, open recent Timeline and verify all four are visible.

The increment does not require Signal Store, CQRS, Event Sourcing, a
generic projection framework, a generic multi-source paginator or an Nx library.

## Definition of Ready

The increment is ready for implementation because its user value, bounded
scope, source semantics, effective-time rule, deterministic order, ownership,
failure behavior and proportional validation path are explicit. Complete
history pagination and materialization are consciously deferred.
