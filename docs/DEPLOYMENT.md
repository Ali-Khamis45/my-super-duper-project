# Deployment Guide

The simplest real path to a live, clickable demo: **frontend on Vercel, API + PostgreSQL + Redis on Railway, Stripe in test mode.** Everything in this doc that doesn't need an external account has already been done — Dockerfile, env var wiring, a seed command, health checks. What's left needs real account access; see [What's needed from you](#whats-needed-from-you) at the bottom.

## Why Railway for the backend

Three real candidates, weighed on what this specific stack needs — a containerized .NET API plus managed Postgres plus managed Redis, all talking to each other with minimal config:

- **Railway** — one dashboard project holds the API service (built from `backend/Dockerfile`, which already exists and is verified working — see below) plus Postgres and Redis as first-class managed add-ons in the same project, wired together via Railway's own reference variables (`${{Postgres.DATABASE_URL}}` etc.) instead of hand-copying connection strings between dashboards. Generous free/hobby tier is enough for a demo's real traffic. **Picked.**
- **Fly.io** — excellent for this exact shape too, but its Postgres/Redis are separate "apps" you provision and wire yourself via `fly.toml`/secrets, and its own CLI (`flyctl`) needs an interactive `fly auth login` — meaningfully more manual setup for the same result.
- **Render** — a Blueprint (`render.yaml`) can describe the same three services declaratively, which is appealing, but its free-tier web services spin down on idle and cold-start slowly (10-60s) — a bad first impression for a demo link someone clicks cold.

## Why Vercel for the frontend

Next.js's own platform — zero-config detection of the App Router, RSC, and route handlers this project already uses, a generous free tier, and it's simply where this framework is built to run. No real alternative was seriously in the running for a Next.js frontend.

## What's already done

- **`backend/Dockerfile`** — multi-stage build (SDK image restores/publishes, slim ASP.NET runtime image serves), runs as the non-root `app` user, exposes `8080`, has a container `HEALTHCHECK` against `/health/live`. **Built and run locally against the real dev Postgres to verify it actually works** — not just that it compiles: `docker build`, then `docker run` with `ASPNETCORE_ENVIRONMENT=Production`, confirmed `/health/live` and `/health/ready` both return `200 Healthy` and `/api/v1/menu` returns real catalog data.
- **`backend/.dockerignore`** — keeps `bin/`/`obj/`/tests out of the build context.
- **Health checks** — already existed before this pass: `/health/live` (liveness — process is up, no dependency calls, the right probe for a container/platform healthcheck) and `/health/ready` (readiness — real Postgres connectivity check, the right probe for a load balancer).
- **`dotnet Coffeshop.Api.dll --seed`** — a new, explicit, opt-in command (added this pass, in `Program.cs`) that runs migrations and the existing seeders (`IdentitySeeder`/`CatalogSeeder`/`InventorySeeder` — real menu items, ingredients, roles/permissions, starter inventory) once, then exits without starting the API. Deliberately not automatic on every boot outside `Development` (that stays exactly as strict as it already was — a real deployment should never silently mutate its own database on every restart) — this is a one-time deploy step you run yourself, safe to run more than once since every seeder already checks for existing rows first (verified, not assumed — see each seeder's own `AnyAsync` guard).
- **Frontend API base URL is already env-driven** — `NEXT_PUBLIC_API_BASE_URL` (read in `lib/auth-client.ts`/`lib/api-errors.ts`, defaulting to `http://localhost:5000`) is exactly what Vercel's own environment variable settings should override with the deployed Railway API URL. No frontend code change needed for this at all.
- **CORS is already env-driven** — `Cors__FrontendOrigin` (see `backend/README.md`) needs to point at the real Vercel URL once deployed.

## Environment variables reference

### Backend (Railway service variables)

| Variable | Value | Notes |
|---|---|---|
| `ASPNETCORE_ENVIRONMENT` | `Production` | |
| `ASPNETCORE_URLS` | `http://+:8080` | matches the Dockerfile's `EXPOSE 8080` |
| `ConnectionStrings__Postgres` | Railway's own Postgres reference variable | e.g. `${{Postgres.DATABASE_URL}}` reshaped to this app's Npgsql-style connection string, or the individual `PGHOST`/`PGPORT`/etc. reference vars composed the same way `appsettings.Development.json` does locally |
| `Jwt__SigningKey` | a real, random, kept-secret value | **needs to be generated fresh for production** — never reuse the CI-only disposable key from `.github/workflows/ci.yml`'s `CI_JWT_SIGNING_KEY` secret, that one is intentionally throwaway |
| `Jwt__Issuer` | `coffeshop-api` | matches the committed default, no need to override unless you want a different value |
| `Jwt__Audience` | `coffeshop-frontend` | same |
| `Auth__FrontendBaseUrl` | the real Vercel URL | used to build links in verification/reset emails |
| `Cors__FrontendOrigin` | the real Vercel URL | |
| `Payments__Provider` | `Stripe` | switches off the default `Fake` gateway |
| `Payments__StripeSecretKey` | your Stripe **test-mode** secret key (`sk_test_...`) | |
| `Payments__StripePublishableKey` | your Stripe **test-mode** publishable key (`pk_test_...`) | only needed if/when a client-side Stripe Elements flow is added; not required for the current server-driven checkout |
| `Payments__StripeWebhookSecret` | the signing secret from the Stripe webhook you register (see below) | |
| `Smtp__Host` / `Smtp__Port` | a real transactional email provider (or leave Mailhog-shaped and accept that verification emails won't actually send) | see [Known limitation](#known-limitations-of-the-demo) below |

### Frontend (Vercel project environment variables)

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | the real Railway API URL, e.g. `https://coffeshop-api.up.railway.app` |

## Setup steps

1. **Railway**: new project → add a Postgres service, add a Redis service → add a third service pointing at this repo's `backend/` directory with `Dockerfile` as the build source → set the backend env vars above (reference Railway's own Postgres/Redis connection variables rather than copying literal values, so a future credential rotation doesn't need a manual re-copy).
2. Run the one-time seed: Railway's own "Run a command" / one-off job feature, `dotnet Coffeshop.Api.dll --seed` (or `docker run` the same image locally against Railway's public Postgres connection string, whichever Railway's current UI makes easier).
3. **Stripe**: create a Stripe account if you don't have one (test mode requires no billing info at all) → copy the test-mode publishable/secret keys from the dashboard → set them as Railway env vars above → register a webhook endpoint pointing at `https://<your-railway-url>/api/v1/payments/webhook`, copy its signing secret into `Payments__StripeWebhookSecret`.
4. **Vercel**: import this repo, framework preset auto-detects Next.js, set `NEXT_PUBLIC_API_BASE_URL` to the Railway URL from step 1, deploy.
5. Go back to Railway and set `Cors__FrontendOrigin`/`Auth__FrontendBaseUrl` to the real Vercel URL from step 4 (there's an unavoidable chicken-and-egg order here — Vercel needs the API URL first, CORS needs the frontend URL second).

## Verifying it

Once both are live:

1. Load the Vercel URL — hero cup renders, `Log in`/`Menu`/`Customize` all work.
2. `/customize` — drag the cup, change color/size, add it to cart.
3. Guest checkout at `/checkout` — name + email, no signup required, `Place Order`.
4. `/checkout/payment` should real-charge through Stripe test mode. Use Stripe's own published test card: **`4242 4242 4242 4242`, any future expiry, any 3-digit CVC, any ZIP.** A declined-card test also exists if you want to see that path: `4000 0000 0000 0002`.
5. Land on `/checkout/confirmation` — "Payment confirmed," a real order number.
6. `GET https://<railway-url>/health/ready` returns `200 Healthy`.

## Known limitations of the demo

- **Transactional email won't actually send** unless `Smtp__*` points at a real provider (Postgres/SendGrid/Mailgun/etc. — Mailhog is dev-only, it has no public internet presence to point Railway at). Registration/verification/password-reset flows will still *work* mechanically (the token is created and stored), but the email carrying the link won't arrive anywhere real without this. Guest checkout is unaffected — it needs no account.
- **The AI Barista (`/customize`'s chat) depends on a local Ollama instance** (`docs/34_PAYMENTS_NOTIFICATIONS_SEARCH.md`/Sprint 3.9's own scope) — nothing in this deployment plan stands up a hosted LLM. This one feature won't work on the live demo unless a hosted Ollama-compatible endpoint is also configured; everything else (3D customizer, menu, cart, checkout, orders, admin) works fully.
- **A cold Railway/Vercel free-tier instance may have a slower first request** than the numbers this project's own reviews report for the local dev machine — expected, not a regression.

## What's needed from you

Everything above that doesn't require an account is done. These specifically need something only you can provide:

1. **A Railway account** (and its project/API token, if you want me to script anything further via `railway` CLI rather than the dashboard).
2. **A Vercel account** (same — a project/token for CLI-driven deploys, or you can just click-import the GitHub repo yourself in their dashboard, which needs nothing from me).
3. **A Stripe account** — test mode needs no billing info, but the account itself, and its test-mode API keys, only you can create.
4. **A real, secret `Jwt__SigningKey` for production** — I can generate the random value itself (the same way the CI-only one was generated), but it needs to be stored in Railway's own secret store, which needs your account access.
5. **(Optional) A custom domain / DNS** if `*.vercel.app`/`*.up.railway.app` isn't the final desired URL.
6. **(Optional) A transactional email provider** (SendGrid/Mailgun/etc.) if you want registration/verification emails to actually deliver on the live demo, not just guest checkout.

Once you have accounts for 1-3, tell me and I'll walk through the exact dashboard steps with you, or script what each platform's CLI supports.
