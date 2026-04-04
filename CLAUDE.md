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
