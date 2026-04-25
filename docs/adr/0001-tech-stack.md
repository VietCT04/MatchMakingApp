# ADR 0001: Use Expo React Native, NestJS, Prisma, and PostgreSQL

## Status
Accepted

## Context
The project needs a practical MVP architecture that is:
- Fast to scaffold and iterate.
- Strongly typed end-to-end.
- Flexible enough to support future features (auth, chat, notifications, payments, advanced ratings).
- Easy for future developers and AI coding agents to navigate.

## Decision
Use:
- Expo React Native + TypeScript for mobile app development.
- NestJS + TypeScript for backend REST API.
- Prisma as ORM.
- PostgreSQL as primary relational database.
- pnpm monorepo with `packages/shared` for shared enums/DTO interfaces.

## Consequences
Positive:
- Shared TypeScript model across backend/mobile.
- Good developer experience for API and schema evolution.
- Clear separation of concerns with modular NestJS architecture.
- PostgreSQL gives strong relational guarantees for matchmaking entities.

Tradeoffs:
- Two runtime stacks (mobile + backend) increase setup complexity.
- Expo constraints for deeply native features may require future native modules.
- Prisma migrations and relational modeling require disciplined schema management.

## Alternatives Considered
### Swift Native iOS
- Pros: best native iOS control/performance.
- Cons: slower cross-platform path and less shared code with backend contracts.

### Flutter
- Pros: strong cross-platform UI and performance.
- Cons: separate language/tooling from backend TypeScript ecosystem.

### Firebase Only
- Pros: quick auth/realtime bootstrap.
- Cons: weaker fit for relational domain complexity and advanced SQL querying needs.

### Rails Backend
- Pros: productive full-stack conventions.
- Cons: language split with TypeScript mobile; less direct type sharing.

### Supabase Only
- Pros: rapid backend setup.
- Cons: may be too restrictive for custom domain logic evolution and internal service layering as product grows.
