# Coffeshop backend

The real commerce backend behind the frontend at the repo root — accounts, catalog, ordering, inventory, and payments. ASP.NET Core 10, Clean Architecture (`Domain` → `Application` → `Infrastructure`/`Persistence` → `Api`), CQRS via MediatR, EF Core against PostgreSQL. Built sprint by sprint (5.1 Authentication → 5.2 Product → 5.3 Ordering → 5.4 Inventory → 5.5 Payments) — see [../docs/39_COMMERCE_IMPLEMENTATION_READINESS.md](../docs/39_COMMERCE_IMPLEMENTATION_READINESS.md) and `docs/reviews/sprint-5.*.md` for what shipped in each.

## Architecture

```
backend/
├── src/
│   ├── Coffeshop.Domain/           entities, value objects, domain events, invariants — one
│   │                                  subfolder per bounded context (Catalog/Identity/Inventory/
│   │                                  Ordering/Payments), zero dependencies on anything below
│   ├── Coffeshop.Application/      CQRS commands/queries, MediatR pipeline behaviors
│   │                                  (Logging → Validation → UnitOfWork), DTOs — same
│   │                                  bounded-context subfolders as Domain
│   ├── Coffeshop.Identity/         ASP.NET Identity integration, JWT issuance
│   ├── Coffeshop.Infrastructure/   gateways (payments), email, DI wiring, options
│   ├── Coffeshop.Persistence/      EF Core DbContext, migrations, repositories — same
│   │                                  bounded-context subfolders again
│   └── Coffeshop.Api/              minimal-API endpoints, error handling, rate limiting
├── tests/
│   ├── Coffeshop.Domain.Tests/         pure unit tests, no I/O
│   ├── Coffeshop.Application.Tests/    handler tests, gateways/repos mocked (NSubstitute)
│   └── Coffeshop.IntegrationTests/     real HTTP + real Testcontainers Postgres, no mocks
└── docker-compose.yml               the local dev stack — see below
```

## Running it locally

1. Start the dev stack (Postgres, Redis, Mailhog, Seq):

   ```bash
   docker compose up -d
   ```

2. Apply migrations and run the API:

   ```bash
   dotnet run --project src/Coffeshop.Api --urls http://localhost:5000
   ```

   Migrations apply automatically on startup in Development. The frontend expects CORS from `http://localhost:3000` by default (`appsettings.json`'s `Cors:FrontendOrigin` — override via the `Cors__FrontendOrigin` environment variable if running the frontend on a different port).

3. Run the frontend (from the repo root, in a separate terminal): `npm run dev`.

**Local stack ports** (see `docker-compose.yml` for the reasoning behind the non-default ones):

| Service | Port | Notes |
|---|---|---|
| API | `5000` | not containerized — run directly via `dotnet run` |
| PostgreSQL | `5540` | remapped off 5432 to avoid colliding with a system-wide Postgres install |
| Redis | `6380` | remapped off 6379 for the same reason |
| Mailhog SMTP | `1029` | remapped off 1025 — see the compose file's own comment for the real, investigated root cause |
| Mailhog Web UI | `8026` | view sent dev emails at `http://localhost:8026` |
| Seq (structured logs) | `5342` | `http://localhost:5342` |

## Testing

```bash
dotnet build
dotnet test
```

`Coffeshop.IntegrationTests` spins up a real PostgreSQL container per run via Testcontainers — no external services or manual setup needed beyond Docker being available. As of Sprint 5.5's close-out: 306 tests (176 Domain + 85 Application + 45 Integration), all passing.

## Migrations

```bash
dotnet ef migrations add <Name> --project src/Coffeshop.Persistence --startup-project src/Coffeshop.Api
dotnet ef database update --project src/Coffeshop.Persistence --startup-project src/Coffeshop.Api
```

`DesignTimeDbContextFactory` reads the connection string from `src/Coffeshop.Api/appsettings.Development.json` for design-time commands (`add`/`update`), independent of whatever's configured at runtime.

## Related

[../docs/29_COMMERCE_ARCHITECTURE_FREEZE.md](../docs/29_COMMERCE_ARCHITECTURE_FREEZE.md) · [../docs/30_COMMERCE_DDD_MODEL.md](../docs/30_COMMERCE_DDD_MODEL.md) · [../docs/31_COMMERCE_ENGINEERING_CONTRACTS.md](../docs/31_COMMERCE_ENGINEERING_CONTRACTS.md) · [../docs/36_SECURITY_MODEL.md](../docs/36_SECURITY_MODEL.md) · [../explain.md](../explain.md) for full project status.
