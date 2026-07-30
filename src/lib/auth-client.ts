/**
 * The real first network consumer of authentication — per docs/33_AUTH_ARCHITECTURE.md's
 * "Frontend integration" section (`lib/auth-client.ts`, additive, new this milestone). The
 * access token lives in a module-level variable only, never `localStorage`/`sessionStorage`
 * (an XSS payload that can read storage can exfiltrate a long-lived credential; an in-memory
 * token is gone on tab close/refresh, which `refreshAccessToken` on app load handles
 * transparently). The refresh token never appears here at all — it's an HttpOnly cookie the
 * browser attaches automatically to same-origin-configured requests via `credentials: "include"`.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5000";

export interface UserDto {
  id: string;
  email: string;
  fullName: string;
  isEmailVerified: boolean;
  roles: string[];
  permissions: string[];
}

interface AuthResponse {
  accessToken: string;
  expiresAtUtc: string;
  user: UserDto;
}

export interface SessionDto {
  id: string;
  deviceName: string | null;
  userAgent: string | null;
  createdAtUtc: string;
  lastUsedAtUtc: string | null;
  expiresAtUtc: string;
  isCurrent: boolean;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public problemType: string | undefined,
    message: string,
    public fieldErrors?: Record<string, string[]>,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

let accessToken: string | null = null;
let accessTokenExpiresAtUtc: number = 0;
// Concurrent 401s from several in-flight requests must share one refresh attempt, not each
// trigger their own — a burst of requests right at token expiry would otherwise race multiple
// rotations against the same single-use refresh token cookie.
let refreshInFlight: Promise<boolean> | null = null;

async function parseProblemDetails(response: Response): Promise<ApiError> {
  let title = response.statusText;
  let type: string | undefined;
  let fieldErrors: Record<string, string[]> | undefined;

  try {
    const body = await response.json();
    title = body.title ?? title;
    type = body.type;
    fieldErrors = body.errors;
  } catch {
    // Non-JSON error body (e.g. a 204/empty response never reaches here, but a proxy error page might) — fall back to statusText.
  }

  return new ApiError(response.status, type, title, fieldErrors);
}

async function refreshAccessToken(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
        method: "POST",
        credentials: "include",
      });

      if (!response.ok) {
        accessToken = null;
        accessTokenExpiresAtUtc = 0;
        return false;
      }

      const body = (await response.json()) as AuthResponse;
      accessToken = body.accessToken;
      accessTokenExpiresAtUtc = Date.parse(body.expiresAtUtc);
      return true;
    } catch {
      return false;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

/** Called once on app load — an in-memory token is gone after a refresh, this restores a session from the refresh cookie transparently, per docs/33_AUTH_ARCHITECTURE.md. */
export async function restoreSession(): Promise<UserDto | null> {
  const refreshed = await refreshAccessToken();
  if (!refreshed) return null;
  try {
    return await getCurrentUser();
  } catch {
    return null;
  }
}

/** Exported for reuse by other authenticated clients (e.g. `product-client.ts`'s admin mutations) — same in-memory token + single-flight refresh-on-401 behavior, not a second copy of it. */
export async function authorizedFetch(path: string, init: RequestInit = {}, isRetry = false): Promise<Response> {
  // A 60s safety margin — never send a request with a token that's about to expire mid-flight.
  if (!accessToken || Date.now() >= accessTokenExpiresAtUtc - 60_000) {
    await refreshAccessToken();
  }

  const headers = new Headers(init.headers);
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);

  const response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers, credentials: "include" });

  if (response.status === 401 && !isRetry) {
    const refreshed = await refreshAccessToken();
    if (refreshed) return authorizedFetch(path, init, true);
  }

  return response;
}

function jsonHeaders(): HeadersInit {
  return { "Content-Type": "application/json" };
}

export async function register(email: string, password: string, fullName: string): Promise<UserDto> {
  const response = await fetch(`${API_BASE_URL}/api/v1/auth/register`, {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify({ email, password, fullName }),
  });
  if (!response.ok) throw await parseProblemDetails(response);
  return response.json();
}

export async function login(email: string, password: string, deviceName?: string): Promise<UserDto> {
  const response = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
    method: "POST",
    headers: jsonHeaders(),
    credentials: "include",
    body: JSON.stringify({ email, password, deviceName: deviceName ?? null }),
  });
  if (!response.ok) throw await parseProblemDetails(response);
  const body = (await response.json()) as AuthResponse;
  accessToken = body.accessToken;
  accessTokenExpiresAtUtc = Date.parse(body.expiresAtUtc);
  return body.user;
}

export async function logout(): Promise<void> {
  await fetch(`${API_BASE_URL}/api/v1/auth/logout`, { method: "POST", credentials: "include" });
  accessToken = null;
  accessTokenExpiresAtUtc = 0;
}

export async function getCurrentUser(): Promise<UserDto> {
  const response = await authorizedFetch("/api/v1/auth/me");
  if (!response.ok) throw await parseProblemDetails(response);
  return response.json();
}

export async function verifyEmail(token: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/v1/auth/verify-email`, {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify({ token }),
  });
  if (!response.ok) throw await parseProblemDetails(response);
}

export async function forgotPassword(email: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/v1/auth/forgot-password`, {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify({ email }),
  });
  if (!response.ok) throw await parseProblemDetails(response);
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/v1/auth/reset-password`, {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify({ token, newPassword }),
  });
  if (!response.ok) throw await parseProblemDetails(response);
}

export async function getSessions(): Promise<SessionDto[]> {
  const response = await authorizedFetch("/api/v1/auth/sessions");
  if (!response.ok) throw await parseProblemDetails(response);
  return response.json();
}

export async function revokeSession(sessionId: string): Promise<void> {
  const response = await authorizedFetch("/api/v1/auth/revoke-session", {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify({ sessionId }),
  });
  if (!response.ok) throw await parseProblemDetails(response);
}
