# Aggregate Hypotheses

These are hypotheses for domain discovery, except for the accepted conceptual
root `Aquarium`. They are not persistence containers or Nx libraries. A concrete
consistency boundary still needs a use case and invariant before implementation.

| Aggregate status         | Possible responsibility                                                            | Invariants to validate                                                                                                            |
| ------------------------ | ---------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Aquarium — accepted root | Establish the management context for related care information.                     | The first private establishment is accepted; broader ownership, sharing and the relationship to Display or System remain pending. |
| Livestock record         | Preserve the identity and current association of an organism or group.             | Individual versus group, transfer, lifecycle and association rules.                                                               |
| Equipment association    | Describe an equipment item's relationship to an Aquarium or System.                | Ownership, sharing, installation and safety constraints.                                                                          |
| Care task                | Coordinate a planned care action and its completion state.                         | Recurrence, completion, cancellation and historical trace.                                                                        |
| Water Change             | Preserve a completed water-replacement fact with volume and timestamps.            | Positive finite volume, append-only history, ownership and delegated read access.                                                 |
| Recorded observation     | Preserve a reported observation or measurement when the use case requires history. | Provenance, correction, units, quality and offline behavior.                                                                      |
| Automation rule          | Represent a permitted automated or recommended action.                             | Authorization, safety, idempotency, audit and online requirements.                                                                |

## Boundary questions

- Which command needs atomic validation, and which state must it see?
- Which candidate records qualify as Facts, and how can a later correction or
  qualification link to immutable source evidence?
- Which ownership or collaboration rule is actually required?
- Which operation can be performed offline without violating an invariant?
- Which events are facts, and which are derived notifications or projections?

Do not derive collection shape, document nesting, IDs or indexes from this table.
