# Decision Log

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
