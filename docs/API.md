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

## Auth Placeholder Endpoints
### `POST /auth/login`
Status: Placeholder implemented

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
  "message": "Authentication is not implemented yet.",
  "userEmail": "demo@sports.app",
  "token": "todo-replace-with-real-jwt",
  "todo": "Integrate real auth provider (e.g. Clerk, Auth0, Cognito) and secure JWT flow."
}
```

### `POST /auth/register`
Status: Placeholder implemented

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
  "message": "Registration placeholder accepted.",
  "userEmail": "demo@sports.app",
  "todo": "Implement password policy, email verification, and account recovery."
}
```

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

Default behavior: returns `OPEN` matches unless `status` is provided.

### `GET /matches/:id`
Returns single match with included `participants`, `sport`, and `venue`.

### `POST /matches`
Example request:
```json
{
  "sportId": "uuid",
  "venueId": "uuid",
  "createdByUserId": "uuid",
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

### `POST /matches/:id/join`
Example request:
```json
{
  "userId": "uuid",
  "team": "UNKNOWN"
}
```

Rules:
- prevents duplicate active joins
- prevents joining cancelled/completed matches
- prevents joining full matches
- sets match status to `FULL` when capacity is reached

### `POST /matches/:id/leave`
Example request:
```json
{
  "userId": "uuid"
}
```

Rules:
- marks participant as `LEFT`
- reopens a `FULL` match to `OPEN` if space becomes available

### `POST /matches/:id/results`
Example request:
```json
{
  "submittedByUserId": "uuid",
  "teamAScore": 21,
  "teamBScore": 17
}
```

Response starts with `verified = false`.

### `POST /matches/:id/results/:resultId/verify`
Verifies the submitted result, applies Elo updates, creates rating history rows, and sets match status to `COMPLETED`.

Notes:
- verification cannot run twice for the same result
- Elo logic is implemented in `RatingsService`, not the controller

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
- Auth-protected profile endpoint (current auth is placeholder)
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
- Current mobile auth context is a seeded demo user in `apps/mobile/src/config/demoUser.ts`.
