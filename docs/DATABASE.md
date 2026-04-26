# Database Documentation

## Database Overview
- Database engine: PostgreSQL
- ORM: Prisma
- Schema file: `apps/api/prisma/schema.prisma`
- Connection variable: `DATABASE_URL`

The schema models users, sports, ratings, venues, matches, participants, match results, and rating history.

## Entity Relationship Explanation
- A `User` can create many `Match` records.
- A `User` can join many matches through `MatchParticipant`.
- A `User` has sport-specific ratings in `UserSportRating`.
- A `Sport` has many matches and many user sport ratings.
- A `Venue` can host many matches.
- A `Match` has many participants and zero/one result.
- `RatingHistory` tracks rating changes tied to `User`, `Sport`, and `Match`.

## Models

### User
Fields:
- `id` (uuid, PK)
- `email` (unique)
- `passwordHash` (nullable, bcrypt hash)
- `displayName`
- `bio` (nullable)
- `homeLocationText` (nullable)
- `createdAt`
- `updatedAt`

### Sport
Fields:
- `id` (uuid, PK)
- `name` (unique)
- `createdAt`
- `updatedAt`

### UserSportRating
Fields:
- `id` (uuid, PK)
- `userId` (FK -> User)
- `sportId` (FK -> Sport)
- `format` (`SINGLES` or `DOUBLES`)
- `rating` (default `1200`)
- `gamesPlayed` (default `0`)
- `uncertainty` (default `350`)
- `createdAt`
- `updatedAt`

Constraint:
- unique composite: `(userId, sportId, format)`

### Venue
Fields:
- `id` (uuid, PK)
- `name`
- `address`
- `latitude` (nullable)
- `longitude` (nullable)
- `createdAt`
- `updatedAt`

### Match
Fields:
- `id` (uuid, PK)
- `sportId` (FK -> Sport)
- `venueId` (nullable FK -> Venue)
- `createdByUserId` (FK -> User)
- `title`
- `description` (nullable)
- `format` (`SINGLES` or `DOUBLES`)
- `status` (`OPEN`, `FULL`, `COMPLETED`, `CANCELLED`)
- `startsAt`
- `maxPlayers`
- `minRating` (nullable)
- `maxRating` (nullable)
- `createdAt`
- `updatedAt`

### MatchParticipant
Fields:
- `id` (uuid, PK)
- `matchId` (FK -> Match)
- `userId` (FK -> User)
- `status` (`JOINED`, `LEFT`, `NO_SHOW`)
- `team` (`A`, `B`, `UNKNOWN`)
- `createdAt`
- `updatedAt`

Constraint:
- unique composite: `(matchId, userId)`

### MatchResult
Fields:
- `id` (uuid, PK)
- `matchId` (unique FK -> Match)
- `submittedByUserId` (FK -> User)
- `teamAScore`
- `teamBScore`
- `verified` (default `false`)
- `createdAt`
- `updatedAt`

### RatingHistory
Fields:
- `id` (uuid, PK)
- `userId` (FK -> User)
- `sportId` (FK -> Sport)
- `matchId` (FK -> Match)
- `oldRating`
- `newRating`
- `delta`
- `createdAt`

Index:
- `(userId, sportId, createdAt)`

## Important Relationships
- `Match.createdByUserId` uses named relation `MatchCreatedBy`.
- `MatchResult.submittedByUserId` uses named relation `ResultSubmittedBy`.
- Cascading delete is used in several child records (`MatchParticipant`, `UserSportRating`, `RatingHistory`), while some parent references use `Restrict`/`SetNull`.

## Enum Explanations
- `SportFormat`
  - `SINGLES`: one player per side
  - `DOUBLES`: two players per side
- `MatchStatus`
  - `OPEN`, `FULL`, `COMPLETED`, `CANCELLED`
- `MatchParticipantStatus`
  - `JOINED`, `LEFT`, `NO_SHOW`
- `Team`
  - `A`, `B`, `UNKNOWN`

## Migration Commands
From `apps/api`:

```bash
pnpm prisma:migrate --name init
pnpm prisma:generate
```

Committed migration:
- `apps/api/prisma/migrations/20260425000100_init/migration.sql`
- `apps/api/prisma/migrations/20260425000200_add_user_password_hash/migration.sql`

## Seed Data
Implemented at `apps/api/prisma/seed.ts`.

Seed includes:
- sports: `badminton`, `pickleball`, `tennis`
- 3 demo venues
- 4 demo users
- stable demo user IDs, including `11111111-1111-4111-8111-111111111111` for the mobile demo user
- default singles and doubles ratings for each user/sport
- a few open demo matches

Run it with:

```bash
cd apps/api
pnpm prisma:seed
```

## Future Database Improvements
- PostGIS support for geo queries and distance sorting.
  - Current nearby match discovery uses app-layer Haversine filtering after Prisma candidate fetch.
  - This should migrate to indexed PostGIS queries for scale.
- Additional indexes for high-traffic filters (`sportId`, `startsAt`, `status`, rating ranges).
- More explicit uniqueness and data integrity constraints for match workflows.
- Add audit fields (`createdBy`, `updatedBy`) where needed.
- Add soft delete strategy (`deletedAt`) for recoverable records.

## Related Docs
- [Architecture](./ARCHITECTURE.md)
- [API](./API.md)
