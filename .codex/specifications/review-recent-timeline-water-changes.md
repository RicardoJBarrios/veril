# Review Recent Timeline Water Changes

**Status:** Accepted for implementation

## Scope

The recent Timeline read model includes completed Water Changes alongside
Observations, Measurements and Care Work. This is a projection-only change:
Water Change remains the Maintenance source of truth and no Timeline document
or domain event is introduced.

The existing bounded limit, ordering and online behavior remain unchanged.
Water Changes use `performedAt` as `effectiveAt` and `recordedAt` as the
tie-breaker. The projection exposes only the replacement volume and optional
notes needed by the recent activity view.

## Boundary

Timeline declares a narrow `TimelineWaterChangeReader` port. A composition
adapter translates the Maintenance reader into that port. Timeline does not
import the Maintenance aggregate or repository directly, and Maintenance does
not depend on Timeline.

## Acceptance criteria

- a recent Water Change appears in Timeline with kind `water-change`;
- it is ordered by effective time, recorded time, source order and identifier;
- the existing bounded limit still applies across all sources;
- source failures remain recoverable and do not create partial success;
- no Water Change persistence or lifecycle semantics change.
