# Rating System

## What Elo Is
Elo is a rating system that estimates skill by updating a player's rating after each match based on expected vs actual outcome.

## Why Elo Is Useful for Matchmaking
- Simple to implement and explain.
- Works well as a baseline ranking system.
- Gives quick feedback after each match.
- Good MVP choice before more advanced probabilistic systems.

## Current Configuration
- Default rating: `1200`
- K factor: `32`
- Code location: `apps/api/src/ratings/elo.ts`

## Expected Score Formula
For player A against player B:

```txt
expectedA = 1 / (1 + 10 ^ ((ratingB - ratingA) / 400))
```

## Rating Update Formula

```txt
newRating = oldRating + K * (actualScore - expectedScore)
```

Where:
- `actualScore = 1` for win
- `actualScore = 0` for loss
- `actualScore = 0.5` for draw

## Singles Logic
- Use each player's individual ratings.
- Compute expected score from two ratings.
- Update each player with mirrored outcomes.

## Doubles Logic (Current MVP)
- Compute average rating per team.
- Use team average vs team average in Elo formula.
- Apply projected team-level update.

Current helper:
- `teamAverageRating(ratings: number[])`

## Example Calculation
Given:
- Player rating = `1200`
- Opponent rating = `1200`
- K = `32`
- Actual result = win (`1`)

Expected score = `0.5`

```txt
new = 1200 + 32 * (1 - 0.5)
new = 1216
```

## Limitations of Simple Elo
- No explicit uncertainty tracking in math updates.
- Slow/fast adaptation may not fit all player pools with fixed K.
- Team games modeled with average only, which is simplistic.
- No inactivity decay or confidence weighting.
- No sport- or format-specific behavior tuning beyond separate rows.

## Future Upgrade Options
- Glicko-2
  - Rating + rating deviation + volatility.
  - Better uncertainty handling.
- TrueSkill
  - Designed for team/multiplayer scenarios.
  - Better for doubles and uneven teams.
- Reliability score
  - Add confidence metric based on games played and recency.
- Sport-specific rating profiles
  - Separate ratings per sport and potentially sub-format.
- Singles vs doubles separation
  - Already modeled in schema via `format`; expand logic to fully independent update pipelines.

## Current Implementation Scope
- Implemented:
  - Elo helper math
  - Defaults endpoint
  - Preview endpoints
  - Unit tests (`elo.spec.ts`)
- TODO:
  - Persist updates after verified match results
  - Store full rating change records in `RatingHistory`
  - Add anti-abuse/review workflow for disputed results

## Related Docs
- [API](./API.md)
- [Database](./DATABASE.md)
- [ADR 0002](./adr/0002-rating-system.md)
