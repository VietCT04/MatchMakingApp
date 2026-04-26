# Continuity Notes

## Project Summary
This repository contains the first MVP scaffold for a racket-sports matchmaking app focused on badminton, pickleball, tennis, and similar sports. The product direction is to let players create profiles, discover and create matches, join games, and use a rating system (Elo initially) to improve match quality over time.

## Current Status
- Monorepo scaffold exists and is structured for incremental development.
- Mobile app has Expo Router screens for core flows and an API client abstraction.
- Backend has NestJS modules with REST CRUD skeletons for key resources.
- Prisma schema is defined for users, sports, venues, matches, participation, results, and rating history.
- Elo helper and unit tests exist for core rating math.
- Chat, push, maps, and payments are placeholders/TODO only. Auth is JWT-based for MVP.

## Tech Stack
- Package manager: pnpm workspaces
- Mobile: Expo + React Native + TypeScript + Expo Router
- Backend: NestJS + TypeScript
- ORM: Prisma
- Database: PostgreSQL
- Shared contracts: `packages/shared`

## Folder Structure
```txt
sports-matchmaking/
  apps/
    api/                  # NestJS backend + Prisma
    mobile/               # Expo React Native app
  packages/
    shared/               # Shared enums + DTO types
  docs/                   # Project documentation and ADRs
  docker-compose.yml      # Local PostgreSQL
  pnpm-workspace.yaml
  CONTINUITY.md
  README.md
```

## Main App Concepts
- User profile: display name, bio, location text.
- Sport catalog: list of supported sports.
- Match lifecycle: open -> full/completed/cancelled.
- Match participation: player join/leave/no-show with team assignment.
- Match results and rating history are modeled in DB; result submission and verified-result Elo updates are implemented for the MVP.
- Ratings: simple Elo utilities with support for singles and basic doubles averaging.

## Current Features
- `GET /health` endpoint.
- CRUD skeletons for users, sports, venues, matches.
- Match discovery filters on `GET /matches`.
- Match discovery supports optional nearby filtering via `latitude` + `longitude` + `radiusKm`, computed with Haversine in service logic.
- Match discovery supports optional ranked mode (`ranked=true`) with rule-based `fitScore` + `fitBreakdown` ordering.
- Match participant endpoints:
  - `POST /matches/:id/participants` (legacy alias)
  - `POST /matches/:id/join`
  - `POST /matches/:id/leave`
- Match result endpoints:
  - `POST /matches/:id/results`
  - `POST /matches/:id/results/:resultId/verify`
- User rating endpoints:
  - `GET /users/:userId/ratings`
  - `GET /users/:userId/rating-history`
- Ratings endpoints:
  - `GET /ratings/defaults`
  - `GET /ratings?userId=`
  - `POST /ratings/elo/preview`
  - `POST /ratings/elo/preview-doubles`
- Auth endpoints:
  - `POST /auth/login`
  - `POST /auth/register`
  - `GET /auth/me`
  - `GET /me`
  - `GET /me/ratings`
  - `GET /me/rating-history`
- Mobile screens:
  - Home
  - Login/register
  - Player profile
  - Match discovery
  - Create match
  - Match detail
  - Rating
- Mobile API client in `apps/mobile/src/lib/api.ts` calls the backend through centralized config.

## Incomplete Features
- Production auth hardening beyond MVP JWT.
- Better result UX and verified-result permissions.
- Real-time chat implementation (only TODO comments in UI).
- Push notification integration.
- Map/location services and geospatial filtering.
- Payment logic.
- Rating update pipeline exists for verified results, but needs broader integration coverage and product rules for disputes.
- Admin/moderation tooling.

## Backend Notes
- Controllers currently delegate to services and should remain thin.
- Services currently use Prisma directly and contain basic orchestration and validation.
- Global validation pipe is enabled in `main.ts` with whitelist + transform + forbid non-whitelisted properties.
- NotFound exceptions are used for missing entities in services.
- Most modules are CRUD skeletons; business workflows are intentionally minimal.

## Mobile Notes
- Uses Expo Router file-based routes in `apps/mobile/app`.
- API calls go through `src/lib/api.ts`; screens should not call `fetch` directly.
- API base URL is centralized in `src/config/api.ts`.
- Access tokens are stored with Expo SecureStore.
- Normal mobile flow uses authenticated `/me` data instead of the seeded demo user.
- Discovery, create match, match detail, result submission/verification, ratings, and profile screens now call backend APIs directly with loading/error/empty states and retry actions.
- Full MVP mobile flow is stable: `register/login -> discover -> create -> join -> submit result -> verify by different participant -> rating update -> logout`.
- Temporary demo-user/dummy match path has been removed from the normal app flow.
- Discover screen now supports current-location filtering with a radius selector (3/5/10/20 km), and gracefully falls back to showing all open matches if permission is denied.
- Discover now requests ranked results for authenticated users and shows `NN% fit` labels on match cards.
- Mobile MVP UI is now demo-ready: home flow guidance, polished auth forms, clearer match cards, improved create-match form UX, grouped participants in match detail, clearer result verification messaging, grouped ratings display, and cleaner profile fallbacks.
- Mock data still exists in `src/mock/data.ts`, but MVP screens should surface backend errors instead of silently relying on mocks.
- TODO markers already exist for auth, chat, maps, push, and payment areas.

## Database Notes
- Prisma schema file: `apps/api/prisma/schema.prisma`.
- PostgreSQL connection configured via `DATABASE_URL` env var.
- Core entities and enums are defined and relationally linked.
- Seed script exists at `apps/api/prisma/seed.ts`.
- Initial Prisma migration is committed at `apps/api/prisma/migrations/20260425000100_init`.

## Rating System Notes
- Elo constants:
  - default rating = 1200
  - K factor = 32
- Formula helpers implemented in `apps/api/src/ratings/elo.ts`:
  - `expectedScore(playerRating, opponentRating)`
  - `updateRating(playerRating, opponentRating, actualScore)`
  - `teamAverageRating(ratings)`
- Unit tests exist in `apps/api/src/ratings/elo.spec.ts`.
- Verification now persists rating updates and `RatingHistory` rows.

## API Notes
- REST-first NestJS API.
- Base local URL: `http://localhost:3000`.
- Error responses use Nest defaults (statusCode/message/error) for exceptions.
- Detailed endpoint docs: [docs/API.md](./docs/API.md).
- `GET /matches?ranked=true` returns `fitScore` and `fitBreakdown`, sorted by best fit (rule-based, not AI).
- Backend tests currently include one intentionally skipped integration suite (`match-flow.integration.spec.ts`) when `DATABASE_URL` is not set in the test environment.
- TS151002 ts-jest warning has been resolved by setting isolated module handling in Jest transform config.

## Important Design Decisions
- Monorepo chosen to keep backend, mobile, and shared contracts synchronized.
- Shared types package used for enum/DTO reuse across apps.
- Backend business logic belongs in services, not controllers.
- Mobile screens are intentionally thin; API and business logic should live in abstractions.
- Elo starts simple for speed and readability, with explicit upgrade path later.

## Known Limitations
- Passwords are stored as bcrypt hashes; plaintext passwords are not stored.
- Protected match write endpoints derive user identity from JWT.
- No role-based access control.
- No rate limiting or abuse protection yet.
- Verified result flow automatically updates ratings and writes rating history.
- Database-backed backend integration coverage exists for the MVP match flow.
- Auth is no longer placeholder, but still needs production hardening such as refresh/session revocation and email verification.

## Next Recommended Tasks
1. Continue UI polish for mobile screens (spacing, forms, participant display, score UX).
2. Move nearby filtering from app-layer Haversine to PostGIS/indexed geospatial queries.
3. Implement chat and push notifications.
4. Implement payments.
5. Add map UI for visual nearby discovery.
6. Add advanced rating/dispute and moderation rules.
7. Evolve ranking with availability windows, reliability/no-show signals, and learned recommendations.

## Local Development Commands
From repo root:

```bash
pnpm install
docker compose up -d
pnpm dev:api
pnpm dev:mobile
```

Backend Prisma commands:

```bash
cd apps/api
pnpm prisma:migrate --name init
pnpm prisma:generate
pnpm prisma:seed
```

## Testing Commands
From repo root:

```bash
pnpm test
pnpm typecheck
```

Direct backend:

```bash
cd apps/api
pnpm test
pnpm typecheck
```

Direct mobile:

```bash
cd apps/mobile
pnpm typecheck
```

## Rules for Future AI Coding Agents
- Keep business logic in services, not controllers or React screens.
- Reuse shared types from `packages/shared`.
- Do not hardcode API URLs inside screens.
- Keep Elo logic isolated in the ratings service.
- Keep the scaffold simple and extensible.
- Do not implement payment, chat, maps, push notifications, or AI matchmaking unless specifically requested.
- Update `CONTINUITY.md` after every major code change.
