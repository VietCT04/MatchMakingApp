# Testing Strategy

## Current Automated Coverage
- Backend unit/service/controller coverage is active and passing.
- Core covered areas include:
  - Geo helper math (`haversine`)
  - Elo/rating utilities and rating service
  - Match query DTO validation
  - Match query/ranking behavior
  - Reliability service scoring and penalty updates
  - Report/dispute validation and authorization behavior
  - Result verification completed-match reliability increments
  - Match service behavior
  - Auth service and JWT guard behavior
  - Auth identity handling in match controller
- One backend integration suite is intentionally skipped when `DATABASE_URL` is not set:
  - `apps/api/src/matches/match-flow.integration.spec.ts`

## Unit Testing
- Keep business logic testable as pure functions where possible (for example Elo/ranking math).
- Keep controller tests focused on auth/identity and request wiring.
- Keep service tests focused on behavior and rules.

## API Integration Tests
Current status:
- Database-backed integration flow test exists (`match-flow.integration.spec.ts`).
- It is environment-gated and runs only when test DB connection is available.

Plan:
- Add more endpoint-level integration cases (validation failures, authorization failures, not-found paths).
- Add CI strategy for isolated test database execution.
- Add integration coverage for no-show/report/dispute endpoints against a DB-backed test env.

## Mobile Component Tests
Current status:
- Not implemented yet.

Plan:
- Add React Native Testing Library tests for key screens/components.
- Prioritize state rendering tests for loading/error/empty and critical actions.

## E2E Test Future Plan
- Add end-to-end flow tests for:
  - register/login
  - discover ranked matches
  - create match
  - join/leave
  - submit/verify result
  - rating update visibility

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

## Notes
- `ts-jest` TS151002 warning is resolved through Jest transform config (`isolatedModules`).
- Test coverage is materially improved versus initial MVP scaffold, but mobile component/E2E suites and moderation resolution-path integration tests are still pending.
