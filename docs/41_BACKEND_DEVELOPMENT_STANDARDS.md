# 41 — Backend Development Standards

Sprint 5.1 deliverable, written before the first line of implementation code (the same "standards before code" discipline [06_CODING_STANDARDS.md](06_CODING_STANDARDS.md) established for the frontend in Milestone 1) so every subsequent commerce sprint (5.2-5.6) has one place to check rather than re-deriving convention from whatever Sprint 5.1 happened to do first. Concrete, not aspirational — every rule here is followed by this sprint's own real code, checked at the end of this sprint's review.

## Solution & folder conventions

The backend lives in a new top-level `backend/` directory, sibling to the frontend's `src/` — two stacks in one repo, cleanly separated, neither nested inside the other:

```
backend/
├── Coffeshop.sln
├── src/
│   ├── Coffeshop.SharedKernel/     # Entity, AggregateRoot, ValueObject, IDomainEvent, AuditableEntity/ISoftDelete — zero dependencies on anything else in the solution
│   ├── Coffeshop.Domain/           # Aggregates, entities, value objects, domain events, domain exceptions, repository INTERFACES. References only SharedKernel.
│   ├── Coffeshop.Application/      # CQRS commands/queries/handlers, DTOs, FluentValidation validators, application-service interfaces (IPasswordHasher, IClock, IEmailSender, ITokenService, ICurrentUserService). References only Domain + SharedKernel — no EF Core, no ASP.NET Core.
│   ├── Coffeshop.Persistence/      # EF Core DbContext, IEntityTypeConfiguration<T> per aggregate, migrations, repository IMPLEMENTATIONS, seed data. References Application (for interfaces) + Domain.
│   ├── Coffeshop.Identity/         # JWT issuance/validation, refresh-token rotation logic, password hashing (wraps ASP.NET Core Identity's PasswordHasher<T> as a utility, not full Identity Framework), claims transformation. References Application + Domain.
│   ├── Coffeshop.Infrastructure/   # Cross-cutting: email provider, clock, Serilog/OpenTelemetry setup, rate-limit policies. References Application.
│   └── Coffeshop.Api/              # Presentation: minimal API endpoints, Program.cs composition root, Swagger, ProblemDetails, versioning. References every project above (the only project allowed to).
└── tests/
    ├── Coffeshop.Domain.Tests/         # Pure unit tests, aggregate invariants — no DI container, no database
    ├── Coffeshop.Application.Tests/    # Handler unit tests against faked/mocked interfaces
    └── Coffeshop.IntegrationTests/     # WebApplicationFactory + a real Postgres (docker-compose dev instance) — the only test project allowed to touch a real database
```

Project reference direction is enforced at compile time, the backend's equivalent of the frontend's registry-pattern layer boundaries ([01_ARCHITECTURE.md](01_ARCHITECTURE.md)): `Domain` cannot reference `Persistence`, `Api`, or `Identity` — a build error, not a code-review nit, exactly the guarantee ADR-0010 names.

Within `Coffeshop.Domain`, one folder per bounded context (`Identity/` for this sprint's `User`/`RefreshToken`/etc. — future sprints add `Catalog/`, `Ordering/`, matching [30_COMMERCE_DDD_MODEL.md](30_COMMERCE_DDD_MODEL.md)'s own section headers 1:1, so a reader can jump from the frozen model doc straight to the folder that implements it).

## Naming conventions

- Aggregates/entities/value objects: exact names from [30_COMMERCE_DDD_MODEL.md](30_COMMERCE_DDD_MODEL.md) (`User`, `RefreshToken`, `GuestContactInfo`) — never a renamed or abbreviated variant. The doc is the source of truth; code matches it, not the reverse.
- Commands: `<Verb><Noun>Command` (`RegisterUserCommand`, `RefreshTokenCommand`). Queries: `Get<Noun>Query`/`<Noun>Query` (`GetCurrentUserQuery`). Handlers: `<RequestName>Handler` in the same file as the request (one file per use case — a command/query and its handler and its validator are found together, not scattered across parallel folder trees keyed by type).
- DTOs: `<Noun>Dto` for response shapes (`UserDto`), matching [31_COMMERCE_ENGINEERING_CONTRACTS.md](31_COMMERCE_ENGINEERING_CONTRACTS.md)'s own naming. Request bodies are the command/query record itself (bound directly from JSON) — no separate "request model" class duplicating the command's shape.
- Interfaces: `I<Noun>` (`IUserRepository`, `IPasswordHasher`), one file per interface, defined in the layer that *consumes* them (`Application`), implemented in the layer that has the capability (`Persistence`/`Identity`/`Infrastructure`) — the Dependency Inversion half of Clean Architecture, not just a naming habit.
- Endpoints (minimal APIs, not MVC controllers — no controller-per-resource ceremony needed for this endpoint count): grouped by feature in `Api/Endpoints/AuthEndpoints.cs`, one static `MapAuthEndpoints(this IEndpointRouteBuilder app)` extension method.

## CQRS & MediatR rules

- Every command mutates and returns the minimum the caller needs (an id, a DTO, or `Unit`) — never a full aggregate. Every query only reads, never mutates (enforced by convention + review, not a compiler check).
- One handler per request, `internal sealed class`, colocated with its command/query record and its validator in one file — reduces navigation cost for what is, in practice, always edited together.
- Cross-cutting concerns (validation, logging, exception-to-ProblemDetails translation) are MediatR pipeline behaviors (`IPipelineBehavior<TRequest, TResponse>`), registered once in `Program.cs`, never duplicated inside individual handlers. Order: `LoggingBehavior` → `ValidationBehavior` → handler — logging wraps everything (including validation failures), validation runs before the handler ever executes.
- A handler never calls another handler directly (`IMediator.Send` from inside a handler is forbidden) — shared logic is a plain injected service, not a nested MediatR call, avoiding hidden multi-hop request chains that are hard to trace.

## Repository rules

- One repository per aggregate root, matching [31_COMMERCE_ENGINEERING_CONTRACTS.md](31_COMMERCE_ENGINEERING_CONTRACTS.md)'s frozen `IRepository<TAggregate, TId>` base plus additive per-aggregate methods (`IUserRepository.GetByEmailAsync`, `IUserRepository.GetByRefreshTokenAsync`) — never a generic `IRepository<T>` used directly by a handler, since that shape can't express aggregate-specific query needs without leaking `IQueryable`.
- Repositories return aggregates or `null`, never `IQueryable<T>` — filtering/paging happens inside the repository method (or a dedicated query object for read-only list endpoints), keeping persistence-shape knowledge (indexes, includes) out of the Application layer entirely.
- A repository's `Update`/`Remove` methods mark the entity's state in the tracked `DbContext`; the actual `SaveChangesAsync` call happens exactly once per request, in a MediatR pipeline behavior (`UnitOfWorkBehavior`) wrapping command handlers only — a handler never calls `SaveChangesAsync` itself, so "did this command's mutation get persisted" has exactly one place to check.

## Entity & aggregate rules

- Every aggregate root inherits `AggregateRoot<TId>` (SharedKernel), private setters on every property, mutation only through named methods expressing a real domain operation (`user.ChangePassword(newHash)`, never `user.PasswordHash = newHash`) — invariants live inside the method, not trusted to the caller.
- Every mutation that matters for audit/event purposes raises a domain event via `AddDomainEvent(...)`, dispatched by the same `SaveChangesAsync` interceptor [32_COMMERCE_EVENT_CATALOG.md](32_COMMERCE_EVENT_CATALOG.md) already specifies — the outbox table is created this sprint (schema only); real cross-context consumers arrive in later sprints, but the publish-side mechanism is real from the first aggregate, not deferred.
- Audit fields (`CreatedAtUtc`, `CreatedBy`, `ModifiedAtUtc`, `ModifiedBy`) and soft delete (`IsDeleted`, `DeletedAtUtc`) live on a shared `AuditableEntity`/`ISoftDelete` base in SharedKernel, applied via an EF Core `SaveChanges` interceptor (auto-populated, never set manually by a handler) and a global query filter (`HasQueryFilter(e => !e.IsDeleted)`) — one mechanism, applied uniformly, not per-aggregate boilerplate.
- Optimistic concurrency: a `byte[] RowVersion` (`xmin` system column via Npgsql, not a hand-rolled counter) on every aggregate root, mapped `IsRowVersion()` — a concurrent conflicting write throws `DbUpdateConcurrencyException`, translated to a 409 Problem Details response at the API boundary, matching [31_COMMERCE_ENGINEERING_CONTRACTS.md](31_COMMERCE_ENGINEERING_CONTRACTS.md)'s `ETag`/`If-Match` convention.

## DTO mapping rules

- Mapping is hand-written (`static UserDto ToDto(this User user)` extension methods), not a reflection-based mapper (AutoMapper/Mapster) — the DTO surface is small enough this sprint that a mapping library would add indirection without saving real code, and hand-written mapping fails at compile time when a DTO field is missed, not at runtime.
- A DTO never exposes a domain concept the frontend doesn't need (a password hash, an internal `RowVersion` byte array) — traced field-for-field against [31_COMMERCE_ENGINEERING_CONTRACTS.md](31_COMMERCE_ENGINEERING_CONTRACTS.md)'s tracing table before being considered done, not assumed correct because it compiles.

## Validation rules

- Every command/query has exactly one FluentValidation validator, checking shape (required fields, string length, email format, password policy) — never domain invariants (those live in the aggregate itself, per Entity rules above). A validator that duplicates an aggregate's own invariant check is a sign the check belongs in one place only, and shape-validation is not that place.
- Validation runs in the `ValidationBehavior` pipeline step; a failure short-circuits before the handler runs and surfaces as a 400 Problem Details response with a `errors` dictionary keyed by field name, matching ASP.NET Core's own `ValidationProblemDetails` shape (no custom error envelope invented).
- **Every validator class must be `public`, never `internal`.** `AddValidatorsFromAssembly` scans `Assembly.GetExportedTypes()` — an `internal` validator compiles cleanly, resolves no DI error, and is simply never found, so validation silently never runs for that request. This is the opposite of MediatR's own handler scanning (`internal sealed class ...Handler` is fine and the project's own convention above) — the two libraries scan differently, and this asymmetry is exactly what caused a real bug this sprint (docs/reviews/sprint-5.1-review.md): every validator was originally `internal`, and an empty password registered successfully with zero errors anywhere until it was caught by actually calling the API.

## Exception handling

- Domain invariant violations throw a typed `DomainException` subclass (e.g. `InvalidCredentialsException`, `RefreshTokenReuseDetectedException`) from inside the aggregate/domain service — never a generic `Exception` or `InvalidOperationException`, since the API layer's global exception handler maps specific domain exception types to specific HTTP status codes and RFC 9457 `type` values (`InvalidCredentialsException` → 401, `EmailAlreadyRegisteredException` → 409, unrecognized → 500).
- One global exception-handling middleware (`UseExceptionHandler` with a typed `IExceptionHandler`), not per-endpoint try/catch — an endpoint method never contains a `catch` block; if it needs one, the exception should have been a typed domain exception instead.
- Every unhandled 500 logs the full exception server-side but returns a generic Problem Details body to the client (no stack trace, no internal message) outside `Development` — per [36_SECURITY_MODEL.md](36_SECURITY_MODEL.md)'s secret-leakage row.

## Logging conventions

- Serilog, structured (never string-interpolated log messages — `Log.Information("User {UserId} logged in", userId)`, not `$"User {userId} logged in"`, so Seq/any sink can query by field).
- Every request gets a correlation id (ASP.NET Core's own `TraceIdentifier`, echoed as an OpenTelemetry `TraceId` per [35_INFRASTRUCTURE_AND_DEPLOYMENT.md](35_INFRASTRUCTURE_AND_DEPLOYMENT.md)) attached to every log line for that request via Serilog's `LogContext`.
- `Email`, `PasswordHash`, raw JWT/refresh-token values are never logged, at any level — enforced by a Serilog destructuring policy on `User`/`RefreshToken` that redacts those specific properties, not just contributor discipline, per [36_SECURITY_MODEL.md](36_SECURITY_MODEL.md)'s PII-in-logs rule.

## API response format

- Success: the DTO (or `PagedResult<T>` for lists) directly as the response body — no wrapper envelope (`{ data: ... }`) invented, matching [31_COMMERCE_ENGINEERING_CONTRACTS.md](31_COMMERCE_ENGINEERING_CONTRACTS.md).
- Error: RFC 9457 Problem Details exclusively (`application/problem+json`), via ASP.NET Core 10's built-in `ProblemDetails` middleware + a project-specific `type` URI per domain exception (`https://coffeshop.dev/errors/invalid-credentials`) — never a bespoke `{ error: "message" }` shape.
- Every mutating endpoint's success response includes the resource's current `ETag` header (the `RowVersion`, base64-encoded); every `PUT`/`PATCH`-shaped mutation this sprint (there are none yet — Sprint 5.1 has no update-in-place endpoint, this rule is stated for Sprint 5.2 onward) requires `If-Match`.

## Testing standards

- `Domain.Tests`: pure, no DI container, no mocking framework needed for most cases — construct an aggregate, call a method, assert on state/raised events/thrown exceptions.
- `Application.Tests`: one handler under test, its dependencies faked with hand-written test doubles or `NSubstitute` (chosen over Moq for its non-expression-tree, more readable syntax) — never a real database.
- `IntegrationTests`: `WebApplicationFactory<Program>` against a real Postgres (the docker-compose dev instance, connection string overridden via `IClassFixture`), covering full HTTP round trips for every endpoint in this sprint's catalog — the only place a JWT is actually issued and validated end-to-end, a refresh token actually rotates, per [39_COMMERCE_IMPLEMENTATION_READINESS.md](39_COMMERCE_IMPLEMENTATION_READINESS.md)'s Sprint 5.1 exit criteria.
- Test naming: `MethodName_Scenario_ExpectedResult` (`Register_DuplicateEmail_ThrowsEmailAlreadyRegisteredException`) — a failing test's name alone should describe the regression without opening the file.

## Migration strategy

- `dotnet ef migrations add <Name>` run from `Coffeshop.Persistence` with `Coffeshop.Api` as the startup project (for its DI configuration); one migration per sprint's real schema change, named for what it adds (`InitialIdentitySchema`, not `Migration1`).
- Migrations are never edited by hand after being committed — a mistake found later is a new migration, not a rewritten history, the same "extend, don't rewrite" discipline [37_API_STABILITY_POLICY.md](37_API_STABILITY_POLICY.md) applies to the wire contract, applied here to the schema.
- Applied via an explicit `dotnet ef database update` step (dev) or the pre-deploy gate (`35_INFRASTRUCTURE_AND_DEPLOYMENT.md`, production) — never `Database.EnsureCreated()`/auto-migrate-on-start in any environment.

## Performance guidelines

- Every EF Core read query used by a handler is `AsNoTracking()` unless the result is about to be mutated and saved in the same request — tracking overhead is opt-in, not the accidental default.
- `RefreshToken`/`Session` lookups (hit on every authenticated request via the refresh flow) are indexed on their lookup column explicitly (`TokenHash`, not the raw token value — see Security checklist) — verified present in the generated migration, not assumed.
- No N+1: any handler returning a DTO that includes related data uses a single `Include`/projection query, checked by reading the generated SQL in a test (`ToQueryString()`) for this sprint's two genuinely relational reads (current user + roles, session list).

## Security checklist

- Passwords: `PasswordHasher<User>` (ASP.NET Core Identity's utility class, PBKDF2) — never a custom hash, never stored or logged in plaintext, ever, including in test fixtures (test users get real hashed passwords, not a shortcut).
- Refresh tokens: stored as a SHA-256 hash of the token value, never the raw token — a database read (backup leak, SQL injection) never yields a usable credential. The raw value exists only in the `HttpOnly` cookie and the moment it's generated server-side.
- JWT signing key: read from configuration/secret manager ([35_INFRASTRUCTURE_AND_DEPLOYMENT.md](35_INFRASTRUCTURE_AND_DEPLOYMENT.md)'s environment-separation table), never a hardcoded string, including in this sprint's own dev `appsettings.Development.json` (a real, dev-only generated key via `dotnet user-secrets`, not committed).
- Every endpoint defaults to requiring authentication (`RequireAuthorization()` applied at the route-group level); `[AllowAnonymous]`-equivalent (`.AllowAnonymous()`) is the explicit opt-out for `register`/`login`/`refresh`/`forgot-password`/`reset-password`/`verify-email` only, matching [31_COMMERCE_ENGINEERING_CONTRACTS.md](31_COMMERCE_ENGINEERING_CONTRACTS.md)'s convention table.
- Rate limiting (per [36_SECURITY_MODEL.md](36_SECURITY_MODEL.md)'s three layers) applied to the auth endpoint group from day one of this sprint, not deferred — `login`/`register`/`forgot-password` get the tighter named policy.

## Related

[06_CODING_STANDARDS.md](06_CODING_STANDARDS.md) · [30_COMMERCE_DDD_MODEL.md](30_COMMERCE_DDD_MODEL.md) · [31_COMMERCE_ENGINEERING_CONTRACTS.md](31_COMMERCE_ENGINEERING_CONTRACTS.md) · [33_AUTH_ARCHITECTURE.md](33_AUTH_ARCHITECTURE.md) · [36_SECURITY_MODEL.md](36_SECURITY_MODEL.md) · [37_API_STABILITY_POLICY.md](37_API_STABILITY_POLICY.md)
