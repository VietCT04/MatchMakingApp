# Sports Matchmaking

Sports Matchmaking is an MVP scaffold for a racket-sports matchmaking product where players discover and create matches, join games, and track skill through a simple Elo-based rating system.

## Product Idea
Build an iOS-first app (React Native/Expo) for badminton, pickleball, tennis, and related sports:
- Player profiles with sport-level ratings
- Match discovery and match creation
- Match participation and result tracking
- Upgradeable rating engine (start Elo, evolve later)

## Main Features (Current Scaffold)
- Mobile screens for home, login/register, profile, discovery, create match, match details, and ratings
- API client abstraction connected to the backend for mobile
- NestJS REST API with modules for users, sports, matches, ratings, venues, JWT auth, and health
- Prisma schema for key relational entities
- Elo helper utilities with unit tests
- Nearby open-match discovery using venue coordinates and Haversine distance filtering
- Rule-based ranked discovery (`fitScore`) for personalized match ordering

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
- `JWT_SECRET`
- `JWT_EXPIRES_IN`

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

The first committed migration is `20260425000100_init`.

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
- Access tokens are stored with Expo SecureStore.

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
  - App does not fall back to mock data in normal flow; confirm network and API health endpoint.

## Roadmap (High Level)
- Phase 1: scaffold + CRUD skeleton (current)
- Phase 2: robust DB-backed match discovery and filtering (partially implemented)
- Phase 3: rating update workflow after verified results (partially implemented)
- Phase 4: JWT auth and protected match writes (implemented)
- Phase 5: location-based matching
- Phase 6: realtime chat + notifications
- Phase 7: payments + club tooling
- Phase 8: advanced rating system (Glicko-2/TrueSkill)

## Implemented MVP Backend Flow
- `GET /matches` supports filters: `sportId`, `format`, `status`, `minRating`, `maxRating`, `startsAfter`, `startsBefore`, `venueId`, `latitude`, `longitude`, `radiusKm`, `ranked`.
- `GET /matches?ranked=true` adds `fitScore` + `fitBreakdown` and sorts by best fit for the authenticated user.
- Ranked fit is rule-based (distance, rating fit, time, slot availability), not AI matchmaking.
- `POST /matches/:id/join` joins a user, prevents duplicates/full/completed/cancelled matches, and marks a full match as `FULL`.
- `POST /matches/:id/leave` marks a participant as `LEFT` and reopens a full match if space becomes available.
- `POST /matches/:id/results` records an unverified match result.
- `POST /matches/:id/results/:resultId/verify` verifies the result, applies Elo updates, creates `RatingHistory`, and completes the match.
- `GET /users/:userId/ratings` returns a user's current sport ratings.
- `GET /users/:userId/rating-history` returns rating change history.

## Implemented MVP Mobile Flow
- Stable authenticated flow now covers:
  - register/login -> discover open matches -> create match -> join/leave -> submit result -> verify result (different joined participant) -> rating update visible in ratings/profile -> logout
- Match Discovery fetches open matches from the backend and supports simple sport filtering.
- Match Discovery supports optional nearby mode:
  - "Use my location" permission flow
  - radius filter options (`3`, `5`, `10`, `20` km)
  - distance labels on cards (for example `2.4 km away`)
  - denied permission fallback message while still showing all open matches
- Authenticated discovery requests ranked results and shows `NN% fit` per card (`Best matches for you`).
- Create Match fetches sports/venues and posts to `POST /matches`.
- Match Detail supports join, leave, submit result, verify result, and refreshes data after actions.
- Login/Register use `/auth/login` and `/auth/register`.
- Authenticated API calls attach `Authorization: Bearer <token>`.
- Create, join, leave, submit result, and verify result derive user identity from JWT.
- Ratings uses `/me/ratings` and `/me/rating-history`.
- Profile uses `/me`.
- Temporary demo-user normal flow has been removed from navigation and match detail behavior.

## Remaining TODOs
- Better UI polish and richer UX states.
- Full map UI and richer map-based nearby discovery.
- Chat and push notifications.
- Payments.
- PostGIS/indexed geospatial querying for large-scale nearby search.
- Advanced rating/dispute rules.
- Richer ranking signals (availability windows, reliability/no-show history, and learned recommendations).

## Auth Quick Test
```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"viet@example.com\",\"password\":\"password123\",\"displayName\":\"Viet\"}"

curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"viet@example.com\",\"password\":\"password123\"}"

curl http://localhost:3000/me \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

## Manual Match Flow Test
After migration + seed, use the seeded records from `apps/api/prisma/seed.ts`.

```bash
curl http://localhost:3000/health
curl http://localhost:3000/sports
curl http://localhost:3000/users
curl "http://localhost:3000/matches?status=OPEN"
curl "http://localhost:3000/matches?status=OPEN&ranked=true&latitude=1.3002&longitude=103.8001&radiusKm=5" \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

Join, submit, and verify flow:

```bash
curl -X POST http://localhost:3000/matches/match-badminton-doubles-demo/join \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d "{\"team\":\"A\"}"

curl -X POST http://localhost:3000/matches/match-badminton-doubles-demo/results \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d "{\"teamAScore\":21,\"teamBScore\":17}"

curl -X POST http://localhost:3000/matches/match-badminton-doubles-demo/results/<RESULT_ID>/verify \
  -H "Authorization: Bearer <ACCESS_TOKEN_FOR_DIFFERENT_JOINED_PARTICIPANT>"
```

Backend integration coverage for this flow lives in `apps/api/src/matches/match-flow.integration.spec.ts`.
