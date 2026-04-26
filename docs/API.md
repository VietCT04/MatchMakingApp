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
### `DELETE /matches/:id`

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
- Chat endpoints or realtime gateway contract
- Notification preferences endpoints
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
  - `app/(tabs)` for authenticated app shell (`discover`, `create-match`, `ratings`, `profile`)
  - `app/match/[id]` for detail flow
- Authenticated users are routed to `/discover` and use a persistent bottom-tab shell.
- Shared mobile UI primitives live in `apps/mobile/src/components` (screen/layout, button/input/card/badge/chip, loading/error/empty states).
- Normal authenticated flow no longer relies on seeded demo user or mock fallback data in screens.
- Discover supports optional nearby filtering using Expo Location and sends `latitude`, `longitude`, `radiusKm` to `GET /matches`.
- Discover sends `ranked=true` for authenticated users and surfaces `fitScore` labels (for example `92% fit`) while preserving nearby filtering and radius controls.
