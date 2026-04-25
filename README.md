# Sports Matchmaking

Sports Matchmaking is an MVP scaffold for a racket-sports matchmaking product where players discover and create matches, join games, and track skill through a simple Elo-based rating system.

## Product Idea
Build an iOS-first app (React Native/Expo) for badminton, pickleball, tennis, and related sports:
- Player profiles with sport-level ratings
- Match discovery and match creation
- Match participation and result tracking
- Upgradeable rating engine (start Elo, evolve later)

## Main Features (Current Scaffold)
- Mobile screens for home, login placeholder, profile, discovery, create match, match details, and ratings
- API client abstraction connected to the backend for mobile
- NestJS REST API with modules for users, sports, matches, ratings, venues, auth placeholder, and health
- Prisma schema for key relational entities
- Elo helper utilities with unit tests

## Tech Stack
- Mobile: React Native + Expo + TypeScript + Expo Router
- Backend: NestJS + TypeScript
- Database: PostgreSQL
- ORM: Prisma
- Monorepo package manager: pnpm workspaces
- Shared contracts: `packages/shared`

## Prerequisites
- Node.js 20+
- pnpm 10+
- Docker Desktop

## Installation
```bash
pnpm install
```

## Environment Setup
1. Create local env file from template:
```bash
cp .env.example .env
```
2. Required variables are documented in `.env.example`:
- `DATABASE_URL`
- `PORT`
- `EXPO_PUBLIC_API_URL`

## Running PostgreSQL
```bash
docker compose up -d
```

## Running Prisma Migration
```bash
cd apps/api
pnpm prisma:migrate --name init
pnpm prisma:generate
```

## Seeding Demo Data
```bash
cd apps/api
pnpm prisma:seed
```

## Running Backend
From repo root:
```bash
pnpm dev:api
```

## Running Mobile App
From repo root:
```bash
pnpm dev:mobile
```

For iOS simulator:
```bash
cd apps/mobile
pnpm ios
```

Mobile API configuration:
- iOS simulator default: `EXPO_PUBLIC_API_URL=http://localhost:3000`
- Physical device: set `EXPO_PUBLIC_API_URL` to your computer LAN URL, for example `http://192.168.1.50:3000`
- Temporary demo user: `11111111-1111-4111-8111-111111111111` in `apps/mobile/src/config/demoUser.ts`

## Running Tests
From repo root:
```bash
pnpm test
pnpm typecheck
```

## Useful Commands
```bash
# Root
pnpm dev:api
pnpm dev:mobile
pnpm test
pnpm typecheck

# API only
cd apps/api
pnpm start:dev
pnpm test
pnpm prisma:migrate --name init
pnpm prisma:generate

# Mobile only
cd apps/mobile
pnpm start
pnpm ios
pnpm android
pnpm web
pnpm typecheck
```

## Documentation Index
- [CONTINUITY.md](./CONTINUITY.md)
- [Architecture](./docs/ARCHITECTURE.md)
- [API](./docs/API.md)
- [Database](./docs/DATABASE.md)
- [Rating System](./docs/RATING_SYSTEM.md)
- [Product Requirements](./docs/PRODUCT_REQUIREMENTS.md)
- [Roadmap](./docs/ROADMAP.md)
- [Decision Log](./docs/DECISION_LOG.md)
- [Contributing](./docs/CONTRIBUTING.md)
- [Security](./docs/SECURITY.md)
- [Testing](./docs/TESTING.md)
- ADRs:
  - [0001 Tech Stack](./docs/adr/0001-tech-stack.md)
  - [0002 Rating System](./docs/adr/0002-rating-system.md)

## Troubleshooting
- `pnpm: command not found`
  - Install pnpm globally or enable Corepack-based pnpm.
- Mobile cannot reach backend
  - Confirm backend is running at `PORT` and `EXPO_PUBLIC_API_URL` points to it.
- Prisma connection errors
  - Verify PostgreSQL container is running and `DATABASE_URL` is correct.
- Empty mobile data
  - App falls back to mock data when API is unavailable; confirm network and API health endpoint.

## Roadmap (High Level)
- Phase 1: scaffold + CRUD skeleton (current)
- Phase 2: robust DB-backed match discovery and filtering (partially implemented)
- Phase 3: rating update workflow after verified results (partially implemented)
- Phase 4: real auth and authorization
- Phase 5: location-based matching
- Phase 6: realtime chat + notifications
- Phase 7: payments + club tooling
- Phase 8: advanced rating system (Glicko-2/TrueSkill)

## Implemented MVP Backend Flow
- `GET /matches` supports filters: `sportId`, `format`, `status`, `minRating`, `maxRating`, `startsAfter`, `startsBefore`, `venueId`.
- `POST /matches/:id/join` joins a user, prevents duplicates/full/completed/cancelled matches, and marks a full match as `FULL`.
- `POST /matches/:id/leave` marks a participant as `LEFT` and reopens a full match if space becomes available.
- `POST /matches/:id/results` records an unverified match result.
- `POST /matches/:id/results/:resultId/verify` verifies the result, applies Elo updates, creates `RatingHistory`, and completes the match.
- `GET /users/:userId/ratings` returns a user's current sport ratings.
- `GET /users/:userId/rating-history` returns rating change history.

## Implemented MVP Mobile Flow
- Match Discovery fetches open matches from the backend and supports simple sport filtering.
- Create Match fetches sports/venues and posts to `POST /matches`.
- Match Detail supports join, leave, submit result, verify result, and refreshes data after actions.
- Match Detail includes a temporary demo opponent helper so a newly created match can be verified without real auth.
- Ratings shows current demo user ratings and rating history.
- Profile shows the seeded demo user and ratings summary.
- Auth is still TODO; mobile uses the seeded demo user configured in `apps/mobile/src/config/demoUser.ts`.

## Manual Match Flow Test
After migration + seed, use the seeded records from `apps/api/prisma/seed.ts`.

```bash
curl http://localhost:3000/health
curl http://localhost:3000/sports
curl http://localhost:3000/users
curl "http://localhost:3000/matches?status=OPEN"
```

Join, submit, and verify flow:

```bash
curl -X POST http://localhost:3000/matches/match-badminton-doubles-demo/join \
  -H "Content-Type: application/json" \
  -d "{\"userId\":\"<USER_ID>\",\"team\":\"A\"}"

curl -X POST http://localhost:3000/matches/match-badminton-doubles-demo/results \
  -H "Content-Type: application/json" \
  -d "{\"submittedByUserId\":\"<PARTICIPANT_USER_ID>\",\"teamAScore\":21,\"teamBScore\":17}"

curl -X POST http://localhost:3000/matches/match-badminton-doubles-demo/results/<RESULT_ID>/verify
```
