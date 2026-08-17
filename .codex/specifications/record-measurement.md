# Record a Measurement

**Status:** Accepted

## User value

An authenticated keeper can preserve one quantitative reading for the currently
selected Aquarium, including when the reading was taken before it was entered.
The record can later support trustworthy comparison without turning this slice
into a history or diagnostic feature.

## Actor and preconditions

The actor is an authenticated aquarium keeper.

The operation requires:

- a valid authenticated session;
- an Active Context containing an owned Aquarium;
- one Parameter from the closed MVP catalogue;
- one finite numeric value;
- the Parameter's canonical Unit;
- a `measuredAt` instant supplied by the keeper or defaulted by the application.

The operation is online-required. Active Context is application state and is not
stored as part of the Measurement.

## Scope

This slice records exactly one manual quantitative Measurement. It does not
provide history, charts, latest-value views, ranges, alerts, diagnostics,
Timeline, sensors, imports, corrections, deletion or offline synchronization.

## Catalogue

The closed MVP catalogue is:

| Parameter identifier | Canonical Unit                | Label       |
| -------------------- | ----------------------------- | ----------- |
| `temperature`        | `celsius`                     | °C          |
| `salinity`           | `parts-per-thousand`          | ppt         |
| `alkalinity`         | `degrees-kh`                  | dKH         |
| `nitrate`            | `milligrams-per-litre-as-no3` | mg/L as NO₃ |
| `phosphate`          | `milligrams-per-litre-as-po4` | mg/L as PO₄ |

Labels are presentation concerns. The identifiers and units are stable domain
values. Users cannot create or edit Parameters in this slice.

## Minimum Measurement data

Each persisted Measurement contains:

- opaque `MeasurementId`, generated as UUID v4;
- `AquariumId`;
- authenticated owner identifier;
- Parameter identifier;
- `enteredValue`;
- `enteredUnit`;
- `canonicalValue`;
- `canonicalUnit`;
- `measuredAt`;
- `recordedAt`;
- provenance `manual`.

For this slice, entered and canonical values and units are equal. Both
representations are retained to preserve the original input and allow future
conversion without changing the meaning of existing records.

## Numeric rules

- The value must be finite.
- `NaN`, positive infinity and negative infinity are invalid.
- Zero is valid for all five initial Parameters.
- Negative values are invalid for all five initial Parameters.
- No arbitrary global decimal precision or rounding rule is imposed.
- Recommended ranges are not validation rules. A valid Measurement may be
  undesirable for the Aquarium.

## Time semantics

- `measuredAt` represents when the reading was taken.
- The keeper supplies `measuredAt`; the form defaults it to the current time and
  permits retrospective entry.
- `recordedAt` represents when Veril accepts the durable record.
- The application/infrastructure boundary generates `recordedAt` during the
  successful write.
- Both instants are persisted using the canonical UTC representation.

The two timestamps must never be collapsed into one field.

## Provenance and domain classification

The provenance is explicitly persisted as `manual`. Sensor and imported sources
are deferred and are not exposed by this slice.

A persisted Measurement is durable evidence and therefore a Fact. Recording it
does not automatically create a Domain Event. A future use case may classify a
Measurement as an Event only if it has independent historical meaning.

## Main flow

1. Require an authenticated keeper.
2. Require the current Active Context.
3. Validate that the selected Aquarium is owned by the keeper through the
   existing authorization boundary.
4. Validate the closed Parameter catalogue and its canonical Unit.
5. Validate the finite numeric value.
6. Resolve `measuredAt`, defaulting it to now when omitted.
7. Generate a UUID v4 MeasurementId.
8. Set `enteredValue == canonicalValue`, `enteredUnit == canonicalUnit` and
   provenance `manual`.
9. Persist the independent Measurement.
10. Return the recorded Measurement result and confirm success.

## Expected failures

- no authenticated keeper: reject without writing;
- no Active Context: reject without writing;
- unsupported Parameter: reject validation;
- incompatible or non-canonical Unit: reject validation;
- non-finite, negative or otherwise structurally invalid value: reject
  validation;
- unavailable or unauthorized Aquarium: reject without revealing ownership;
- malformed external data: reject at the adapter boundary;
- infrastructure failure: do not present the Measurement as saved.

## Aggregate and persistence boundary

Measurement is an independent aggregate referencing `AquariumId`. It does not
belong to the `Aquarium` aggregate boundary and does not inherit technically
from Observation. The Aquarium aggregate is not loaded or mutated to record a
Measurement.

The write uses a dedicated top-level `measurements` collection. No read query,
history projection, aggregation or index is introduced by this slice. The
persisted contract contains only the minimum data listed above.

The adapter validates external data at its boundary with Zod and maps it into
domain data. Zod and Firebase types do not enter the domain or application
layers.

## Security

Firestore Rules remain authoritative and must:

- deny unauthenticated writes;
- allow writes only when `ownerId` matches the authenticated keeper;
- verify that the referenced Aquarium exists and is owned by that keeper;
- reject ownership spoofing;
- reject malformed structural data where Rules can enforce it;
- deny all other access by default.

Rules do not validate recommended ranges or perform business interpretation.

## UX

The minimum UI is in Spanish and contains:

- a Parameter selector from the five fixed Parameters;
- a numeric value field;
- the canonical Unit displayed as read-only context;
- a measured-time field defaulted to now and editable for retrospective entry;
- a save action.

Without Active Context, the form is not usable. The page shows an accessible
Spanish message and a link back to Aquarium selection. No write is attempted.
The page also exposes validation, pending, success and recoverable failure
states without ranges, warnings, interpretation or charts.

## Testing strategy

### Domain

Test valid Measurements, stable identity, closed Parameters, Parameter/Unit
compatibility, numeric validity, timestamps and manual provenance.

### Application

Test success, authentication failure, missing Active Context, unsupported
Parameter, invalid value and infrastructure failure.

### Persistence boundary

Test the valid write contract, entered/canonical representation, timestamps and
provenance through the real adapter boundary. This slice has no read adapter
boundary that receives external Firestore DTOs; malformed external DTO testing
is therefore not applicable without introducing an artificial read path.

### Emulator integration

Test real persistence, Aquarium association, owner attribution, all five
Parameters, canonical Units and independent multiple Measurements.

### Rules

Test owner write, anonymous denial, cross-owner denial, ownership spoofing and
invalid structural writes where Rules enforce them.

### Angular

Test Parameter selection, value validation, measured-time behavior, missing
Active Context, pending, success and failure. The canonical cross-route keeper
journey covers browser-level continuity separately.

## Architecture impact

This slice requires no Signal Store, CQRS, Event Sourcing, Timeline, Dashboard,
offline model, new Nx library or generic evidence framework. Form state remains
local to the page. The current application boundary and Firebase adapter style
are sufficient.

## Deferred decisions

- alternative input Units and conversions;
- sensor and imported provenance;
- editing and deletion; correction is defined by the separate accepted
  `Correct Measurement` capability.
- history, charts, Timeline and aggregations;
- recommended ranges and diagnostic interpretation;
- offline recording and synchronization;
- user-defined Parameters;
- measurement-specific retention and export policy.

## Definition of Ready assessment

| Criterion                 | Result | Evidence                                                                                |
| ------------------------- | ------ | --------------------------------------------------------------------------------------- |
| Status, actor and value   | Ready  | Authenticated keeper records one quantitative Measurement in the active owned Aquarium. |
| Scope and failures        | Ready  | One write, five fixed Parameters, bounded validation and explicit failures.             |
| Domain language           | Ready  | Measurement, Parameter, Unit, Fact, provenance and time semantics are canonical.        |
| Aggregate boundary        | Ready  | Independent Measurement aggregate referencing AquariumId.                               |
| Identity and persistence  | Ready  | Opaque UUID v4 and minimum dedicated `measurements` contract are explicit.              |
| Units and numeric rules   | Ready  | Exact canonical Units, compatibility and finite-value rules are explicit.               |
| Time and provenance       | Ready  | measuredAt, recordedAt and persisted manual provenance are explicit.                    |
| Authorization and offline | Ready  | Owner-only Rules boundary and online-required classification are explicit.              |
| UX and testing            | Ready  | Minimum Spanish interaction and proportional test matrix are defined.                   |
| Deferred scope            | Ready  | History, conversion, correction, offline and future automation remain out.              |
