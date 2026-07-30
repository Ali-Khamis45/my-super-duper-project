/**
 * Shared by every Catalog client (`menu-client.ts`, `category-client.ts`, `ingredient-client.ts`,
 * `search-client.ts`, `product-client.ts`) — the exact `ApiError`/RFC 9457 problem-details
 * parsing `auth-client.ts` established in Sprint 5.1, extracted once here rather than
 * re-duplicated five times. `auth-client.ts` itself is left untouched (its own copy keeps
 * working exactly as shipped) — this is new code sharing a new module, not a rewrite of it.
 */

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5000";

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

export async function parseProblemDetails(response: Response): Promise<ApiError> {
  let title = response.statusText;
  let type: string | undefined;
  let fieldErrors: Record<string, string[]> | undefined;

  try {
    const body = await response.json();
    title = body.title ?? title;
    type = body.type;
    fieldErrors = body.errors;
  } catch {
    // Non-JSON error body — fall back to statusText, same as `auth-client.ts`.
  }

  return new ApiError(response.status, type, title, fieldErrors);
}
