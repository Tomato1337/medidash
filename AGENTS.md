# AGENTS.md

## Project Overview

**Medidash** - Local-first AI-powered medical document management system.
Monorepo with a React 19 SPA frontend and 7 NestJS/Python microservices.

## Repository Structure

```
frontend/              React 19 + Vite + TanStack (Router, Query) + shadcn/ui + Bun
services/
  api-gateway/         NestJS + Fastify (port 3000) - auth, routing, SSE
  document-service/    NestJS + Fastify (port 3001) - CRUD, MinIO storage
  processing-service/  NestJS + Fastify (port 3002) - BullMQ queues
  ai-service/          NestJS + Fastify (port 3003) - Gemini API
  anonymizer-service/  Python FastAPI (port 8000) - spaCy NER, OCR
  search-service/      NestJS (port 3004) - pgvector semantic search (WIP)
  shared-types/        Shared TypeScript types across services
prisma/                Schema, migrations, seed (shared by all TS services)
nginx/                 MinIO presigned URL proxy
docker-compose.yml     Full infrastructure (Postgres+pgvector, Redis, MinIO)
```

## Build & Run Commands

### Infrastructure
```bash
docker compose up -d                 # Start all services
docker compose up -d postgres redis minio  # Start deps only
```

### Frontend (`frontend/`)
```bash
bun install                          # Install deps (uses Bun)
bunx --bun vite                      # Dev server
bunx --bun vite build                # Production build
bun run lint                         # ESLint
npx prettier --check "src/**/*.{ts,tsx}"  # Check formatting
```

### Backend Services (`services/<service>/`)
Each NestJS service uses the same script pattern:
```bash
npm install                          # Install deps
npm run build                        # nest build && tsc-alias
npm run start:dev                    # Dev with --watch
npm run lint                         # ESLint with --fix
npm run format                       # Prettier write
```

### Prisma (`prisma/`)
```bash
npx prisma generate                  # Generate client
npx prisma migrate dev               # Create/apply migration
npx prisma migrate deploy            # Apply in production
npx prisma studio                    # Database GUI
```

### Testing (api-gateway only has test config)
```bash
# From services/api-gateway/
npm test                             # Run all tests (Jest)
npx jest --testPathPattern="auth"    # Run single test file by pattern
npx jest src/auth/auth.service.spec.ts  # Run specific test file
npm run test:watch                   # Watch mode
npm run test:cov                     # Coverage
npm run test:e2e                     # E2E tests (jest-e2e.json config)
```
Test files: `*.spec.ts` colocated next to source files.

### Shared Types (`services/shared-types/`)
```bash
npm run build                        # tsc --build
npm run type-check                   # tsc --noEmit
```

## Code Style & Formatting

### Prettier (all TypeScript code)
- **Tabs** for indentation (`useTabs: true`, `tabWidth: 4`)
- **No semicolons** (`semi: false`)
- **Double quotes** (`singleQuote: false`)
- **Trailing commas** everywhere (`trailingComma: "all"`)
- **Always parentheses** on arrow functions (`arrowParens: "always"`)
- Frontend additionally uses `prettier-plugin-tailwindcss`

### TypeScript
- **Frontend**: `strict: true`, `noUnusedLocals`, `noUnusedParameters`, `noUncheckedIndexedAccess`, `verbatimModuleSyntax`
- **Backend**: `strictNullChecks: true`, `noImplicitAny: false`, `experimentalDecorators`, `emitDecoratorMetadata`
- **Target**: Frontend ES2022, Backend ES2023

### ESLint
- Frontend: `eslint/js` recommended + `typescript-eslint` + `react-hooks` + `react-refresh` + `tailwindcss`
- Backend: `typescript-eslint` recommendedTypeChecked, `@typescript-eslint/no-explicit-any: off`, `no-floating-promises: warn`

## Naming Conventions

### Frontend
- **Files**: camelCase for modules (`useRecords.ts`, `recordsApi.ts`), PascalCase for components (`RecordCard.tsx`)
- **Types/Interfaces**: PascalCase (`DisplayRecord`, `CreateRecordInput`)
- **Functions/Hooks**: camelCase, hooks prefixed `use` (`useRecords`, `toDisplayRecord`)
- **Query keys**: centralized in `shared/api/queries.ts` via `queryKeys` object
- **Path alias**: `@/*` maps to `src/*`, `@shared-types` maps to shared types package

### Backend (NestJS)
- **Files**: kebab-case with suffix (`auth.service.ts`, `auth.controller.ts`, `auth.module.ts`, `jwt.strategy.ts`)
- **Classes**: PascalCase with suffix (`AuthService`, `AuthController`, `AuthModule`, `JwtStrategy`)
- **Decorators**: NestJS standard (`@Module`, `@Controller`, `@Injectable`, `@Get`, `@Post`)
- **DTOs**: PascalCase with Dto suffix, validated with `class-validator` decorators
- **Path alias**: `@shared-types` maps to shared types

### Python (anonymizer-service)
- **snake_case** for functions, variables, files
- **PascalCase** for classes and Pydantic models
- **UPPER_SNAKE_CASE** for constants

## Architecture Patterns

### Frontend - FEOD (Feature-Enhanced Organizational Design)
#### more info in [frontend-feod-architecture](.agents/skills/frontend-feod-architecture/)
```
src/
  app/        Global providers, routing setup
  pages/      Route-level UI compositions (NO business logic)
  modules/    Domain-driven feature modules:
    {feature}/
      domain/         Types, schemas (Zod), guards, mappers
      application/    Hooks, queries (TanStack Query), mutations
      infrastructure/ API clients, SSE, sync logic
      ui/             Feature-specific components (optional)
      index.ts        Public API barrel export
  shared/     Reusable utilities:
    api/      OpenAPI client, query keys, schema types
    hooks/    Shared custom hooks
    lib/      Utilities (IndexedDB, etc.)
    ui/       shadcn/ui components
    config/   App configuration
    router/   Route definitions
```

**Key rules**:
- Pages import from modules via barrel exports (`index.ts`), never reach into internals
- Modules must not import from other modules directly (use shared layer)
- Domain layer has zero external dependencies (pure types/logic)
- Zod schemas in `domain/schemas.ts`, inferred types in `domain/types.ts`

### Backend - NestJS Microservices
- Each service is a standalone NestJS app with Fastify adapter
- Inter-service communication via HTTP (axios)
- Shared Prisma schema in `prisma/` directory
- BullMQ for async processing queues (parsing + AI processing)
- JWT auth validated at API Gateway, forwarded via headers

## Key Technical Details

- **State**: TanStack Query for server state, Zustand for client state
- **Offline**: IndexedDB (Dexie) + Service Worker for offline-first
- **Validation**: Zod on frontend, class-validator on backend
- **API types**: Generated from OpenAPI spec (`npm run generate-schema` in frontend)
- **Database**: PostgreSQL 16 + pgvector extension
- **Storage**: MinIO (S3-compatible) for document files
- **Queue**: BullMQ with Redis for document processing pipeline
- **AI**: Google Gemini API (text-embedding-004, gemini-2.0-flash)
- **Comments**: Code comments are in Russian; keep this convention

## Error Handling

- Frontend: Global error handlers in TanStack Query's `QueryCache`/`MutationCache`
- Frontend: Per-document error tracking with failed phase info
- Frontend: 401 triggers automatic token refresh with request queue
- Backend: NestJS exception filters, HTTP exceptions with proper status codes
- Backend: Processing failures tracked in `ProcessingLog` table with audit trail

## Common Pitfalls

1. **Always run `prisma generate`** after schema changes before building services
2. **Shared types** are symlinked/copied into each service - rebuild after changes
3. **Frontend uses Bun** as package manager, backend services use npm
4. **No semicolons** - the entire codebase omits them (Prettier enforced)
5. **Tabs not spaces** - use tabs for indentation everywhere
6. **Docker required** for full stack - Postgres, Redis, MinIO must be running
