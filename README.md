# Sports Matchmaking

Sports Matchmaking is a full-stack MVP for racket-sports coordination: discover or auto-match nearby players, negotiate match details, play, verify results, and track skill/reliability.

## Current Scope

### Core product flows
- JWT auth (register/login/session restore/logout)
- Manual match flow: create, discover, join/leave, submit result, verify result
- Auto-match flow: ticket -> compatible proposal -> negotiation room -> location consensus -> confirmed real match
- Elo rating updates with rating history
- Reliability scoring (no-show, late cancellation, disputes, reports)
- Moderation workflows (USER/MODERATOR/ADMIN)

### Discovery and ranking
- Nearby discovery with PostGIS (`ST_DWithin`) and `distanceKm`
- Ranked discovery with rule-based `fitScore`
- Ranking signals include distance, rating fit, reliability, preference fit, time, slot availability
- User preferences: sport/format preferences, preferred venues, weekly availability

### Communication and notifications
- Match chat (REST + polling)
- Matchmaking proposal chat (REST + polling)
- In-app notifications (source of truth)
- Expo push notifications (delivery channel)
- Notification controls: global preferences, quiet hours, per-match mute

### Mobile UX
- Expo Router tabs + auth routes
- Discover list + map view
- Find Match + proposal list + proposal detail negotiation screen
- Ratings, profile, notification settings, moderation screen (role-gated)

## Tech Stack
- Mobile: React Native + Expo + Expo Router + TypeScript
- Backend: NestJS + TypeScript
- Database: PostgreSQL + PostGIS
- ORM: Prisma
- Monorepo: pnpm workspaces
- Shared contracts: `packages/shared`

## Repo Structure
- `apps/mobile`: Expo app
- `apps/api`: NestJS API + Prisma schema/migrations/seed
- `packages/shared`: shared enums/types/DTO contracts
- `docs`: architecture, API, DB, decisions, testing, security

## Prerequisites
- Node.js 20+
- pnpm 10+
- Docker Desktop

## Setup
1. Install dependencies
```bash
pnpm install
```

2. Configure environment
```bash
cp .env.example .env
```
Required vars: `DATABASE_URL`, `PORT`, `EXPO_PUBLIC_API_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`.

3. Start database
```bash
docker compose up -d
```
If migrating from pre-PostGIS local volumes:
```bash
docker compose down -v
docker compose up -d
```

4. Run migrations + generate Prisma client
```bash
cd apps/api
pnpm prisma:migrate --name init
pnpm prisma:generate
```

5. Seed demo data
```bash
cd apps/api
pnpm prisma:seed
```

## Run
From repo root:
```bash
pnpm dev:api
pnpm dev:mobile
```

Mobile API endpoint:
- Simulator: usually `http://localhost:3000`
- Physical device: use LAN IP (`http://<your-ip>:3000`)

## Verify
From repo root:
```bash
pnpm -r --if-present test
pnpm -r --if-present typecheck
```

## Key API Areas
- Auth: `/auth/*`, `/me`
- Matches: `/matches*`
- Ratings: `/me/ratings`, `/me/rating-history`
- Reliability: `/me/reliability`, `/users/:userId/reliability`
- Reports/moderation: `/reports/*`, `/moderation/*`
- Match chat: `/matches/:id/chat/*`
- Notifications/push/preferences: `/notifications*`, `/push/*`, `/me/notification-preferences`
- Matchmaking:
  - tickets/search/proposals
  - proposal chat
  - location proposals + accept/decline
  - proposal cancel

For exact request/response shapes, see [docs/API.md](./docs/API.md).

## Matchmaking Negotiation Room (Current Behavior)
- Proposal does not auto-timeout after creation.
- Proposal status is negotiation-first (`PENDING`) until finalized.
- Participants chat in the proposal room.
- Participants propose Google Maps location data (name + lat/lng required).
- Real match is created only after unanimous location acceptance.
- Any participant can cancel a pending proposal.
- Backward-compatible proposal accept/decline endpoints remain, but they do not directly create the real match.

## Documentation
- [CONTINUITY.md](./CONTINUITY.md)
- [docs/API.md](./docs/API.md)
- [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)
- [docs/DATABASE.md](./docs/DATABASE.md)
- [docs/RATING_SYSTEM.md](./docs/RATING_SYSTEM.md)
- [docs/SECURITY.md](./docs/SECURITY.md)
- [docs/TESTING.md](./docs/TESTING.md)
- [docs/DECISION_LOG.md](./docs/DECISION_LOG.md)

## Known TODOs
- Proposal/match chat realtime (WebSocket) instead of polling
- Google Maps link parsing and/or Places autocomplete
- Push delivery analytics/observability
- Payments and court booking integration
- Advanced ranking and recommendation improvements
