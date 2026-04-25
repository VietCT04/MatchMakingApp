# Contributing

## Branch Naming
Use concise branch names with purpose prefix:
- `feat/<short-description>`
- `fix/<short-description>`
- `docs/<short-description>`
- `refactor/<short-description>`
- `test/<short-description>`

Examples:
- `feat/match-result-verification`
- `docs/api-contract-update`

## Commit Message Style
Prefer Conventional Commit style:
- `feat: add match result submission endpoint`
- `fix: handle null venue in match response`
- `docs: update continuity and roadmap`
- `test: add elo edge case coverage`

## Code Style
- Keep code explicit and readable.
- Prefer strict typing over `any`.
- Keep functions small and focused.
- Avoid unnecessary dependencies.

## TypeScript Rules
- Use strict TypeScript settings.
- Define DTO/interfaces clearly.
- Reuse enums and shared types from `packages/shared` where practical.
- Avoid implicit `any` and untyped payloads.

## Backend Rules
- Controllers handle HTTP only.
- Services contain business logic.
- Prisma access should stay in services/repositories (not controllers).
- Validate request DTOs.
- Throw explicit Nest exceptions for predictable errors.

## Mobile Rules
- Do not hardcode API URLs inside screens.
- Use API calls through `apps/mobile/src/lib/api.ts` (or evolved abstraction).
- Keep business logic outside presentational components.
- Keep screen code straightforward and maintainable.

## Testing Rules
- Add/maintain unit tests for business logic.
- Cover rating behavior changes with explicit tests.
- Add integration tests for API workflows as endpoints mature.
- Keep tests deterministic and isolated.

## Documentation Update Rules
- Update `README.md` for major workflow/setup changes.
- Update `CONTINUITY.md` after major architecture or feature work.
- Update `docs/API.md` whenever endpoint contracts change.
- Update ADRs when major architectural decisions are made.

## Pull Request Checklist
- [ ] Code compiles and typechecks.
- [ ] Tests added/updated for changed behavior.
- [ ] No secrets committed.
- [ ] Documentation updated (`README`, API docs, continuity as needed).
- [ ] Scope stays aligned with requested feature.
- [ ] Placeholder-only areas (auth/chat/payment) remain untouched unless explicitly requested.
