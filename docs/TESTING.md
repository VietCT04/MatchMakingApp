# Testing Strategy

## Unit Testing
- Primary current unit tests are in backend.
- Elo math tests exist in:
  - `apps/api/src/ratings/elo.spec.ts`
- Keep core business logic testable as pure functions where possible.

## Backend Service Tests
Current status:
- Basic service behavior is present but not fully covered.
- Add service-level tests for users/sports/matches/venues workflows as logic grows.

## Elo Rating Tests
Covered now:
- Expected score for equal ratings.
- Win/loss impact.
- Draw stability at equal ratings.
- Team average helper.

Recommended additions:
- Upset scenarios (low-rated player beats high-rated player).
- Edge score values and numeric stability.
- Doubles projection behavior with uneven team ratings.

## API Integration Tests
Current status: TODO

Plan:
- Add Nest integration tests for key endpoints.
- Include happy paths + validation failures + not found cases.
- Add DB-backed integration tests (transactional or test database).

## Mobile Component Tests
Current status: TODO

Plan:
- Add React Native Testing Library tests for key screens/components.
- Validate loading, success, fallback-to-mock, and error display paths.

## E2E Test Future Plan
- Add end-to-end flow tests after auth and result workflows are implemented.
- Candidate flows:
  - create match -> join match -> submit result -> verify result -> rating updates

## Commands to Run Tests
From repo root:

```bash
pnpm test
pnpm typecheck
```

Backend direct:

```bash
cd apps/api
pnpm test
pnpm test:watch
pnpm typecheck
```

Mobile typecheck:

```bash
cd apps/mobile
pnpm typecheck
```

## Current Coverage Status
- Automated tests currently focus on Elo helper logic only.
- API integration and mobile test suites are not yet implemented.
- Coverage should be considered minimal until additional tests are added.
