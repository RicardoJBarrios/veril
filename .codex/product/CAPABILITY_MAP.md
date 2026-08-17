# Product Capability Map

This is a product map, not a bounded-context map, code structure or delivery
commitment. A capability groups an observable product outcome; its use cases may
still be delivered incrementally.

## Current capability

### Species Knowledge

Global, shared Species Profiles provide curated and attributable documentary
knowledge for Livestock identification. Published profiles are reusable across
Aquariums; editorial maintenance, revision history and publication authority
are explicit concerns and are not Aquarium-owned data.

### Aquarium Management

Provides the keeper with a private Aquarium context that can be created,
discovered, selected and used for durable qualitative records.

- Establish Aquarium — accepted and implemented.
- List My Aquariums — accepted and implemented.
- Select Aquarium — accepted and implemented.
- Record Observation — accepted and implemented.
- List Observations — accepted and implemented.
- Configure Aquarium Timezone — implemented for legacy Aquariums without a
  canonical timezone; changing an existing timezone remains out of scope.
- Configure Aquarium Location — implemented as one-way approximate locality
  configuration; correction and relocation remain out of scope.
- Review Local Weather — implemented as an ephemeral provider-backed Workspace
  read model with no Firestore persistence.

These use cases share product language and the Aquarium as their subject, but
they do not require a single large transaction boundary or a shared technical
module.

### Measurements

Provides durable quantitative evidence for the selected Aquarium through a
closed Parameter catalogue.

- Record Measurement — accepted and implemented.
- List Measurements — accepted and implemented.
- Review Measurement Age — accepted and implemented; presents derived age for
  the latest known value without classifying it as fresh or stale.
- Correct Measurement — accepted and implemented as an append-only correction
  Fact with traceable history.
- Parameter History — candidate.
- Configure Parameter Targets — implemented as optional Aquarium-owned keeper
  intervals; see [its specification](../specifications/configure-parameter-targets.md).
- Review Parameter Status — implemented as a derived comparison of latest
  evidence with keeper-owned targets; see
  [its specification](../specifications/review-parameter-status.md).

`Configure Parameter Targets` defines optional Aquarium-owned operating
intervals; it does not introduce biological defaults or status interpretation.
`Review Parameter Status` is implemented in the Dashboard Store and remains
derived; it does not introduce biological defaults, freshness thresholds or
persisted status.

Measurement remains an independent aggregate and does not become part of the
Aquarium transaction boundary.

### Timeline — accepted first increment

The first Timeline increment is `Review Recent Timeline`: a bounded read model
that combines existing Observation, Measurement and Care Work history without
becoming a source of truth. Complete historical pagination and materialization
remain future decisions.

## Candidate capabilities

### Care

- Record Care Work — accepted and implemented.
- List Care Work — accepted and implemented as bounded recent history.
- Plan Care Work — accepted and implemented.
- Complete Planned Care Work — accepted and implemented.
- Cancel Planned Care Work — accepted and implemented.
- Establish Weekly Recurring Care — accepted and implemented.
- Review Due Care — accepted and implemented; derived overdue/upcoming
  awareness remains presentation state.
- Aquarium-local Time Presentation — accepted and implemented as a
  cross-cutting presentation policy.
- Monthly recurrence, multiple weekdays, editing and pause — deferred.

### Timeline — future increments

- Review complete Timeline history
- Timeline filters
- Contextual navigation

Timeline remains a read model over accepted durable records, not an independent
source of truth.

### Livestock

Manage individual or grouped organisms associated with an Aquarium and link
them to globally shared Species Profiles. The first accepted increment supports
owner-scoped association, transfer between owned Aquariums, lifecycle history
and soft removal with traceability. Taxonomy, additional lifecycle states,
Species Profile editorial workflow and source-record associations remain
deferred.

### Equipment

Manage devices and care-supporting equipment once identity, ownership, state and
sharing rules are validated.

### Maintenance

- Record Water Change — accepted as the first Maintenance increment. It records
  a completed replacement volume as an independent append-only fact.
- Planned maintenance, feeding, service history and correction — deferred.

### Notifications

Surface alerts and reminders once semantics, consent, severity and delivery
behavior are accepted.

### Automation

Evaluate rules and recommend or perform actions only after safety, authority,
audit and failure behavior are defined.

### AI Assistance

Provide attributable assistance over trusted evidence. It is optional and must
not become a prerequisite for recording, reviewing or operating an Aquarium.

## Evolution rule

Capabilities are planning units, not architecture mandates. Split or combine a
capability only when accepted use cases reveal different language, ownership,
authorization or consistency needs. Do not create a library, aggregate or
infrastructure boundary solely because a capability appears on this map.
