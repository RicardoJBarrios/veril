# Accepted: Manage Equipment

**Status:** Accepted for implementation.

## Aggregate and ownership

`Equipment` is an independent aggregate root in the Equipment bounded context.
It is not part of the Aquarium aggregate and it is not Livestock. It is owned
by the keeper who owns its Aquarium and is associated with exactly one Aquarium
at a time. A keeper may transfer it only between Aquariums they own. Sharing is
read-only access to an Aquarium, not shared ownership.

The item has a stable identity, non-empty name, closed category (`lighting`,
`filtration`, `flow`, `heating`, `monitoring`, `dosing`, `other`), optional
bounded manufacturer/model/serial labels, current Aquarium, lifecycle and
timestamps.

## Lifecycle and traceability

```text
active -- transfer --> active in another owned Aquarium
active -- retire ----> retired
```

Retirement is a soft delete. The item remains readable to its owner and in its
history, but is excluded from active lists. A retired item cannot be edited,
transferred or retired again. Association history is append-only and records
every Aquarium association interval.

## Authorization and sharing

- Create, edit, transfer and retire require a persistent authenticated user with
  `isKeeper: true`, and ownership of the relevant Aquarium.
- `isEditor` is not sufficient and no new role is created.
- Anonymous users cannot read private Equipment.
- A persistent guest can read Equipment only with an active Aquarium grant that
  contains `equipment: true`.
- Grants are scoped to one Aquarium and never permit writes or history changes.

## Persistence and acceptance

The root is stored in `equipment/{equipmentId}`. The document contains the
current association and complete bounded association history. Firestore rules
validate Equipment independently from Livestock: fields, categories, lifecycle
transitions, owner identity, Aquarium ownership and read grants are explicit.
Physical deletion is forbidden.

The vertical slice must cover create, list, read, edit, transfer and retire for
keepers; read-only scoped access for guests; and unit, emulator integration,
rules and Playwright tests. Sensors, controllers, telemetry, maintenance,
attachments, shared ownership and automation are deferred.
