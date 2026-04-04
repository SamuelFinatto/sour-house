@AGENTS.md

# Sour House

Self-hosted Next.js application (Next.js 16, React 19, TypeScript).

## Stack

- **Runtime/Package manager:** Bun — use `bun` for all install, run, and script commands
- **Framework:** Next.js 16 (App Router) — self-hosted via `next start`
- **UI:** shadcn/ui components with Tailwind CSS v4
- **Data fetching:** SWR for client-side data fetching, React Suspense for loading states
- **Styling:** Tailwind CSS — all UI must be responsive (mobile-first)
- **Linting:** Biome — use `bun run lint` to check, `bun run lint:fix` to auto-fix
- **Testing:** Vitest — use `bun run test` to run, `bun run test:watch` for watch mode

## Conventions

- Use the App Router (`app/` directory) for all routes
- Use Server Components by default; add `"use client"` only when needed (interactivity, SWR, hooks)
- Wrap client data-fetching components in `<Suspense>` with appropriate fallbacks
- Use SWR for all client-side data fetching — no `useEffect` + `fetch` patterns
- All pages and components must be fully responsive across mobile, tablet, and desktop
- Use shadcn/ui components wherever possible instead of building custom UI
- Follow Tailwind CSS v4 conventions (no `tailwind.config.js` — use CSS-based config)
- **Prefer existing packages over custom implementations.** Before writing utility code, check if a well-maintained npm package already solves the problem. Install and use it instead of reimplementing.

## Schema Versioning & Migrations

The app version in `package.json` is used as the schema version for all persisted JSON files (project and floor files). The version is read from `lib/version.ts` which re-exports `package.json#version`.

### When to bump the version

- **Patch** (0.1.0 → 0.1.1): Bug fixes, no file format changes.
- **Minor** (0.1.0 → 0.2.0): New optional fields added to JSON files (backward compatible).
- **Major** (0.x.y → 1.0.0): Breaking changes to the JSON file format — fields renamed, removed, restructured, or semantics changed. **A migration script is required.**

### How migrations work

1. Migrations live in `lib/migrations/registry.ts` as an ordered array.
2. Each migration has a `from` and `to` version, plus optional `migrateProject` and `migrateFloor` transform functions.
3. On app startup (`instrumentation.ts`), `migrateAll()` runs automatically — it reads every project, checks its `schemaVersion`, and applies any pending migrations in order.
4. Migrations can also be triggered manually via `POST /api/migrate`.

### Adding a migration

When making a breaking change to the file format:

1. Bump the **major** version in `package.json`.
2. Add a new entry to `lib/migrations/registry.ts`:
   ```ts
   {
     from: "0.1.0",
     to: "1.0.0",
     migrateProject: (data) => ({ ...data, newField: "default" }),
     migrateFloor: (data) => ({ ...data, /* transform */ }),
   }
   ```
3. Add a test case in `lib/migrations/runner.test.ts` that verifies the migration transforms data correctly.
4. Run `bun run test` to confirm.
