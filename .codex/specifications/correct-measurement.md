# Correct Measurement

**Status:** Accepted for implementation

## Context

`Measurement` is durable quantitative evidence for one Aquarium. The current
recording and listing capabilities preserve each Measurement as an independent,
append-only record. A keeper can currently record a mistaken value, parameter,
unit or measured time, but cannot correct it without either leaving ambiguity
or creating a second unrelated reading.

The existing domain language defines a correction as a new Fact that refers to
the earlier evidence. This proposal follows that rule and does not introduce
in-place editing or deletion.

## User value

The owning keeper can correct an erroneous Measurement while preserving the
original input and a traceable history of what was corrected.

## Actor and preconditions

The actor is an authenticated keeper who owns the Aquarium containing the
target Measurement.

The operation requires:

- a valid authenticated session with `isKeeper: true`;
- an Active Context containing the owned Aquarium;
- an existing Measurement belonging to that Aquarium and keeper;
- a replacement value that satisfies the existing Measurement rules.

Active Context selects the target but never authorizes the operation. Firebase
Rules remain authoritative for ownership and the relationship between the
Measurement and Aquarium.

## Proposed command

`Correct Measurement` accepts:

- the target `MeasurementId`;
- the replacement Parameter and canonical Unit;
- the replacement value;
- the replacement `measuredAt` instant;
- the authenticated keeper and Aquarium context.

The replacement uses the existing `manual` provenance. The system generates a
new `MeasurementId` and its own `recordedAt`. The original `measuredAt` is not
silently reused: the keeper must confirm or replace it explicitly.

## Proposed aggregate and consistency boundary

Measurement remains an independent aggregate. The correction command validates
the target and replacement at the Measurement application boundary; it does
not load or mutate the Aquarium aggregate.

The correction is one new Measurement Fact with a reference to the corrected
Fact. The original Measurement remains immutable and readable for traceability.
No transaction spanning Aquarium and Measurement is required.

The reference is proposed as:

```text
correctsMeasurementId: MeasurementId
```

The original Measurement has no mutable `correctedBy` field. This keeps the
write append-only and avoids a second write that could leave two histories
temporarily inconsistent.

## Proposed invariants

- The target must exist and belong to the authenticated keeper's Aquarium.
- The target must not itself be superseded by a later correction.
- A correction must create exactly one new Measurement Fact or no Fact.
- The new Fact must pass all existing Parameter, Unit, numeric and timestamp
  validation rules.
- `correctsMeasurementId` must reference a Measurement in the same Aquarium.
- A correction cannot create a cycle or reference itself.
- The original Fact is never overwritten, deleted or marked as if it had never
  existed.
- A failed correction must not create a partial replacement.

Only one correction is allowed for an original Measurement. A correction cannot
correct another correction in this increment.

## Read semantics proposed for acceptance

There are two distinct views:

1. **Traceable history** shows the original and replacement Facts, with a clear
   relation and their separate `recordedAt` values.
2. **Current known Measurement** resolves an unsuperseded Fact for each
   Parameter. A corrected original must not remain the current value.

The current-value resolver must not silently choose by `measuredAt` alone. It
must use the correction relation and deterministic persisted ordering. If the
data contains an invalid relation or two replacements for one target, the
adapter rejects the affected read rather than inventing a current value.

Timeline remains a projection of source Facts. The implementation adds no
Timeline write or separate correction event. Both Facts remain visible in the
recent projection; the replacement is labelled as a measurement correction so
the history is not mistaken for two independent readings.

## Permissions and delegated access

- Only the owning keeper may issue a correction.
- A delegated guest may read original and replacement Facts only when the
  Aquarium grant includes `measurements`.
- A delegated guest cannot correct, create, delete or hide a Measurement.
- Global custom claims provide capabilities such as `isKeeper`; the
  Aquarium-scoped grant remains the source of per-Aquarium read permission.

## Persistence proposal

The existing top-level `measurements` collection remains the source of truth.
The replacement document adds `correctsMeasurementId` and keeps the existing
Measurement fields. No document is deleted or updated by the correction flow.

Because Firestore cannot enforce uniqueness over an arbitrary query atomically,
the transaction also creates one technical marker at
`measurementCorrections/{originalMeasurementId}`. The marker is not a domain
Fact and has no business meaning beyond enforcing the one-correction invariant;
only the owning keeper may inspect it and delegated readers cannot. The marker
and replacement Fact are created in one transaction; a direct or partial marker
write is rejected by Rules.

Rules must validate, where practical:

- authenticated keeper and owner match;
- Aquarium ownership and same-Aquarium target relation;
- valid UUID references;
- no self-reference;
- immutable existing documents;
- creation-only correction writes.

Rules cannot safely enforce every graph invariant without additional reads and
careful query semantics. The application and adapter must fail closed for
malformed or ambiguous correction graphs; this is not a reason to weaken
authorization.

## UX proposal

The Measurement history offers `Corregir` only to the owning keeper. The form
starts with the target values and requires an explicit save confirmation that
creates a new record. The UI must explain:

- the original Measurement will remain in history;
- the correction becomes the current known value;
- the operation cannot be undone by editing the original.

Guests see read-only history and no correction action. No soft-delete control
or generic edit control is introduced.

## Risks and open decisions

The following decisions are intentionally not assumed:

- how current-value queries and pagination expose superseded records;
- whether a correction requires a reason or optional note;
- whether delegated guests should see the correction relationship in full;
- whether corrections should be available for all provenance types once
  sensors or imports exist.

## Definition of Ready checklist

| Criterion              | Result | Evidence or missing decision                                          |
| ---------------------- | ------ | --------------------------------------------------------------------- |
| User value             | Ready  | Correct a mistaken reading without erasing evidence.                  |
| Aggregate boundary     | Ready  | Measurement remains independent; correction is a new Fact.            |
| Ownership              | Ready  | Owner-only write; existing delegated measurement read applies.        |
| Traceability           | Ready  | Original remains immutable and is referenced by the replacement.      |
| Validation             | Ready  | Existing Measurement invariants are reused.                           |
| Persistence            | Ready  | Append-only document creation in `measurements`.                      |
| Read semantics         | Ready  | Current value excludes the superseded original; history retains both. |
| Correction cardinality | Ready  | One correction per original; corrections cannot be corrected again.   |
| Timeline behavior      | Ready  | Both Facts remain visible; the replacement is explicitly labelled.    |
| Concurrency            | Ready  | Transactional technical marker prevents duplicate corrections.        |
| Implementation         | Ready  | Code, Rules, Emulator and E2E coverage can proceed.                   |
