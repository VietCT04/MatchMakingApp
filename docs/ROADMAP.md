# Roadmap

## Phase 1: Scaffold and Basic CRUD
### Goal
Establish clean monorepo foundation with mobile/backend/shared/database scaffolding.

### Tasks
- Set up pnpm workspace.
- Add Expo mobile app and core navigation screens.
- Add NestJS modules and REST skeleton endpoints.
- Add Prisma schema and PostgreSQL docker setup.
- Add basic Elo helper + tests.

### Acceptance Criteria
- Project boots locally.
- CRUD skeleton endpoints exist.
- Mobile routes render and can consume API/mock data.
- Prisma schema compiles and client can be generated.

## Phase 2: Database-Backed Match Discovery
### Goal
Make discovery flow fully DB-backed with practical filters.

### Tasks
- Add discovery query endpoint(s) with filters (sport/date/status/rating).
- Improve match list response shape for mobile.
- Add seed data for local demo.
- Add API tests for discovery behavior.

### Acceptance Criteria
- Discovery screen can query real API filters.
- Query performance acceptable for MVP load.
- Documented API contract and test coverage for filters.

## Phase 3: Elo Rating Update After Verified Result
### Goal
Apply rating changes automatically when a match result is verified.

### Tasks
- Add result submission endpoint.
- Add verification endpoint and basic permissions.
- Compute and persist rating updates.
- Persist `RatingHistory` records.
- Add tests for update pipeline.

### Acceptance Criteria
- Verified result updates ratings deterministically.
- Rating history reflects before/after values.
- Unit + integration tests cover normal and edge cases.

## Phase 4: Authentication
### Goal
Replace auth placeholders with real identity and authorization.

### Tasks
- Integrate auth provider.
- Add JWT/session validation guards.
- Protect create/join/update endpoints.
- Add ownership checks.

### Acceptance Criteria
- Placeholder token removed.
- Protected endpoints reject unauthenticated access.
- User identity is available in request context.

## Phase 5: Location-Based Search
### Goal
Improve match relevance via location-aware discovery.

### Tasks
- Add venue geodata and distance filtering.
- Optionally add PostGIS.
- Add mobile location permission + query UX.

### Acceptance Criteria
- Users can filter nearby matches.
- Distance sorting is accurate and performant.

## Phase 6: Chat and Notifications
### Goal
Support better coordination and engagement.

### Tasks
- Add realtime chat transport and match rooms.
- Add push notification service for invites/reminders.
- Add mute/notification preferences.

### Acceptance Criteria
- Participants can exchange messages in a match room.
- Reminder notifications are sent before match start.

## Phase 7: Payments and Club Tools
### Goal
Enable monetization and organizer workflows.

### Tasks
- Add optional deposits/fees flow.
- Add secure payment integration and webhooks.
- Add basic club organizer controls.

### Acceptance Criteria
- Payment events are auditable and secure.
- Organizers can manage matches/participants at scale.

## Phase 8: Advanced Rating System
### Goal
Improve match quality and confidence handling.

### Tasks
- Evaluate Glicko-2 and TrueSkill migration path.
- Add uncertainty/reliability indicators.
- Add sport/format-specific calibration.

### Acceptance Criteria
- New system outperforms Elo baseline on match-balance metrics.
- Migration path preserves historical rating context.
