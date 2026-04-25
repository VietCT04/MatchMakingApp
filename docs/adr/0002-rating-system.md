# ADR 0002: Start with simple Elo rating

## Status
Accepted

## Context
The app needs an initial rating mechanism for matchmaking quality that can be implemented quickly and explained easily to users and developers. The team also wants a clear upgrade path to more advanced systems later.

## Decision
Start with a simple Elo implementation:
- default rating = 1200
- K factor = 32
- expected score formula
- update formula using actual result
- doubles approximation via average team rating

Implement as isolated helper logic in backend ratings module, expose preview endpoints, and add unit tests.

## Consequences
Positive:
- Minimal complexity to ship early matchmaking baseline.
- Transparent and easy-to-debug behavior.
- Good foundation for incremental improvements.

Tradeoffs:
- Limited uncertainty modeling.
- Doubles handling is simplistic.
- Fixed K factor may not fit all cohorts equally.

## Alternatives Considered
### Manual Skill Level
- Pros: simple UX and no math engine.
- Cons: subjective and harder to keep accurate over time.

### Glicko-2
- Pros: includes uncertainty and volatility.
- Cons: higher implementation and explanation complexity for MVP.

### TrueSkill
- Pros: strong for team-based and multiplayer outcomes.
- Cons: more complex data and update pipeline than needed for first scaffold.
