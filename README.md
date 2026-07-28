# Coffeshop

An interactive, premium coffee-shop experience — built iteratively, milestone by milestone, against the full roadmap in [docs/08_MILESTONES.md](docs/08_MILESTONES.md).

**Start here:** [docs/00_SYSTEM_PROMPT.md](docs/00_SYSTEM_PROMPT.md) — the operating philosophy every contributor (human or agent) works to, and the index into the rest of the `docs/` set (architecture, design system, 3D engine, motion engine, coding standards, milestones, and the Creative Director Review process).

## Getting started

```bash
npm install
npm run dev
```

Then visit:

- `/` — the hero experience
- `/design-system` — the live design-token/component reference

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

See [docs/01_ARCHITECTURE.md](docs/01_ARCHITECTURE.md) for the full rationale and folder-by-folder breakdown.
