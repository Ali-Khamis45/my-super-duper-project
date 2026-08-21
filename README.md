# Coffeshop

[![CI](https://github.com/Ali-Khamis45/my-super-duper-project/actions/workflows/ci.yml/badge.svg)](https://github.com/Ali-Khamis45/my-super-duper-project/actions/workflows/ci.yml)

An interactive, premium coffee-shop experience — built iteratively, milestone by milestone, against the full roadmap in [docs/08_MILESTONES.md](docs/08_MILESTONES.md). Since Milestone 5, a real commerce backend (accounts, catalog, ordering, inventory, payments) lives in [`backend/`](backend/README.md) behind it — this is a full-stack app, not a frontend-only demo.

**Start here:** [docs/00_SYSTEM_PROMPT.md](docs/00_SYSTEM_PROMPT.md) — the operating philosophy every contributor (human or agent) works to, and the index into the rest of the `docs/` set (architecture, design system, 3D engine, motion engine, coding standards, milestones, and the Creative Director Review process). For a full project status report — what's shipped, what's known-open, what's next — see [explain.md](explain.md).

## Getting started

The 3D/UI layer (this folder) runs standalone with mocked/static data for most routes. For the full commerce experience (accounts, cart checkout, orders, payments), the [backend](backend/README.md) needs to be running too.

```bash
npm install
npm run dev
```

Then visit:

- `/` — the hero experience
- `/design-system` — the live design-token/component reference
- `/menu`, `/customize`, `/concierge`, `/story` — work without the backend running
- `/login`, `/cart`, `/checkout`, `/orders`, `/payments`, `/admin/*` — need the backend running, see [backend/README.md](backend/README.md)

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server (Turbopack) |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run format` | Prettier, write mode |

## Stack

Next.js 16 (App Router, RSC) · React 19 · TypeScript (strict) · Tailwind CSS v4 · shadcn/ui (Base UI) · Zustand · TanStack Query · Framer Motion · GSAP · Lenis · Three.js · React Three Fiber · drei · postprocessing.

Backend: ASP.NET Core 10, Clean Architecture + CQRS, PostgreSQL, Redis, real e2e coverage via Playwright against the live stack — see [backend/README.md](backend/README.md).

See [docs/01_ARCHITECTURE.md](docs/01_ARCHITECTURE.md) for the full rationale and folder-by-folder breakdown.
