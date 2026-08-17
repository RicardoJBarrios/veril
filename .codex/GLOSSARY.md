# Ubiquitous Language

This glossary is the canonical vocabulary for code, documentation, ADRs, Issues
and Pull Requests. Prefer these terms and document any deliberate synonym.

## Core concepts

### Aquarium

A manageable marine-aquarium care system. It is the aggregate root and relates
care information, supporting systems, Equipment and Livestock. It does not imply
a user, a single physical vessel, a SaaS tenant, one Aquarium or many Aquariums.

### Display

A physical, observable water-and-life area related to an Aquarium. Whether it
needs identity, lifecycle or a separate representation is use-case-dependent.

### System

A coherent physical, biological or technical arrangement that supports an
Aquarium. It is not automatically an aggregate, a hierarchy or a storage model.

### Livestock

An Aquarium-specific record for one organism or a group of organisms, including
fish, coral and other organisms. It has its own identity, Aquarium association
and lifecycle; it is not the species documentation itself.

### Species Profile

An encyclopedic, globally shared documentary record for a species. It contains
curated and attributable general knowledge intended to describe the species
objectively and may be referenced by many Livestock records. It is not an
Aquarium occurrence, individual/group record or lifecycle.

### Fish

A Livestock category representing a fish individual or group, such as one
clownfish specimen or a group of fish.

### Coral

A Livestock category representing a coral individual or group. A zoanthus
colony is represented as a group in the first Livestock workflow.

### Equipment

A physical or logical device used by an Aquarium or System, such as lighting,
pumps, probes or controllers. In the accepted Equipment workflow it is an
independent aggregate owned by the Aquarium's keeper, associated with one
Aquarium at a time, and retired through a traceable soft delete.

## Observations and operations

### Measurement

A recorded value of a Parameter at a point in time. The correction, provenance,
quality and historical-retention semantics are not yet accepted domain rules.

### Observation

A qualitative or quantitative account of an observed subject or condition. A
Measurement is a quantitative Observation. It becomes a Fact only when an
accepted use case records it durably as evidence; a transient perception or UI
input is not a Fact by itself.

### Fact

A durable, immutable and attributable claim accepted by the system as evidence
of something recorded or that occurred. A Fact retains its provenance and time
of occurrence or recording; when both are known, both are retained. It is
evidence about an Aquarium, not a guarantee of its complete state. A correction
is a new Fact that refers to the earlier evidence; it does not overwrite it.

### Parameter

A product-defined kind of quantity that may be measured for an Aquarium. It
defines semantic identity and compatible Units; it is not itself a target,
recommendation, schedule or alert.

### Parameter Target

An optional Aquarium-owned operating interval for one canonical Parameter. The
configuration slot is identified by `AquariumId + ParameterId`; it has finite,
non-negative canonical `minimum` and `maximum` values where `minimum <=
maximum`. It is keeper configuration, not a universal biological range or a
Measurement validity rule. Absence means `uninterpreted`.

### Parameter Status

An application-derived interpretation of the latest known Measurement against
an explicit Parameter Target. Its value is `below`, `within`, `above` or
`uninterpreted` when a Measurement exists; missing Measurement evidence has no
value interpretation. It is not persisted domain evidence, health assessment,
alert or notification.

### Sensor

A device or input that produces measurements. Sensor calibration and provenance
rules remain to be defined.

### Controller

A device or service that reads inputs or changes equipment state. Automation
authority and safety rules remain to be defined.

### Maintenance

Work performed to inspect, clean, repair or preserve an Aquarium, System or
Equipment item.

### Care Work

In the accepted `Record Care Work` slice, a durable record of one intentional
action already performed for an Aquarium. It is not an Observation, planned
Task or automatic Domain Event. Future Maintenance, Water Change, Feeding and
Task semantics may specialize or relate to it only through accepted use cases.

### Recurring Care Plan

A Care-specific definition of one weekly, calendar-based intended action for an
Aquarium. It is not a generic Task, Scheduler, Reminder or workflow. It
materializes at most one concrete Planned Care Work occurrence at a time.

### Recurring occurrence

A concrete Planned Care Work created from a Recurring Care Plan for one
scheduled local date and time. It can be completed or cancelled like any other
planned intention; those actions do not themselves stop the recurring plan.

### Water Change

A completed water-replacement fact with a required positive volume and separate
performed and recorded timestamps. In the accepted first Maintenance workflow,
it is an independent aggregate and is not generic Care Work.

### Feeding

An event or routine describing food provided to Livestock.

### Task

A planned piece of work. Its completion, cancellation, recurrence and history
semantics are not yet defined.

### Reminder

A scheduled or recurring prompt associated with a Task or maintenance intention.

### Alert

A signal that a condition requires attention. Alert severity, acknowledgement and
resolution semantics remain to be defined.

### Rule

A declared condition or constraint used to evaluate data or operations. Rules
may be business rules, Security Rules or automation rules; qualify the term when
the context could be ambiguous.

### Automation

A process that evaluates a Rule and performs or recommends an action. Safety,
authorization and audit requirements must be defined before implementation.

### Log

An operational record of an action or system event. A Log is not automatically a
domain Event and must not replace domain history without an explicit decision.

### Event

A Fact whose occurrence has independent domain meaning. An Event is not a
second generic record beside its Fact: it is that Fact's domain classification.
Whether a particular care activity establishes an Event must be decided by an
accepted use case.

### Interpretation

A human or derived assessment of Facts, Observations or Events. It must remain
attributable and must not overwrite, replace or silently alter source evidence
or state causal certainty without support.

### Knowledge

Curated, attributable understanding used to inform care, such as a documented
procedure or source reference. It may be informed by evidence, but is neither
an Aquarium Fact nor an Event by default.

### AquariumId

The opaque, stable identifier of an Aquarium. It is not a user-facing name,
slug or Firestore-specific type.

### AquariumName

The identifying label supplied when an Aquarium is established. For the first
slice it must be non-empty after trimming surrounding whitespace; no length,
uniqueness or naming taxonomy is accepted yet.

### Timeline

An ordered read model of relevant Facts, Events, Measurements, Observations and
other accepted history for an Aquarium. It is not an independent source of truth.

### Active Context

The application-level scope from which a person views or operates on an
Aquarium. It is not an Entity, Aggregate, authorization rule or persistence
model.

### Aquarium time zone

The IANA time-zone identifier that defines calendar-based Care scheduling for
an Aquarium, for example `Atlantic/Canary`. It is not the current browser
time zone, a raw UTC offset or a locale preference.

### Aquarium location

Approximate physical locality owned by an Aquarium. It contains rounded
latitude, longitude and a locality label; it is not an exact address or a
provider payload.

### Local Weather

Ephemeral provider-backed context containing outside current temperature and
today's minimum and maximum. It is not a Measurement, Observation, Fact or
Timeline source.

### Inspection

A deliberate review of an Aquarium, Equipment item, Livestock or condition.
Inspection outcome and follow-up rules remain to be defined.

## Vocabulary rules

- Use `Aquarium`, not an unqualified synonym such as `tank`, in technical names.
- Use `Livestock` for the domain concept and `Fish` or `Coral` for categories;
  aggregate boundaries are not yet accepted.
- Use `Measurement` for a recorded value and `Observation` for a note.
- Use `Event` only for a domain occurrence with historical meaning.
- Qualify ambiguous terms such as `Rule`, `System` and `Log` by context.
