# Multi-stage build for Coffeshop.Api — production deployment image (Railway/Fly/Render).
# Not used by local dev (docker-compose.yml only runs Postgres/Redis/Mailhog/Seq there;
# the API itself runs via `dotnet run` for fast iteration) — this is the deploy artifact.

FROM mcr.microsoft.com/dotnet/sdk:10.0-noble AS build
WORKDIR /src

# Copy only the project files first so `dotnet restore` is cached across builds that
# don't touch dependencies — real build-time savings on every redeploy that's just a
# code change, not a package bump.
COPY Coffeshop.slnx .
COPY src/Coffeshop.Api/Coffeshop.Api.csproj src/Coffeshop.Api/
COPY src/Coffeshop.Application/Coffeshop.Application.csproj src/Coffeshop.Application/
COPY src/Coffeshop.Domain/Coffeshop.Domain.csproj src/Coffeshop.Domain/
COPY src/Coffeshop.Identity/Coffeshop.Identity.csproj src/Coffeshop.Identity/
COPY src/Coffeshop.Infrastructure/Coffeshop.Infrastructure.csproj src/Coffeshop.Infrastructure/
COPY src/Coffeshop.Persistence/Coffeshop.Persistence.csproj src/Coffeshop.Persistence/
COPY src/Coffeshop.SharedKernel/Coffeshop.SharedKernel.csproj src/Coffeshop.SharedKernel/
RUN dotnet restore src/Coffeshop.Api/Coffeshop.Api.csproj

COPY src/ src/
RUN dotnet publish src/Coffeshop.Api/Coffeshop.Api.csproj -c Release -o /app --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:10.0-noble AS runtime
WORKDIR /app

# Non-root — the base image ships an unprivileged `app` user for exactly this.
USER app

COPY --from=build --chown=app:app /app .

ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

# /health/live checks only that the process is up (no dependency calls) — the right
# probe for a container healthcheck; /health/ready (DB connectivity) is what the
# platform's own readiness/load-balancer check should hit instead.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD wget -q -O- http://localhost:8080/health/live || exit 1

ENTRYPOINT ["dotnet", "Coffeshop.Api.dll"]
