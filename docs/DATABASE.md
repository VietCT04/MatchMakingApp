# Database Documentation

## Database Overview
- Database engine: PostgreSQL
- Local container image: `postgis/postgis:16-3.4`
- ORM: Prisma
- Schema file: `apps/api/prisma/schema.prisma`
- Connection variable: `DATABASE_URL`

The schema models users, sports, ratings, venues, matches, participants, match results, rating history, reliability stats, disputes, and user reports.

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

Reliability relation:
- one-to-one `userReliabilityStats`

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

Geospatial notes:
- Prisma keeps `latitude`/`longitude` scalar fields for compatibility.
- Nearby search uses PostGIS expressions (`ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography`).
- Spatial index:
  - `Venue_location_geography_gix` (GIST expression index on venue point geography)

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

### UserReliabilityStats
Fields:
- `id` (uuid, PK)
- `userId` (unique FK -> User)
- `completedMatches` (default `0`)
- `cancelledMatches` (default `0`)
- `lateCancellationCount` (default `0`)
- `noShowCount` (default `0`)
- `disputedResults` (default `0`)
- `reportCount` (default `0`)
- `reliabilityScore` (default `100`)
- `createdAt`
- `updatedAt`

### MatchResultDispute
Fields:
- `id` (uuid, PK)
- `matchResultId` (FK -> MatchResult)
- `matchId` (FK -> Match)
- `createdByUserId` (FK -> User)
- `reason`
- `status` (`OPEN`, `RESOLVED`, `REJECTED`)
- `createdAt`
- `updatedAt`

Constraint:
- unique composite: `(matchResultId, createdByUserId)`

### UserReport
Fields:
- `id` (uuid, PK)
- `reportedUserId` (FK -> User)
- `reporterUserId` (FK -> User)
- `matchId` (nullable FK -> Match)
- `reason`
- `status` (`OPEN`, `REVIEWED`, `DISMISSED`)
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
- `DisputeStatus`
  - `OPEN`, `RESOLVED`, `REJECTED`
- `ReportStatus`
  - `OPEN`, `REVIEWED`, `DISMISSED`

## Migration Commands
From `apps/api`:

```bash
pnpm prisma:migrate --name init
pnpm prisma:generate
```

Committed migration:
- `apps/api/prisma/migrations/20260425000100_init/migration.sql`
- `apps/api/prisma/migrations/20260425000200_add_user_password_hash/migration.sql`
- `apps/api/prisma/migrations/20260426150000_trust_safety_reliability/migration.sql`
- `apps/api/prisma/migrations/20260426193000_match_chat_mvp/migration.sql`
- `apps/api/prisma/migrations/20260426203000_in_app_notifications/migration.sql`
- `apps/api/prisma/migrations/20260426220000_expo_push_notifications_mvp/migration.sql`
- `apps/api/prisma/migrations/20260427090000_postgis_nearby_search/migration.sql`

PostGIS migration details (`20260427090000_postgis_nearby_search`):
- `CREATE EXTENSION IF NOT EXISTS postgis;`
- create GIST expression index for venue geography point
- preserves existing venue latitude/longitude data and Prisma CRUD contracts

Local reset guidance (when upgrading from plain Postgres image):
```bash
docker compose down -v
docker compose up -d
cd apps/api
pnpm prisma:migrate
```

## Seed Data
Implemented at `apps/api/prisma/seed.ts`.

Seed includes:
- sports: `badminton`, `pickleball`, `tennis`
- 3 demo venues
- 4 demo users
- stable demo user IDs, including `11111111-1111-4111-8111-111111111111` for the mobile demo user
- default singles and doubles ratings for each user/sport
- default reliability stats for each seeded user
- a few open demo matches

Run it with:

```bash
cd apps/api
pnpm prisma:seed
```

## Future Database Improvements
- Further PostGIS tuning for large geospatial workloads:
  - query-plan tuning with `EXPLAIN ANALYZE`
  - selective indexes for mixed filter + geospatial workloads
  - operational monitoring for long-running spatial queries
- Additional indexes for high-traffic filters (`sportId`, `startsAt`, `status`, rating ranges).
- More explicit uniqueness and data integrity constraints for match workflows.
- Add audit fields (`createdBy`, `updatedBy`) where needed.
- Add soft delete strategy (`deletedAt`) for recoverable records.

## Related Docs
- [Architecture](./ARCHITECTURE.md)
- [API](./API.md)

## New preference models (2026-04-28)
- UserSportPreference (unique userId + sportId)
- UserPreferredVenue (unique userId + venueId)
- UserAvailabilitySlot (dayOfWeek, startTime, endTime, 	imezone)
- User now includes optional vatarUrl and skillDescription.
- Sport now includes reverse relation userSportPreferences.


## Auto matchmaking tables
- MatchmakingTicket`n  - search request from a single player (sport/format, time window, optional location/elo/venue constraints).
- MatchmakingProposal`n  - pending group proposal before real match creation.
- MatchmakingProposalParticipant`n  - per-user accept/decline state inside proposal.
- Added enum values in NotificationType for auto-match lifecycle notifications.


## Matchmaking negotiation data model additions
- MatchmakingProposalMessage for negotiation-room chat.
- MatchmakingLocationProposal for candidate meetup locations.
- MatchmakingLocationProposalResponse for participant-level accept/decline responses.
- Venue now supports optional googleMapsUrl and googlePlaceId for mapping context and venue reuse.


## Match attendance check-in schema
- Added enum CheckInMethod (MANUAL, GPS, QR).
- Added MatchParticipant fields:
  - checkedInAt DateTime?`n  - checkInMethod CheckInMethod?`n  - checkedInLatitude Float?`n  - checkedInLongitude Float?`n- MVP uses MANUAL only; GPS/QR fields are future-proof.

