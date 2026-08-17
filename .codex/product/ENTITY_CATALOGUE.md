# Candidate Entity Catalogue

The catalogue is a discovery aid. “Candidate” does not mean an entity, aggregate
or stored record will be created.

| Concept         | Purpose                                                                      | Responsibilities or relationships                                                                                 | Status                                  |
| --------------- | ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| Aquarium        | Provide the manageable care system and domain root.                          | Aggregate root relating care records, Livestock, Equipment and supporting systems.                                | accepted aggregate root                 |
| Display         | Name a physical aquarium display.                                            | May be related to Aquarium.                                                                                       | pending                                 |
| System          | Name supporting care equipment or configuration.                             | May relate to Aquarium and Equipment.                                                                             | pending                                 |
| Species Profile | Provide globally shared, curated encyclopedic documentation for one species. | Attributable knowledge referenced by many Livestock records; not Aquarium state.                                  | accepted distinction                    |
| Livestock       | Represent an individual organism or group receiving care.                    | References a Species Profile; associated with one Aquarium at a time; preserves transfer and soft-delete history. | accepted for first workflow             |
| Equipment       | Represent a care-related device or item.                                     | Independent aggregate with one current Aquarium association, ownership, lifecycle and traceable history.          | accepted for first workflow             |
| Measurement     | Represent a recorded Parameter value.                                        | May relate to Aquarium, Parameter and provenance.                                                                 | candidate                               |
| Observation     | Represent a human or device note.                                            | May relate to an Aquarium, Event or Livestock.                                                                    | candidate                               |
| Care work       | Represent planned or performed care.                                         | May include Maintenance, Task, Feeding or Water Change.                                                           | pending                                 |
| Water Change    | Preserve one completed aquarium water-replacement fact.                      | Owns volume and performed/recorded timestamps; independent Maintenance aggregate.                                 | accepted for first Maintenance workflow |
| Alert           | Represent a need for attention.                                              | May relate to a condition or care context.                                                                        | pending                                 |
| Automation      | Represent permitted assisted action or recommendation.                       | May relate to Rules, inputs and an actor.                                                                         | future                                  |

`Aquarium` is the accepted aggregate root. Every other concept needs an accepted
use case before it becomes an Entity with identity, lifecycle and responsibilities.
