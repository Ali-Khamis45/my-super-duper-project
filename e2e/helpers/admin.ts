import { execFileSync } from "node:child_process";

/**
 * No self-service "become admin" endpoint exists (correctly — that would be a real security
 * hole), so both this suite and this sprint's own manual verification promote a real user via
 * direct `psql` access to the dev Postgres container — the same approach `docs/41_BACKEND_DEVELOPMENT_STANDARDS.md`'s
 * testing standards already accept for backend integration tests (`CoffeshopApiFactory.PromoteToAdminAsync`),
 * just from the frontend e2e side instead of a `WebApplicationFactory`.
 *
 * The Admin role's id is looked up at call time, not hardcoded: `RoleDefinition.Create`
 * (`IdentitySeeder.cs`) assigns it via `Guid.NewGuid()` on every fresh database, so it's
 * different on every dev machine/CI run/`docker-compose down -v` — a literal id here would only
 * ever work against whichever single database happened to be running when it was copied.
 *
 * `execFileSync` with an argv array, not `execSync` with a shell string — the SQL itself mixes
 * double-quoted identifiers (`"Id"`, Postgres's own case-sensitive-column convention) with
 * single-quoted string literals (`'Admin'`), which no single layer of shell quoting can carry
 * through intact. An argv array sidesteps shell parsing entirely: the SQL reaches `psql` as one
 * literal argument, unaltered.
 */
const POSTGRES_CONTAINER = "coffeshop-backend-postgres-1";

function psql(sql: string): string {
  return execFileSync("docker", ["exec", POSTGRES_CONTAINER, "psql", "-U", "coffeshop", "-d", "coffeshop", "-t", "-A", "-c", sql])
    .toString()
    .trim();
}

export function verifyAndPromoteToAdmin(email: string): void {
  const adminRoleId = psql(`SELECT "Id" FROM roles WHERE name = 'Admin'`);
  if (!adminRoleId) {
    throw new Error("No 'Admin' role found in the dev database — is IdentitySeeder still seeding it under that name?");
  }
  psql(`UPDATE users SET is_email_verified = true, role_ids = array_append(role_ids, '${adminRoleId}'::uuid) WHERE email = '${email}'`);
}

/** A plain verified (non-admin) account — for the "authenticated but forbidden" case. */
export function verifyEmailOnly(email: string): void {
  psql(`UPDATE users SET is_email_verified = true WHERE email = '${email}'`);
}

/** Sprint 5.3 — same shape as `verifyAndPromoteToAdmin`, but the `Staff` role (`orders:view`/`orders:update-status` only) — the realistic role for Ordering's own admin pages, not full `Admin`. */
export function verifyAndPromoteToStaff(email: string): void {
  const staffRoleId = psql(`SELECT "Id" FROM roles WHERE name = 'Staff'`);
  if (!staffRoleId) {
    throw new Error("No 'Staff' role found in the dev database — is IdentitySeeder still seeding it under that name?");
  }
  psql(`UPDATE users SET is_email_verified = true, role_ids = array_append(role_ids, '${staffRoleId}'::uuid) WHERE email = '${email}'`);
}
