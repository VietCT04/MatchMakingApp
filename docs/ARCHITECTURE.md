# Architecture

## High-Level Architecture
```mermaid
flowchart LR
  Mobile[Expo Mobile App]\n(apps/mobile) --> ApiClient[src/lib/api.ts]
  ApiClient --> Nest[NestJS REST API]\n(apps/api)
  Nest --> Services[Domain Services]
  Services --> Prisma[Prisma Client]
  Prisma --> Postgres[(PostgreSQL)]
  Shared[packages/shared] --> Mobile
  Shared --> Nest
```

## Monorepo Structure
```txt
apps/mobile      # React Native app (Expo Router screens)
apps/api         # NestJS backend + Prisma schema
packages/shared  # Shared TS enums and DTO interfaces
docs             # Architecture, API, DB, roadmap, ADRs
```

## Mobile Responsibility
- Render user-facing screens and basic navigation.
- Keep UI logic in screens/components.
- Delegate data access to `src/lib/api.ts`.
- Use shared enums/DTO shapes from `packages/shared` where practical.
- Surface loading/error/empty states when backend data is unavailable.

## Backend Responsibility
- Expose REST endpoints.
- Validate input (global validation pipe + DTO decorators).
- Keep request handling in controllers.
- Keep business logic and orchestration in services.
- Access persistence only through Prisma service.

## Shared Package Responsibility
- Centralize reusable enums and DTO interfaces:
  - `SportFormat`
  - `MatchStatus`
  - `MatchParticipantStatus`
  - `Team`
  - `UserDto`, `SportDto`, `MatchDto`, `RatingDto`
- Reduce type drift between mobile and API.

## Database Responsibility
- Store durable records for users, sports, ratings, venues, matches, participants, results, and rating history.
- Enforce relational consistency via foreign keys and unique constraints.

## Request Flow Example
1. Mobile screen triggers API call.
2. `apps/mobile/src/lib/api.ts` sends HTTP request.
3. NestJS controller receives request and maps to service.
4. Service performs business logic and calls Prisma.
5. Prisma executes query against PostgreSQL.
6. Response returns through service -> controller -> mobile client.

## Future Architecture
- Auth provider
  - Current MVP uses email/password JWT auth; a future provider can replace or augment it.
- Push notifications
  - Add job/event pipeline for invites, reminders, and cancellations.
- Realtime chat
  - Add websocket or SSE channel scoped to match rooms.
- Payment
  - Add payment service abstraction and secure webhook handling.
- Admin dashboard
  - Add separate web/admin app for moderation, disputes, and operational controls.

## Related Docs
- [API](./API.md)
- [Database](./DATABASE.md)
- [Rating System](./RATING_SYSTEM.md)
- [Roadmap](./ROADMAP.md)
