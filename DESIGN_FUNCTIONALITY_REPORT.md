# Design and Functionality Report

## Scope
This report evaluates:
- design quality
- user-facing functionality
- architectural appropriateness
- logic correctness and avoidable complexity

Assessment method:
- reviewed architecture and continuity docs
- reviewed representative backend and mobile implementation files
- reviewed schema and DTO validation
- executed backend tests and workspace typecheck

## Executive Summary
The repository is well structured for an MVP-plus product and is mostly functional. The architecture is generally appropriate: mobile presentation is separated from API access, backend controllers are mostly thin, and business logic is grouped in domain services. Reliability/trust logic is separated from Elo skill logic, which is a strong design choice.

Current quality level:
- Design quality: Good
- Functional completeness: Good for current documented scope
- Logic reliability: Good, with specific high-priority risks
- Complexity control: Moderate risk of growth in a few hotspot files

Main conclusion:
- The codebase is usable and mostly coherent.
- It is not over-engineered overall.
- A few high-impact logic/design issues should be fixed soon, especially unguarded write endpoints in matches controller.

## Architecture Assessment

### What is working well
- Monorepo boundaries are clear:
  - `apps/mobile` for UI and navigation
  - `apps/api` for backend/domain logic
  - `packages/shared` for shared contracts
- Backend composition in `apps/api/src/app.module.ts` is modular and explicit.
- Match domain is decomposed in `apps/api/src/matches` into lifecycle/query/participation/result/dispute/ranking services instead of one large service.
- Reliability is intentionally separate from ratings:
  - reliability formula and counters in `apps/api/src/reliability/reliability.service.ts`
  - Elo logic in ratings service and helpers
- Global validation is enabled in `apps/api/src/main.ts` with whitelist, transform, and forbidNonWhitelisted.
- DTO rules exist for trust and safety input, including min reason length in:
  - `apps/api/src/reports/dto.create-user-report.ts`
  - `apps/api/src/matches/dto.create-dispute.ts`
- Mobile app uses route groups and an authenticated tab shell, which is appropriate for current UX.
- Mobile has an app-owned primitive system (`Screen`, `ScreenHeader`, `AppButton`, `AppInput`, `AppCard`, state components) that keeps UI consistent without heavy dependency complexity.

### Architecture pressure points
- `apps/api/src/matches/match-query.service.ts` is becoming a multi-responsibility hotspot:
  - query validation
  - base filtering
  - PostGIS SQL path
  - Haversine fallback
  - participant mapping
  - ranked scoring and fit breakdown
- `apps/mobile/src/lib/api.ts` is very large and acts as a single ever-growing API surface. This is manageable now, but starts to increase coupling.
- `apps/mobile/app/match/[id].tsx` is large and coordinates many concerns (actions, chat state, notification preferences, disputes, reports, no-show, UI feedback). Components are extracted, but orchestration complexity is still high.

Overall architecture verdict:
- Appropriate for current scope.
- Not unnecessarily complex in principle.
- Needs refactoring in hotspots to avoid near-term maintenance drag.

## Functionality Assessment

### Confirmed functional coverage
The implementation appears functionally aligned with documented flows:
- JWT auth and session restore in mobile auth context.
- Match discovery with ranked and nearby behaviors.
- Match participation (join/leave/no-show).
- Result submission and verification.
- Reliability and trust workflows (report/dispute/no-show).
- Notifications and chat workflows in mobile and backend.
- Moderation workflows with role protections and audit model.

### Logic verification evidence
Commands executed:
- `pnpm.cmd --filter @sports-matchmaking/api test`
- `pnpm.cmd typecheck`

Observed results:
- Backend tests: `22 passed`, `1 skipped`, `102 passed tests`, `6 skipped tests`
- Workspace typecheck: passed for shared/api/mobile

Interpretation:
- Core logic is generally working and regression-protected.
- The skipped suite means not all workflow logic is always exercised in default local runs.

## High-Priority Findings (Design and Logic)

1. Unguarded write endpoints in matches controller
- File: `apps/api/src/matches/matches.controller.ts`
- Issue:
  - `PATCH /matches/:id` and `DELETE /matches/:id` are not protected by `JwtAuthGuard`.
- Why this matters:
  - This is both a security and functional integrity risk. Any caller could update/delete matches.
- Recommendation:
  - Add guard and ownership/role checks immediately.
  - If these endpoints are not needed for public MVP, disable them entirely until proper authorization rules are implemented.

2. GET reliability endpoints mutate data via upsert
- Files:
  - `apps/api/src/reliability/reliability.controller.ts`
  - `apps/api/src/reliability/reliability.service.ts`
- Issue:
  - Read endpoints call `toSummaryByUserId`, which can create rows through `upsert`.
- Why this matters:
  - Side effects on GET can surprise operations and analytics.
- Recommendation:
  - Keep behavior if intentional, but document it as explicit design.
  - Otherwise split into read-only summary retrieval and explicit initialization path.

## Medium-Priority Findings

1. API client duplication increases maintenance cost
- File: `apps/mobile/src/lib/api.ts`
- Issue:
  - Duplicate notification preference methods:
    - `getMyNotificationPreferences` and `getNotificationPreferences`
    - `updateMyNotificationPreferences` and `updateNotificationPreferences`
- Why this matters:
  - Increases drift risk and unnecessary code surface.
- Recommendation:
  - Keep one canonical method pair and remove aliases.

2. Match query service has high responsibility density
- File: `apps/api/src/matches/match-query.service.ts`
- Issue:
  - A large method handles filtering, geospatial strategy, mapping, and ranking orchestration.
- Why this matters:
  - Harder to reason about behavior changes and test edge cases.
- Recommendation:
  - Split into collaborators:
    - filter/query builder
    - geospatial provider (PostGIS + fallback)
    - response mapper
    - ranking enricher

3. Match detail screen orchestrator is large
- File: `apps/mobile/app/match/[id].tsx`
- Issue:
  - One screen handles many asynchronous side effects and permission conditions.
- Why this matters:
  - Higher risk of UI state bugs and harder evolution.
- Recommendation:
  - Move action logic and derived permissions to a dedicated hook (for example `useMatchDetailActions`) while keeping current UI components.

## Low-Priority Findings

1. Encoding artifact in user-facing text
- File: `apps/mobile/app/match/[id].tsx`
- Issue:
  - Button label string includes `Open chat â€¢ ...`.
- Why this matters:
  - Minor UX polish issue and potential encoding handling inconsistency.
- Recommendation:
  - Replace with ASCII-safe separator (`-`) or ensure UTF-8 handling and use a proper bullet.

2. Test execution ergonomics in PowerShell
- Issue:
  - `pnpm` via `.ps1` is blocked by local execution policy.
- Recommendation:
  - Document `pnpm.cmd` usage on Windows PowerShell environments.

## Complexity and Appropriateness Review

Current complexity is mostly justified by feature scope:
- Notifications, chat, reliability, and moderation add unavoidable domain complexity.
- The project still avoids major unnecessary framework complexity on mobile.

Areas where complexity is approaching unnecessary levels:
- very large orchestration files (`match-query.service.ts`, `match/[id].tsx`, `src/lib/api.ts`)

Guidance:
- Keep current architecture.
- Reduce local complexity by extraction/refactoring, not by introducing new infrastructure.

## Overall Verdict

The repo is well-designed for a feature-rich MVP and is functional for users across core and trust/safety workflows. Architecture is appropriate and mostly disciplined.

Verification outcome:
- Design: solid with clear module boundaries
- Functionality: implemented and test-backed
- Logic: generally correct, but with notable authorization risk
- Complexity: acceptable overall, with targeted hotspots to simplify

Priority actions before further feature expansion:
1. Secure or disable unguarded `PATCH/DELETE /matches/:id` endpoints.
2. Refactor large hotspot files (`match-query.service.ts`, match detail screen orchestrator, mobile api client duplication).
3. Keep logic verification robust by maintaining integration coverage in environments where DB tests can run regularly.
