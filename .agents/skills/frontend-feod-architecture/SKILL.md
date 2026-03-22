---
name: frontend-feod-architecture
description: Detailed guidelines and rules for the FEOD (Feature-Sliced Design + Domain-Driven Design Option B) frontend architecture used in this project. Use this skill when creating, modifying, or reviewing frontend code to ensure architectural compliance.
---

# FEOD Frontend Architecture Guidelines

This project uses a custom architecture called **FEOD** (Feature-Sliced Option B + Domain-Driven Design). It combines the macro-structure of Feature-Sliced Design (FSD) with the micro-structure of Domain-Driven Design (DDD) inside modules.

When working on the frontend (`/frontend/src`), you MUST adhere to these architectural rules strictly.

## 1. Macro-Architecture (FSD Layers)

The `/frontend/src` directory is divided into 4 main FSD layers (ordered by dependency flow from highest to lowest):

1. **`app`**: Global application initialization, root providers, global routing configurations (`routes` directory), and global styles (`global.css`, `fonts.css`).
2. **`pages`**: Route-level components mapping directly to application screens (e.g., `dashboard`, `auth`, `record`). Pages compose modules and shared UI components but contain minimal business logic.
3. **`modules`**: Domain-specific bounded contexts (e.g., `auth`, `records`, `documents`). Note: In FEOD, standard FSD `features` and `entities` are combined into `modules`.
4. **`shared`**: Highly reusable, cross-domain code. Contains generic UI components (`shared/ui`), fundamental API configurations (`shared/api`), generic hooks (`shared/hooks`), and global types/libs. `shared` code cannot import from `modules`, `pages`, or `app`.

**Cross-Layer Dependency Rule**:
- A layer can only import from layers BELOW it.
- `app` -> imports `pages`, `modules`, `shared`
- `pages` -> imports `modules`, `shared`
- `modules` -> imports `shared` and OTHER `modules` (via Public API only)
- `shared` -> cannot import from any higher layer.

## 2. Micro-Architecture (DDD inside `modules`)

Each module in `/frontend/src/modules/` represents a specific business domain and is internally structured using DDD layers:

1. **`domain`**: The core of the module.
   - Contains: Types, Zod schemas, Mappers (e.g., DTO to internal model), and Type Guards.
   - Rules: Pure TypeScript. NO UI (React), NO API calls, NO dependencies on other layers inside the module.
2. **`infrastructure`**: Data layer.
   - Contains: API requests (e.g., `recordsApi.ts`), SSE bindings, IndexedDB/LocalStorage logic.
   - Rules: Depends heavily on `domain` for types/schemas. NO UI code.
3. **`application`**: Application logic layer.
   - Contains: React Query hooks (`useQuery`, `useMutation`), state management, and use-case orchestrations.
   - Rules: Acts as the glue between `infrastructure` and `ui`. Depends on `domain` and `infrastructure`.
4. **`ui`**: Presentation layer.
   - Contains: React components specific to this module (e.g., `RecordCard`, `DocumentList`).
   - Rules: Depends on `application` for data fetching/mutations and `domain` for prop types. Does not make direct API calls (must use `application` hooks).

### 3. Strict Module Boundaries (Public API)

Every module MUST have a single entry point: `index.ts` at the root of the module (e.g., `/frontend/src/modules/records/index.ts`).

- **Public API Pattern**: Other modules and pages MUST ONLY import from a module's `index.ts` file.
- **Deep Imports Forbidden**: E.g., importing `modules/records/ui/RecordCard.tsx` from `pages/dashboard` is STRICTLY FORBIDDEN. You must export `RecordCard` from `modules/records/index.ts` and import it from there.

**Example `index.ts` structure:**
```typescript
// Domain Layer
export type { LocalRecord, ServerRecord } from "./domain/types";
export { localRecordSchema } from "./domain/schemas";
export { normalizeRecord } from "./domain/guards";

// Application Layer
export { useRecords, useCreateRecord } from "./application/useRecords";

// Infrastructure Layer
export { getRecord } from "./infrastructure/recordsApi";

// UI Layer
export { RecordCard } from "./ui/RecordCard";
```

## 4. Development Workflow & Best Practices

1. **Adding a New Component**:
   - If it is highly generic (e.g., Button, Modal), add it to `shared/ui`.
   - If it belongs to a specific domain (e.g., "AssignDoctorModal"), add it to the relevant module's `ui` directory and export it via the module's `index.ts`.
2. **Adding API Endpoints**:
   - Write the fetch logic in `modules/[name]/infrastructure/`.
   - Write the React Query hooks (useCases) in `modules/[name]/application/`.
   - Export the query hooks (and types) in the module's `index.ts`.
3. **Zod Validation**:
   - Keep schemas in `modules/[name]/domain/schemas.ts`. Use them in both `infrastructure` (for API response validation) and `ui` (for forms).
4. **Linter Adherence**:
   - FEOD relies on `steiger` to enforce architectural boundaries cross-layers. Ensure no circular dependencies are introduced between modules.
