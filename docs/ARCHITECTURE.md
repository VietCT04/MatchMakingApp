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
apps/mobile      # React Native app (Expo Router route groups + shared UI components)
apps/api         # NestJS backend + Prisma schema
packages/shared  # Shared TS enums and DTO interfaces
docs             # Architecture, API, DB, roadmap, ADRs
```

## Mobile Routing Structure
```txt
apps/mobile/app/
  (auth)/
    login.tsx
    register.tsx
  (tabs)/
    _layout.tsx
    discover.tsx
    create-match.tsx
    notifications.tsx
    ratings.tsx
    profile.tsx
  map.tsx
  moderation.tsx
  notification-settings.tsx
  match/[id].tsx
  match-chat/[id].tsx
  _layout.tsx
```

## Mobile Responsibility
- Render user-facing screens and basic navigation.
- Keep UI logic in screens/components.
- Delegate data access to `src/lib/api.ts`.
- Use shared enums/DTO shapes from `packages/shared` where practical.
- Surface loading/error/empty states when backend data is unavailable.
- Keep shared visual primitives in `apps/mobile/src/components` to reduce style duplication.
- Keep authenticated shell navigation in Expo Router tabs for Discover/Create/Notifications/Ratings/Profile.
- Expose moderation route outside tabs and gate access by authenticated user role (`ADMIN`/`MODERATOR`).

## Backend Responsibility
- Expose REST endpoints.
- Validate input (global validation pipe + DTO decorators).
- Keep request handling in controllers.
- Keep business logic and orchestration in services.
- Access persistence only through Prisma service.
- Nearby match filtering uses parameterized raw SQL with PostGIS functions in the match query service.
- Match chat is implemented as REST endpoints + permission checks in `ChatService` (polling MVP, no websocket layer yet).
- Chat unread state is persisted via `ChatReadState` and exposed through REST unread/read endpoints.
- In-app notifications are implemented as database-backed events in `NotificationsService` with per-user read/unread state.
- Expo push notifications are a delivery channel driven by `NotificationsService` + `PushService`.
- Push delivery applies layered controls: category preference -> quiet hours -> per-match mute.
- Moderation workflows run in a dedicated `ModerationService` and are protected by `JwtAuthGuard + RolesGuard`.
- Moderation outcomes write `ModerationAction` audit rows and can adjust reliability penalties.

## Shared Package Responsibility
- Centralize reusable enums and DTO interfaces:
  - `SportFormat`
  - `MatchStatus`
  - `MatchParticipantStatus`
  - `Team`
  - `DisputeStatus`
  - `ReportStatus`
  - `NotificationType`
  - `PushDevicePlatform`
  - `UserDto`, `SportDto`, `MatchDto`, `RatingDto`
- Reduce type drift between mobile and API.

## Database Responsibility
- Store durable records for users, sports, ratings, venues, matches, participants, results, rating history, reliability stats, disputes, reports, chat messages, notifications, push devices, and notification preferences.
- Store per-user match mute preferences and chat read-state (`MatchNotificationPreference`, `ChatReadState`) for notification/chat UX controls.
- Store moderation audit events in `ModerationAction`.
- Enforce relational consistency via foreign keys and unique constraints.
- Power nearby geospatial discovery with PostGIS extension + spatial expression index on venue coordinates.

## Request Flow Example
1. Mobile screen triggers API call.
2. `apps/mobile/src/lib/api.ts` sends HTTP request.
3. NestJS controller receives request and maps to service.
4. Service performs business logic and calls Prisma.
5. Prisma executes query against PostgreSQL.
6. Response returns through service -> controller -> mobile client.

## Chat MVP Flow
1. Match creator/participant opens chat route (`/match-chat/[id]`).
2. Mobile fetches `GET /matches/:id/chat/messages` and renders sender/timestamp bubbles.
3. Mobile optionally polls every few seconds while focused.
4. Sending uses `POST /matches/:id/chat/messages`.
5. Backend enforces chat permissions and returns message with sender summary.

## Notifications MVP Flow
1. Domain services emit notification events when core actions occur (join/leave/chat/result/rating/dispute/report/no-show).
2. `NotificationsService` stores per-user notifications in PostgreSQL.
3. Mobile Notifications tab fetches notifications and unread count via REST.
4. Users mark one or all notifications as read.
5. Notification tap can deep-link to match detail using `data.matchId`.
6. Notifications screen links to `/notification-settings`, where users manage backend push category preferences.

## Push Delivery Flow
1. `NotificationsService` creates database notification rows (source of truth).
2. After create, it calls `PushService.deliverNotification(...)`.
3. `PushService` loads active push devices and preference flags for the target user.
4. Expo push payload is sent with `notificationId`, `type`, and optional `matchId/resultId/chatMessageId`.
5. Push failures are logged and do not fail the originating workflow.

## Future Architecture
- Auth provider
  - Current MVP uses email/password JWT auth; a future provider can replace or augment it.
- Push notifications
  - Expand Expo push delivery with receipts, retries, per-match mute, and quiet-hours controls.
- Realtime chat
  - Add websocket or SSE channel scoped to match rooms.
- Payment
  - Add payment service abstraction and secure webhook handling.
- Admin dashboard
  - Add separate web/admin app for richer moderation, disputes, and operational controls.

## Related Docs
- [API](./API.md)
- [Database](./DATABASE.md)
- [Rating System](./RATING_SYSTEM.md)
- [Roadmap](./ROADMAP.md)
