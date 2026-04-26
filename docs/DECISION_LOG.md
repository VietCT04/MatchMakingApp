# Decision Log

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
