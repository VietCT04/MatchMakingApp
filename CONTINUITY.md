# Continuity Notes

## Project Summary
This repository contains the first MVP scaffold for a racket-sports matchmaking app focused on badminton, pickleball, tennis, and similar sports. The product direction is to let players create profiles, discover and create matches, join games, and use a rating system (Elo initially) to improve match quality over time.

## Current Status
- Monorepo scaffold exists and is structured for incremental development.
- Mobile app has Expo Router screens for core flows and an API client abstraction.
- Backend has NestJS modules with REST CRUD skeletons for key resources.
- Prisma schema is defined for users, sports, venues, matches, participation, results, and rating history.
- Elo helper and unit tests exist for core rating math.
- Maps and payments are placeholders/TODO only. Auth is JWT-based for MVP.

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
- Match discovery supports optional ranked mode (`ranked=true`) with rule-based `fitScore` + `fitBreakdown` ordering, including participant reliability contribution.
- Match participant endpoints:
  - `POST /matches/:id/participants` (legacy alias)
  - `POST /matches/:id/join`
  - `POST /matches/:id/leave`
  - `POST /matches/:id/participants/:participantId/no-show`
- Match result endpoints:
  - `POST /matches/:id/results`
  - `POST /matches/:id/results/:resultId/verify`
  - `POST /matches/:id/results/:resultId/disputes`
- Reports endpoint:
  - `POST /reports/users`
- Chat endpoints:
  - `GET /matches/:id/chat/messages`
  - `POST /matches/:id/chat/messages`
- Notification endpoints:
  - `GET /notifications`
  - `GET /notifications/unread-count`
  - `PATCH /notifications/:id/read`
  - `PATCH /notifications/read-all`
- Push endpoints:
  - `POST /push/devices`
  - `DELETE /push/devices/:expoPushToken`
  - `GET /push/devices`
- Notification preferences endpoints:
  - `GET /me/notification-preferences`
  - `PATCH /me/notification-preferences`
- Reliability endpoints:
  - `GET /me/reliability`
  - `GET /users/:userId/reliability`
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
  - Match chat
  - Notifications
  - Rating
- Mobile API client in `apps/mobile/src/lib/api.ts` calls the backend through centralized config.

## Incomplete Features
- Production auth hardening beyond MVP JWT.
- Better result UX and verified-result permissions.
- Chat is implemented as REST polling MVP (no websocket realtime yet).
- In-app notifications are implemented as database-backed source of truth.
- Expo push notifications are implemented as a non-blocking delivery channel.
- Map/location services and geospatial filtering.
- Payment logic.
- Admin/moderation dashboard and dispute-resolution workflow.

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
- Discover can also show reliability from ranked fit breakdown when present.
- Mobile MVP UI is now demo-ready: home flow guidance, polished auth forms, clearer match cards, improved create-match form UX, grouped participants in match detail, clearer result verification messaging, grouped ratings display, and cleaner profile fallbacks.
- Match detail has been redesigned into reusable sections:
  - hero summary (title, sport/format, venue, date/time, status, rating range, fit/distance/reliability badges)
  - status timeline (`OPEN -> FULL -> RESULT SUBMITTED -> VERIFIED/COMPLETED`, with cancelled state handling)
  - team rosters (Team A, Team B, Unknown) with participant status and reliability badges
  - clear main action panel (join/leave/completed states)
  - explicit result workflow card (submit, verify, dispute states and rules)
  - trust/safety panel (report, no-show, dispute actions with permissions)
- Match detail includes a gated `Open chat` action for creator/participants.
- Match chat route (`/match-chat/[id]`) provides:
  - load-on-open messages
  - manual refresh
  - focused interval polling
  - send-and-refresh flow
- Notifications tab (`/notifications`) provides:
  - unread count
  - mark all as read
  - read/unread visual state
  - refresh on focus
  - tap to mark as read and open match detail when `data.matchId` exists
- Mobile auth now attempts push token registration after login/register/session restore, and deactivates known token on logout.
- Push notification taps navigate to match detail when `matchId` exists, otherwise to Notifications tab.
- Profile includes a reliability stats card (score, completions, cancellations, late cancellations, no-shows, disputes, reports).
- Mock data still exists in `src/mock/data.ts`, but MVP screens should surface backend errors instead of silently relying on mocks.
- TODO markers already exist for auth, chat, maps, and payment areas.

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
- Reliability is handled separately in `apps/api/src/reliability/reliability.service.ts` and does not change Elo values.

## API Notes
- REST-first NestJS API.
- Base local URL: `http://localhost:3000`.
- Error responses use Nest defaults (statusCode/message/error) for exceptions.
- Detailed endpoint docs: [docs/API.md](./docs/API.md).
- `GET /matches?ranked=true` returns `fitScore` and `fitBreakdown`, sorted by best fit (rule-based, not AI), and now includes reliability in ranking.
- Chat permissions:
  - read: match creator or any participant status
  - send: match creator (unless cancelled) or JOINED participant
  - send blocked for cancelled match, LEFT participant, and NO_SHOW participant
- Notification events are created in service layer for match/chat/result/rating/trust events.
- Notification creation failures are non-blocking for core workflows.
- Push sending failures are non-blocking and do not roll back core workflows.
- Invalid Expo tokens are deactivated when Expo returns `DeviceNotRegistered`.
- Push delivery respects backend notification preferences (`matchUpdates`, `chatMessages`, `results`, `trustSafety`, `ratingUpdates`).
- Current fit weights:
  - distance 30%
  - rating fit 30%
  - reliability 20%
  - time 10%
  - slot availability 10%
- Backend tests currently include one intentionally skipped integration suite (`match-flow.integration.spec.ts`) when `DATABASE_URL` is not set in the test environment.
- TS151002 ts-jest warning has been resolved by setting isolated module handling in Jest transform config.

## Important Design Decisions
- Monorepo chosen to keep backend, mobile, and shared contracts synchronized.
- Shared types package used for enum/DTO reuse across apps.
- Backend business logic belongs in services, not controllers.
- Mobile screens are intentionally thin; API and business logic should live in abstractions.
- Elo starts simple for speed and readability, with explicit upgrade path later.
- Reliability/trust scoring remains a separate service/domain from Elo skill rating.

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
3. Add websocket realtime chat/notification delivery using existing notification events.
4. Implement payments.
5. Add map UI for visual nearby discovery.
6. Add moderation workflow (resolve/reject disputes, review/dismiss reports) and operator tooling.
7. Evolve ranking with availability windows, reliability trends over time, and learned recommendations.

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
- Keep reliability logic isolated in the reliability service.
- Do not mix Elo (skill) and reliability (trust/safety) concerns.
- Keep the scaffold simple and extensible.
- Do not implement payment, maps, or AI matchmaking unless specifically requested.
- Update `CONTINUITY.md` after every major code change.
