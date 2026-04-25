# Decision Log

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
- Use a single seeded demo user ID in `apps/mobile/src/config/demoUser.ts`.
- Keep API URL configuration in `apps/mobile/src/config/api.ts`.
- Connect existing screens directly to backend APIs without adding Redux/Zustand.
- Keep result submission and verification on the match detail screen for the MVP.
- Add a temporary demo opponent helper that selects a non-demo seeded user from `/users` instead of hardcoding another user ID.

Reasoning:
- The goal is to prove the complete match/rating loop before investing in app-wide auth or richer state management.
- A single demo user keeps temporary auth assumptions visible and easy to remove.
- The opponent helper lets the create -> join -> submit -> verify flow work before real auth and invitations exist.

Follow-up:
- Replace demo user config with real auth context.
- Improve result UX, permissions, and dispute handling.
- Add mobile component tests once the UI flow stabilizes.
