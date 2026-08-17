# Lifecycle States

Accepted lifecycles are identified explicitly. The remaining diagrams are
candidate states that still require a use-case decision before implementation.

## Planned Care Work

```text
planned ── complete ──> CareWork
planned ── cancel ────> removed
```

The planned intention has no persisted lifecycle status. Completion creates a
durable `CareWork` fact and removes the intention atomically. Cancellation
removes the unperformed intention without creating a Fact or Timeline item.
This is the accepted lifecycle for concrete Planned Care Work. Durable
cancellation history remains a future decision.

## Weekly Recurring Care

```text
RecurringCarePlan + first PlannedCareWork
  ├── complete occurrence ──> CareWork + next PlannedCareWork
  ├── cancel occurrence ────> removed occurrence + next PlannedCareWork
  └── stop recurrence ──────> removed plan + removed outstanding occurrence
```

The recurrence definition is not historical evidence. A planned occurrence is
always concrete and remains the only actionable future intention. Completion
keeps the existing CareWork fact semantics; cancelling or stopping creates no
Fact and no Timeline item.

## Alert

```text
detected -> acknowledged -> resolved
detected -> resolved
```

The meaning of detection, acknowledgement, severity and resolution is pending.

## Livestock association

```text
active ── transfer ──> active in another Aquarium
active ── remove ────> removed
```

Transfer preserves the previous Aquarium association and lifecycle history.
Removal is a soft delete: the record remains available for traceability but is
not active. Further lifecycle states are deferred.

## Equipment lifecycle

```text
active ── transfer ──> active in another owned Aquarium
active ── retire ────> retired
```

Retirement is a soft delete. The root and association history remain available
to the owner for traceability. Installation, failure and automation states are
deferred.
