# API Documentation

## Base URL
- Local: `http://localhost:3000`

## Health Endpoint
### `GET /health`
Response:
```json
{
  "status": "ok",
  "timestamp": "2026-04-25T10:00:00.000Z"
}
```

## Auth Endpoints
### `POST /auth/login`
Request:
```json
{
  "email": "demo@sports.app",
  "password": "password123"
}
```

Response:
```json
{
  "accessToken": "jwt",
  "user": {
    "id": "uuid",
    "email": "demo@sports.app",
    "role": "USER",
    "displayName": "Demo Player"
  }
}
```

### `POST /auth/register`
Request:
```json
{
  "email": "demo@sports.app",
  "password": "password123",
  "displayName": "Demo Player"
}
```

Response:
```json
{
  "accessToken": "jwt",
  "user": {
    "id": "uuid",
    "email": "demo@sports.app",
    "role": "USER",
    "displayName": "Demo Player"
  }
}
```

### `GET /auth/me`
Requires `Authorization: Bearer <token>`.

### `GET /me`
Requires `Authorization: Bearer <token>`.

### `GET /me/ratings`
Requires `Authorization: Bearer <token>`.

### `GET /me/rating-history`
Requires `Authorization: Bearer <token>`.
Returns rating history rows including correction metadata:
- `correctionOfRatingHistoryId`
- `isReverted`
- `revertedAt`
- `revertReason`

## Users Endpoints
### `GET /users`
### `GET /users/:id`
### `POST /users`
### `PATCH /users/:id`
### `DELETE /users/:id`

Example create request:
```json
{
  "email": "player1@example.com",
  "displayName": "Player One",
  "bio": "Loves doubles",
  "homeLocationText": "Singapore"
}
```

Example response:
```json
{
  "id": "uuid",
  "email": "player1@example.com",
  "role": "USER",
  "displayName": "Player One",
  "bio": "Loves doubles",
  "homeLocationText": "Singapore",
  "createdAt": "2026-04-25T10:00:00.000Z",
  "updatedAt": "2026-04-25T10:00:00.000Z"
}
```

## Sports Endpoints
### `GET /sports`
### `GET /sports/:id`
### `POST /sports`
### `PATCH /sports/:id`
### `DELETE /sports/:id`

Example create request:
```json
{
  "name": "Badminton"
}
```

## Venues Endpoints
### `GET /venues`
### `GET /venues/:id`
### `POST /venues`
### `PATCH /venues/:id`
### `DELETE /venues/:id`

Example create request:
```json
{
  "name": "Jurong Sports Hall",
  "address": "1 Jurong East Street",
  "latitude": 1.3333,
  "longitude": 103.7433
}
```

## Matches Endpoints
### `GET /matches`
Returns matches with included `participants`, `sport`, and `venue`.

Supported query filters:
- `sportId`
- `format`
- `status`
- `minRating`
- `maxRating`
- `startsAfter`
- `startsBefore`
- `venueId`
- `latitude`
- `longitude`
- `radiusKm`
- `ranked` (`true` / `false`)

Default behavior: returns `OPEN` matches unless `status` is provided.

Nearby behavior:
- If `latitude`, `longitude`, and `radiusKm` are all provided, matches are filtered to venues within radius.
- `distanceKm` is included per match in nearby mode.
- If location params are not provided, existing non-location discovery behavior stays unchanged.
- Nearby filtering and distance calculation are executed in PostGIS (`ST_DWithin` and `ST_Distance`) with parameterized SQL in the service layer.

Ranked behavior:
- If `ranked=true`, response includes `fitScore` and `fitBreakdown` per match and results are sorted by `fitScore` descending.
- If JWT is present, ranking uses the authenticated user's rating for the match sport+format.
- If JWT is absent (public discovery), ranking falls back to neutral/default rating behavior and still returns valid ranked output.
- Ranking is rule-based (distance, rating fit, participant reliability, time, slot availability), not AI-driven.

Fit score formula (0-100):
- `fitScore = distanceScore * 0.30 + ratingFitScore * 0.30 + reliabilityScore * 0.20 + timeScore * 0.10 + slotAvailabilityScore * 0.10`
- `distanceScore`: linear drop from `100` at `0 km` to `0` at `radiusKm` (neutral `50` if no location).
- `ratingFitScore`: `100` when inside match range; decays as user rating moves outside range; defaults to rating `1200` when missing.
- `reliabilityScore`: average joined-participant reliability in the match; neutral `80` when no joined participants.
- `timeScore`: future matches score higher; past matches do not appear in default `OPEN` discovery.
- `slotAvailabilityScore`: higher when more slots are open; full matches do not appear in default `OPEN` discovery.

Ranked response shape example:
```json
{
  "id": "match-uuid",
  "title": "Saturday Doubles",
  "distanceKm": 2.4,
  "fitScore": 92.35,
  "fitBreakdown": {
    "distanceScore": 88,
    "ratingFitScore": 100,
    "reliabilityScore": 95,
    "timeScore": 90,
    "slotAvailabilityScore": 80
  }
}
```

Nearby validation:
- `latitude`: `-90` to `90`
- `longitude`: `-180` to `180`
- `radiusKm`: `> 0` and `<= 100`
- If any one of `latitude|longitude|radiusKm` is provided, all three are required.

### `GET /matches/:id`
Returns single match with included `participants`, `sport`, and `venue`.

### `POST /matches`
Requires `Authorization: Bearer <token>`.

Example request:
```json
{
  "sportId": "uuid",
  "venueId": "uuid",
  "title": "Saturday Doubles",
  "description": "Intermediate level",
  "format": "DOUBLES",
  "startsAt": "2026-05-01T09:00:00.000Z",
  "maxPlayers": 4,
  "minRating": 1000,
  "maxRating": 1500
}
```

### `PATCH /matches/:id`
Requires `Authorization: Bearer <token>`.

Rules:
- only match creator, `ADMIN`, or `MODERATOR` can update
- non-owner `USER` is forbidden
- `createdByUserId` cannot be reassigned via update payload

### `DELETE /matches/:id`
Requires `Authorization: Bearer <token>`.

Current MVP behavior:
- performs protected soft-cancel (`status = CANCELLED`) instead of hard delete
- only match creator, `ADMIN`, or `MODERATOR` can cancel
- completed matches can only be cancelled by `ADMIN`

### `POST /matches/:id/participants`
Status: legacy alias for joining a match.
Requires `Authorization: Bearer <token>`.

### `POST /matches/:id/join`
Requires `Authorization: Bearer <token>`.

Example request:
```json
{
  "team": "UNKNOWN"
}
```

Rules:
- prevents duplicate active joins
- prevents joining cancelled/completed matches
- prevents joining full matches
- sets match status to `FULL` when capacity is reached

### `POST /matches/:id/leave`
Requires `Authorization: Bearer <token>`.

Example request:
```json
{}
```

Rules:
- marks participant as `LEFT`
- reopens a `FULL` match to `OPEN` if space becomes available
- increments reliability cancellation stats
- increments late-cancellation count if leaving within 2 hours before `startsAt` (MVP threshold)

### `POST /matches/:id/participants/:participantId/no-show`
Requires `Authorization: Bearer <token>`.

Rules:
- creator-only action (for now)
- cannot mark before match start
- cannot mark yourself as no-show
- prevents duplicate no-show marking
- updates participant status to `NO_SHOW`
- updates target user's reliability stats

### `POST /matches/:id/results`
Requires `Authorization: Bearer <token>`.

Example request:
```json
{
  "teamAScore": 21,
  "teamBScore": 17
}
```

Response starts with `verified = false`.

### `POST /matches/:id/results/:resultId/verify`
Requires `Authorization: Bearer <token>`.
Verifies the submitted result, applies Elo updates, creates rating history rows, and sets match status to `COMPLETED`.

Notes:
- verification cannot run twice for the same result
- verifier must be a joined participant
- verifier cannot be the result submitter
- Elo logic is implemented in `RatingsService`, not the controller
- completed-match reliability stats increment for joined participants at verification time

### `POST /matches/:id/results/:resultId/disputes`
Requires `Authorization: Bearer <token>`.

Request:
```json
{
  "reason": "Score is incorrect"
}
```

Rules:
- only joined participants can dispute
- same user cannot create duplicate dispute for the same result
- reason is required and minimum length is 5
- creates dispute with `OPEN` status

### `GET /matches/:id/chat/messages`
Requires `Authorization: Bearer <token>`.

Optional query:
- `limit` (default 50, max 100)
- `before` (ISO datetime, returns messages before this timestamp)

Response:
- returns match chat messages sorted oldest to newest
- each message includes sender summary:
```json
{
  "id": "message-uuid",
  "matchId": "match-uuid",
  "senderUserId": "user-uuid",
  "body": "See you at 7pm?",
  "createdAt": "2026-04-26T12:00:00.000Z",
  "updatedAt": "2026-04-26T12:00:00.000Z",
  "sender": {
    "id": "user-uuid",
    "displayName": "Player One"
  }
}
```

### `POST /matches/:id/chat/messages`
Requires `Authorization: Bearer <token>`.

Request:
```json
{
  "body": "See you at 7pm?"
}
```

Rules:
- only match creator or match participants can access chat
- LEFT participants can read but cannot send
- NO_SHOW participants cannot send
- creator can send unless match is cancelled
- sending is blocked for cancelled matches
- `body` is required, min length 1, max length 1000

### `GET /matches/:id/chat/unread-count`
Requires `Authorization: Bearer <token>`.

Response:
```json
{
  "count": 3
}
```

Rules:
- only match creator or participants can access
- counts messages after `lastReadAt`
- excludes current user's own messages

### `PATCH /matches/:id/chat/read`
Requires `Authorization: Bearer <token>`.

Response:
```json
{
  "success": true
}
```

Rules:
- only match creator or participants can mark read
- updates per-user read state for the match chat

## Reliability Endpoints
### `GET /me/reliability`
Requires `Authorization: Bearer <token>`.

### `GET /users/:userId/reliability`
Public endpoint for user reliability summary.

Example response:
```json
{
  "userId": "uuid",
  "completedMatches": 3,
  "cancelledMatches": 1,
  "lateCancellationCount": 1,
  "noShowCount": 0,
  "disputedResults": 0,
  "reportCount": 0,
  "reliabilityScore": 95
}
```

Reliability formula:
- `reliabilityScore = clamp(0, 100, 100 - noShowCount*10 - lateCancellationCount*5 - disputedResults*5 - reportCount*3)`
- Reliability is separate from Elo and does not affect rating history math.
- `GET /me/reliability` and `GET /users/:userId/reliability` are read-only and do not create DB rows; missing stats return default summary values.

## Reports Endpoints
### `POST /reports/users`
Requires `Authorization: Bearer <token>`.

Request:
```json
{
  "reportedUserId": "uuid",
  "matchId": "uuid-optional",
  "reason": "No show without notice"
}
```

Rules:
- user cannot report themselves
- reason is required and minimum length is 5
- if `matchId` is provided, reporter must be a participant in that match
- creates report with `OPEN` status
- increments reported-user reliability report count

## Moderation Endpoints
All moderation endpoints require `Authorization: Bearer <token>` and role `MODERATOR` or `ADMIN`.

### `GET /moderation/reports`
Query:
- `status` optional (`OPEN`, `REVIEWED`, `DISMISSED`)
- `limit` optional (default 50)

### `PATCH /moderation/reports/:id`
Request:
```json
{
  "status": "REVIEWED",
  "moderatorNote": "Reviewed and confirmed"
}
```

Rules:
- valid transitions: `OPEN -> REVIEWED|DISMISSED`
- saves moderation reviewer fields
- creates moderation audit log row
- `DISMISSED` decrements reported user's `reportCount` (min 0) and recalculates reliability

### `GET /moderation/disputes`
Query:
- `status` optional (`OPEN`, `RESOLVED`, `REJECTED`)
- `limit` optional (default 50)

### `PATCH /moderation/disputes/:id`
Request:
```json
{
  "status": "RESOLVED",
  "moderatorNote": "Score was entered incorrectly",
  "correctedTeamAScore": 17,
  "correctedTeamBScore": 21
}
```

Rules:
- valid transitions: `OPEN -> RESOLVED|REJECTED`
- saves moderation reviewer fields
- creates moderation audit log row
- `REJECTED` decrements dispute creator `disputedResults` (min 0) and recalculates reliability
- when `RESOLVED` with corrected scores:
  - verified match result is marked corrected
  - original `RatingHistory` rows for the match are marked reverted
  - affected users are rolled back to original pre-match ratings
  - corrected Elo is applied for that disputed match only
  - new correction `RatingHistory` rows are appended (audit-preserving)
- correction is rejected if:
  - result is not verified
  - result was already corrected
  - no rating history exists for that match
- MVP limitation: full chronological replay for later matches is future work

### `GET /moderation/no-shows`
Returns current `NO_SHOW` participant records with match/user context.

### `PATCH /moderation/no-shows/:participantId`
Request:
```json
{
  "action": "REVERSE",
  "moderatorNote": "Player provided valid reason"
}
```

Rules:
- only for participants currently in `NO_SHOW` state
- `CONFIRM` keeps status and writes audit row
- `REVERSE` sets status back to `JOINED`, decrements `noShowCount` (min 0), recalculates reliability
- creates moderation audit log row

## Notifications Endpoints
### `GET /notifications`
Requires `Authorization: Bearer <token>`.

Query params:
- `limit` (optional, default `30`, max `100`)
- `unreadOnly` (optional boolean)

Response:
```json
{
  "items": [
    {
      "id": "uuid",
      "type": "CHAT_MESSAGE",
      "title": "New chat message",
      "body": "Alex: See you at 7pm",
      "data": {
        "matchId": "uuid",
        "chatMessageId": "uuid"
      },
      "readAt": null,
      "createdAt": "2026-04-26T12:00:00.000Z"
    }
  ]
}
```

### `GET /notifications/unread-count`
Requires `Authorization: Bearer <token>`.

Response:
```json
{
  "count": 3
}
```

### `PATCH /notifications/:id/read`
Requires `Authorization: Bearer <token>`.
Marks one notification as read.
Users cannot mark another user's notification.

### `PATCH /notifications/read-all`
Requires `Authorization: Bearer <token>`.
Marks all current-user unread notifications as read.

Notification generation events (MVP):
- match join / leave
- chat message
- result submitted / verified
- rating updated
- dispute created
- report submitted (reporter confirmation only)
- no-show marked

Notes:
- Notifications are database-backed in-app events.
- Expo push notifications are implemented as a delivery layer on top of notification records.
- Push failures are non-blocking and do not prevent in-app notification creation.

## Push Devices Endpoints
### `POST /push/devices`
Requires `Authorization: Bearer <token>`.

Request:
```json
{
  "expoPushToken": "ExponentPushToken[...]",
  "platform": "IOS",
  "deviceName": "iPhone"
}
```

Behavior:
- upserts token
- associates token with current user
- sets `isActive=true`
- updates `lastSeenAt`

### `DELETE /push/devices/:expoPushToken`
Requires `Authorization: Bearer <token>`.

Behavior:
- deactivates current-user token (`isActive=false`)
- users cannot deactivate another user's token

### `GET /push/devices`
Requires `Authorization: Bearer <token>`.
Returns current user's active push devices.

## Notification Preferences Endpoints
### `GET /me/notification-preferences`
Requires `Authorization: Bearer <token>`.

### `PATCH /me/notification-preferences`
Requires `Authorization: Bearer <token>`.

Request (all optional):
```json
{
  "matchUpdates": true,
  "chatMessages": true,
  "results": true,
  "trustSafety": true,
  "ratingUpdates": true,
  "quietHoursEnabled": true,
  "quietHoursStart": "22:00",
  "quietHoursEnd": "08:00",
  "timezone": "Asia/Singapore"
}
```

Quiet-hours validation:
- when `quietHoursEnabled=true`, `quietHoursStart` and `quietHoursEnd` are required
- `quietHoursStart` and `quietHoursEnd` use `HH:mm` format
- `timezone` is optional (defaults to `Asia/Singapore` when not set)

Push preference mapping:
- `CHAT_MESSAGE` -> `chatMessages`
- `MATCH_JOINED`, `MATCH_LEFT`, `MATCH_CANCELLED` -> `matchUpdates`
- `RESULT_SUBMITTED`, `RESULT_VERIFIED` -> `results`
- `DISPUTE_CREATED`, `REPORT_CREATED`, `NO_SHOW_MARKED` -> `trustSafety`
- `RATING_UPDATED` -> `ratingUpdates`
- `SYSTEM` -> always allowed

### `GET /matches/:id/notification-preference`
Requires `Authorization: Bearer <token>`.

Response:
```json
{
  "id": "uuid",
  "userId": "uuid",
  "matchId": "uuid",
  "muted": false,
  "muteUntil": null,
  "createdAt": "2026-04-27T12:00:00.000Z",
  "updatedAt": "2026-04-27T12:00:00.000Z"
}
```

### `PATCH /matches/:id/notification-preference`
Requires `Authorization: Bearer <token>`.

Request:
```json
{
  "muted": true,
  "muteUntil": "2026-04-28T12:00:00.000Z"
}
```

Rules:
- only match creator or participants can read/update this preference
- `muteUntil` must be a future datetime when provided
- per-match mute affects push delivery only (in-app notifications still persist)

Mobile usage:
- The Notifications tab links to `/notification-settings`.
- The settings screen fetches preferences with `GET /me/notification-preferences`, allows local toggle edits, and saves with `PATCH /me/notification-preferences`.

## Ratings Endpoints
### `GET /ratings/defaults`
Response:
```json
{
  "defaultRating": 1200,
  "kFactor": 32
}
```

### `GET /ratings`
Optional query: `userId`

### `POST /ratings/elo/preview`
Request:
```json
{
  "playerRating": 1200,
  "opponentRating": 1250,
  "actualScore": 1
}
```

Response:
```json
{
  "oldRating": 1200,
  "newRating": 1218
}
```

### `POST /ratings/elo/preview-doubles`
Request:
```json
{
  "teamARatings": [1200, 1220],
  "teamBRatings": [1180, 1210],
  "teamAActualScore": 1
}
```

## Error Response Format
Current API uses NestJS default exception format.

Example 404 response:
```json
{
  "statusCode": 404,
  "message": "User not found",
  "error": "Not Found"
}
```

Validation errors (from `ValidationPipe`) typically return:
```json
{
  "statusCode": 400,
  "message": ["displayName must be shorter than or equal to 100 characters"],
  "error": "Bad Request"
}
```

## TODO API Endpoints
- Realtime websocket gateway contract for chat/notifications
- Dedicated match-discovery endpoint if `GET /matches` filtering becomes too broad

## Related Docs
- [Architecture](./ARCHITECTURE.md)
- [Database](./DATABASE.md)
- [Rating System](./RATING_SYSTEM.md)

## Mobile Client Notes
- Expo API base URL is configured in `apps/mobile/src/config/api.ts`.
- iOS simulator can use `http://localhost:3000`.
- Physical devices need `EXPO_PUBLIC_API_URL` set to the development computer LAN address.
- Current mobile auth context uses JWT tokens stored through Expo SecureStore.
- `AuthContext` restores token on startup, refreshes current user via `/me` (fallback `/auth/me`), and clears token/session on `401`.
- Mobile routing now uses Expo Router groups:
  - `app/(auth)` for login/register
  - `app/(tabs)` for authenticated app shell (`discover`, `create-match`, `notifications`, `ratings`, `profile`)
  - `app/map` for map-based nearby discovery
  - `app/match/[id]` for detail flow
  - `app/match-chat/[id]` for match chat
- Authenticated users are routed to `/discover` and use a persistent bottom-tab shell.
- Shared mobile UI primitives live in `apps/mobile/src/components` (screen/layout, button/input/card/badge/chip, loading/error/empty states).
- Normal authenticated flow no longer relies on seeded demo user or mock fallback data in screens.
- Discover supports optional nearby filtering using Expo Location and sends `latitude`, `longitude`, `radiusKm` to `GET /matches`.
- Discover sends `ranked=true` for authenticated users and surfaces `fitScore` labels (for example `92% fit`) while preserving nearby filtering and radius controls.
- Map discovery uses the same nearby ranked request (`GET /matches` with `status=OPEN`, `latitude`, `longitude`, `radiusKm`, `ranked=true`) and relies on `venue.latitude/longitude` for marker placement.
- Mobile auth flow attempts push-token registration after login/register/session restore.
- Mobile logout attempts to deactivate known push token via `DELETE /push/devices/:expoPushToken`.

## Profile and Preferences APIs
PATCH /me/profile (JWT)
- Body: { displayName, bio?, homeLocationText?, avatarUrl?, skillDescription? }`n- Validation: displayName 2-80, bio <=500, homeLocationText <=120.

GET /me/preferences (JWT)
- Returns { profile, sportPreferences, preferredVenues, availability }.

PATCH /me/preferences/sports (JWT)
- Replaces all sport preferences.
- Body: { sports: [{ sportId, prefersSingles, prefersDoubles, minPreferredRating?, maxPreferredRating?, priority? }] }`n
PATCH /me/preferences/venues (JWT)
- Replaces all preferred venues.
- Body: { venues: [{ venueId, priority? }] }`n
PATCH /me/preferences/availability (JWT)
- Replaces weekly availability.
- Body: { availability: [{ dayOfWeek, startTime, endTime, timezone? }] }`n
## Ranked Fit Formula (updated)
itScore =
- distanceScore * 0.25
- atingFitScore * 0.25
- eliabilityScore * 0.15
- preferenceScore * 0.20
- 	imeScore * 0.10
- slotAvailabilityScore * 0.05

preferenceScore is rule-based and boosts for matching sport/format, preferred venue, and weekly availability overlap; defaults to neutral 50 with no preferences.

