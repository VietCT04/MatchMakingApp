# Decision Log

## 2026-04-28: Secure match update/delete and reduce orchestration hotspots

Decision:
- Protect `PATCH /matches/:id` and `DELETE /matches/:id` with JWT.
- Enforce owner/role authorization in service layer:
  - creator, `MODERATOR`, `ADMIN` allowed
  - non-owner `USER` forbidden
- Convert delete behavior to soft-cancel (`status=CANCELLED`) instead of hard delete.
- Restrict completed-match cancellation to `ADMIN` only.
- Make reliability GET behavior read-only:
  - no upsert side effects
  - return default summary when stats row is missing
- Remove duplicated mobile API methods for notification preferences and keep one canonical pair.
- Extract action/permission orchestration from match detail screen into `useMatchDetailActions`.
- Split `match-query.service` with focused helper methods for response mapping and ranking enrichment.

Reasoning:
- Closes high-priority authorization gaps on match mutation endpoints.
- Improves safety by avoiding destructive delete in MVP.
- Keeps GET semantics read-only for reliability endpoints.
- Reduces maintenance risk in large hotspot files without changing product behavior.

## 2026-04-27: Elo rollback and reapply for corrected disputes (match-level MVP)

Decision:
- Extend `MatchResult` with correction metadata (`isCorrected`, corrected scores, correction user/time/reason).
- Extend `RatingHistory` with reversal/correction tracing fields (`isReverted`, `revertedAt`, `revertReason`, `correctionOfRatingHistoryId`).
- Add `metadata` JSON on `ModerationAction` for score-correction audit details.
- Implement `RatingCorrectionService` and call it from moderation dispute resolution when corrected scores are provided.
- Preserve history instead of overwriting:
  - mark original match history rows as reverted
  - append new corrected history rows

Reasoning:
- Moderators needed a safe way to fix Elo after validated score-entry mistakes.
- Immutable/auditable rating history is required for trust and debugging.
- A match-local rollback/reapply model is safer and simpler for MVP than global replay.

Follow-up:
- Add full chronological replay when users have later matches impacted by a corrected historical result.
- Add richer moderator controls and visibility around correction side effects.

## 2026-04-27: Admin/moderation workflow MVP with auditable reliability correction

Decision:
- Add user roles on `User`:
  - `USER` (default)
  - `MODERATOR`
  - `ADMIN`
- Protect moderation APIs with role guard (`JwtAuthGuard + RolesGuard`).
- Add moderation APIs for operator workflows:
  - reports queue + resolution
  - disputes queue + resolution
  - no-show review + reversal
- Add moderation review metadata on reports/disputes (`reviewedByUserId`, `reviewedAt`, `moderatorNote`).
- Add `ModerationAction` audit model for immutable operator action tracking.
- Allow moderation outcomes to correct previously applied reliability penalties:
  - dismissed report => decrement `reportCount` and recalc reliability
  - rejected dispute => decrement `disputedResults` and recalc reliability
  - reversed no-show => decrement `noShowCount` and recalc reliability
- Keep Elo untouched by moderation in MVP.

Reasoning:
- Trust/safety signals were already captured but lacked correction workflows.
- Role-gated moderation APIs provide controlled operator access without building a separate admin app yet.
- Audit trails are required for accountability and future compliance needs.
- Reliability correction improves fairness when reports/disputes/no-shows are overturned.

Follow-up:
- Add richer moderation dashboard (filters, search, evidence context, queue assignment).
- Add dispute score-correction workflow with Elo rollback/recalculation.
- Expand permission system to fine-grained scopes beyond three coarse roles.

## 2026-04-27: Notification controls MVP (per-match mute, quiet hours, chat unread)

Decision:
- Add `MatchNotificationPreference` (`userId+matchId` unique) to support per-match push mute controls.
- Extend `NotificationPreference` with quiet-hours fields:
  - `quietHoursEnabled`
  - `quietHoursStart` (`HH:mm`)
  - `quietHoursEnd` (`HH:mm`)
  - `timezone`
- Add `ChatReadState` (`userId+matchId` unique) for REST-based unread chat counts.
- Add APIs:
  - `GET/PATCH /matches/:id/notification-preference`
  - `GET /matches/:id/chat/unread-count`
  - `PATCH /matches/:id/chat/read`
- Keep `Notification` rows as source of truth while applying mute/quiet-hours at push delivery time only.

Reasoning:
- Users need granular notification control without losing durable in-app event history.
- Quiet hours and per-match mute reduce push fatigue but should not hide data from in-app timeline.
- Chat unread state can be solved with simple REST persistence for MVP without websocket infrastructure.

Follow-up:
- Add per-match in-app notification visibility filters (optional future enhancement).
- Add push receipts analytics + delivery diagnostics.
- Add websocket realtime unread state sync when realtime chat is introduced.

## 2026-04-27: PostGIS-based nearby match discovery

Decision:
- Move nearby filtering and distance calculation for `GET /matches` from app-layer Haversine to PostGIS SQL.
- Keep `Venue.latitude` and `Venue.longitude` in Prisma for compatibility with existing CRUD and mobile payloads.
- Add PostGIS migration to:
  - enable extension: `CREATE EXTENSION IF NOT EXISTS postgis`
  - create GIST expression index on venue coordinates
- Keep API contract unchanged (`latitude`, `longitude`, `radiusKm` query params and `distanceKm` in response).
- Keep a narrow Haversine fallback path only when PostGIS functions are unavailable in a given environment.

Reasoning:
- Geospatial filtering at the DB layer is more scalable than fetching candidates then filtering in application code.
- Expression index on geography point makes nearby lookup and distance calculations faster for map/list discovery.
- Preserving scalar lat/lng fields avoids Prisma portability issues with direct geography column modeling.

Follow-up:
- Validate query plans and index usage with `EXPLAIN ANALYZE` as dataset grows.
- Tune additional compound filters for high-volume sport/status/time windows.
- Remove fallback path once all environments are guaranteed PostGIS-enabled.

## 2026-04-26: Expo push notifications as delivery layer over notification records

Decision:
- Keep `Notification` rows as the primary source of truth.
- Add `PushDevice` model and JWT-protected push device management APIs.
- Add `NotificationPreference` model with backend-level category flags.
- Extend `NotificationsService` to trigger push delivery after notification creation.
- Keep push sending non-blocking: notification DB writes and business workflows must succeed even if push fails.

Reasoning:
- This keeps core product state deterministic and queryable from the database.
- Delivery channels (in-app list, Expo push now, websocket later) can reuse the same event creation path.
- Category preferences can be enforced server-side before sending push.

Follow-up:
- Mobile settings UI for notification preferences is now implemented (`/notification-settings` with save-based toggles).
- Add push ticket receipt handling and deeper delivery observability.
- Add finer-grained controls (per-match mute and quiet-hours preferences).
- Add websocket realtime notification delivery for active sessions.

## 2026-04-26: Database-backed in-app notifications MVP

Decision:
- Implement in-app notifications as a persisted backend domain (`Notification` table + `NotificationType` enum).
- Expose JWT-protected notification APIs:
  - `GET /notifications`
  - `GET /notifications/unread-count`
  - `PATCH /notifications/:id/read`
  - `PATCH /notifications/read-all`
- Generate notifications from service-layer events:
  - match join/leave
  - chat message
  - result submitted/verified
  - rating updated
  - dispute created
  - report submitted (reporter confirmation)
  - no-show marked
- Keep delivery model as REST in-app UX first (no Expo push, no websocket realtime yet).

Reasoning:
- A durable notification log creates a single event foundation for future delivery channels.
- Service-layer generation avoids controller bloat and keeps event logic near business rules.
- MVP can deliver value immediately via unread/read UX without infrastructure-heavy realtime systems.

Follow-up:
- Add Expo push delivery pipeline that reuses notification creation events.
- Add websocket realtime updates for active sessions.
- Add user notification preferences (mute types, quiet hours, delivery channels).

## 2026-04-26: Trust/safety reliability scoring and moderation-lite workflows

Decision:
- Add a separate reliability domain (`UserReliabilityStats`) instead of extending Elo.
- Track reliability events from MVP workflows:
  - no-show marking
  - match leave + late cancellation window (2 hours before start)
  - result disputes
  - user reports
  - completed matches on verified result
- Add lightweight trust/safety endpoints without building a full admin dashboard yet:
  - `GET /me/reliability`
  - `GET /users/:userId/reliability`
  - `POST /matches/:id/participants/:participantId/no-show`
  - `POST /matches/:id/results/:resultId/disputes`
  - `POST /reports/users`
- Update ranked discovery to include reliability:
  - distance 30%, rating fit 30%, reliability 20%, time 10%, slot availability 10%

Reasoning:
- Skill and trustworthiness represent different product signals and should be independently tunable.
- Reliability penalties provide immediate abuse/friction controls in MVP without blocking the core play/report/verify loop.
- Rule-based ranking remains transparent and debuggable while adding meaningful trust context.

Follow-up:
- Build moderator workflows for dispute/report resolution.
- Revisit dispute attribution (currently MVP-level simplification in ambiguous ownership cases).
- Tune penalty weights and thresholds using production behavior data.

## 2026-04-26: Mobile route groups, tabs, and shared UI primitives

Decision:
- Reorganize mobile routes into Expo Router groups: `app/(auth)` and `app/(tabs)`.
- Add authenticated bottom tabs for `discover`, `create-match`, `ratings`, and `profile`.
- Keep `match/[id]` outside tabs for detail drill-down flow.
- Introduce app-owned reusable UI primitives in `apps/mobile/src/components`:
  - layout/header primitives (`Screen`, `ScreenHeader`)
  - UI primitives (`AppButton`, `AppInput`, `AppCard`, `Badge`, `Chip`)
  - state components (`LoadingState`, `ErrorState`, `EmptyState`)
- Refactor discovery/create/auth screens to consume shared primitives.

Reasoning:
- Prior screen-level `StyleSheet` duplication was increasing maintenance cost and UI drift.
- Tabs provide a clearer authenticated app shell for demo flow and repeated tasks.
- App-owned primitives are enough for current MVP without introducing a heavy UI framework migration.

Follow-up:
- Continue refactoring remaining screens (`match/[id]`, `ratings`, `profile`) to maximize primitive reuse.
- Add iconography/toast and form/query libraries in later passes when scope permits.

## 2026-04-26: Rule-based ranked match discovery

Decision:
- Extend `GET /matches` with optional `ranked=true` personalized sorting.
- Keep ranking math in a dedicated `MatchRankingService`; controllers stay thin.
- Use weighted fit scoring: distance (35%), rating fit (35%), time (15%), slot availability (15%).
- Keep public discovery working without JWT by using neutral/default rating fallback.
- Return `fitScore` and `fitBreakdown` for ranked responses to aid debugging and UI rollout.

Reasoning:
- Improves discovery quality immediately without introducing AI matchmaking complexity.
- Keeps logic explicit, testable, and easy to tune.
- Maintains compatibility with existing non-ranked and nearby discovery behavior.

Follow-up:
- Add reliability and availability-window signals to ranking.
- Add learned recommendation signals after enough product data exists.
- Move geospatial filtering to PostGIS/indexed queries before large-scale rollout.

## 2026-04-26: Nearby match discovery via `GET /matches` query extension

Decision:
- Extend `GET /matches` with optional `latitude`, `longitude`, and `radiusKm` query params instead of introducing a new endpoint.
- Keep existing discovery behavior when location params are absent.
- Compute distance using a shared Haversine helper in application code.
- Return `distanceKm` on match responses only when nearby mode is used.
- Add Discover screen location flow with Expo Location and radius options (3/5/10/20 km).

Reasoning:
- Preserves the existing client contract and avoids endpoint split while MVP discovery remains simple.
- Venue coordinates already exist, so Haversine is enough for current scale.
- Service-layer filtering keeps controllers thin and prepares a clean migration path to database geospatial queries later.

Follow-up:
- Move nearby filtering/sorting to PostGIS + geospatial indexes.
- Add map-based UX once product scope expands beyond list-first MVP.

## 2026-04-25: Implement DB-backed MVP match flow

Decision:
- Keep the existing Prisma schema and add match discovery indexes.
- Add Prisma seed data for sports, venues, users, ratings, and demo matches.
- Keep match lifecycle rules in `MatchesService`.
- Keep Elo verification and rating persistence in `RatingsService`.
- Use `GET /matches` for filtered discovery instead of adding a separate discovery endpoint for now.

Reasoning:
- The existing schema already modeled the required entities.
- A single filtered match endpoint is enough for the MVP and avoids premature API split.
- Ratings logic must stay isolated so future Glicko-2 or TrueSkill work can replace the internals without rewriting controllers.

Follow-up:
- Add a real migration folder from the current Prisma schema.
- Add integration tests against a test database.
- Add auth/ownership checks before production use.

## 2026-04-25: Connect Expo MVP flow to backend APIs

Decision:
- Use a single seeded demo user ID in `apps/mobile/src/config/demoUser.ts` for the pre-auth MVP.
- Keep API URL configuration in `apps/mobile/src/config/api.ts`.
- Connect existing screens directly to backend APIs without adding Redux/Zustand.
- Keep result submission and verification on the match detail screen for the MVP.
- Add a temporary demo opponent helper for the pre-auth MVP.

Reasoning:
- The goal is to prove the complete match/rating loop before investing in app-wide auth or richer state management.
- A single demo user keeps temporary auth assumptions visible and easy to remove.
- Superseded by JWT auth: users should now login/register and join as themselves.

Follow-up:
- Superseded by JWT auth: normal mobile flow now uses real auth context.
- Improve result UX, permissions, and dispute handling.
- Add mobile component tests once the UI flow stabilizes.

## 2026-04-25: Stabilize MVP backend flow

Decision:
- Commit the first Prisma migration from the current schema as `20260425000100_init`.
- Add database-backed integration coverage for the create -> join -> submit -> verify -> rating history flow.
- Keep verified-result Elo updates inside `RatingsService`.
- Add class-validator DTOs for Elo preview and verify-result request body validation.

Reasoning:
- The schema already matched the MVP data model, so no extra schema churn was needed.
- Rating updates are domain logic, not HTTP logic, and should stay isolated for a future Glicko/TrueSkill upgrade.

Follow-up:
- Run the integration suite against a clean local PostgreSQL database once package manager tooling is available.
- Add auth/ownership checks before treating result verification as production-safe.

## 2026-04-25: Add JWT authentication and protected match writes

Decision:
- Add `passwordHash` to `User` and store bcrypt hashes only.
- Use JWT access tokens configured by `JWT_SECRET` and `JWT_EXPIRES_IN`.
- Protect match write endpoints with a JWT guard.
- Derive creator/participant/submitter/verifier identity from the token instead of request body IDs.
- Store mobile access tokens in Expo SecureStore.

Reasoning:
- The main security hole was client-controlled `userId` values on write endpoints.
- JWT keeps the MVP simple while enabling real authenticated match flows.

Follow-up:
- Add refresh tokens or session revocation before production.
- Add email verification, password reset, and stronger abuse controls.

## 2026-04-28: Rule-based personalization signals in ranking
- Decision: add explicit user preference models and a deterministic preferenceScore to ranked discovery.
- Reason: improve recommendation quality without introducing AI/black-box behavior.
- Outcome: ranking now combines distance, rating, reliability, preference, time, and slot signals with documented weights.
- Tradeoff: weekly availability matching is simple (dayOfWeek + HH:mm) and does not yet handle advanced timezone/calendar semantics.

