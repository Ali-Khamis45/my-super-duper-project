# auth

Sprint 5.1 — account creation, login, session restore, email verification, and password reset against the real backend (`Coffeshop.Identity`/`Coffeshop.Domain.Identity`) via `lib/auth-client.ts` and `stores/auth-store.ts`. Follows the `hero-cup/README.md` template — Architecture, Flow, Responsibilities, Future extension.

## Architecture

```
auth/
├── components/
│   ├── LoginForm.tsx
│   ├── RegisterForm.tsx
│   ├── ForgotPasswordForm.tsx
│   ├── ResetPasswordForm.tsx
│   ├── VerifyEmailStatus.tsx      /verify-email — pending/success/failed states
│   ├── AccountMenu.tsx            navbar dropdown, session-aware
│   └── AuthSessionRestorer.tsx    mounted once in app/providers.tsx — see Flow
└── hooks/
    └── useRequireAuth.ts          the guard every non-admin protected route uses
```

`lib/auth-client.ts` (not inside this feature folder — every backend-facing feature keeps its network calls in `lib/`, not duplicated per-feature) holds the actual `fetch` calls, the access token as an in-memory module variable (never `localStorage`, so it can't be read by injected script), and `authorizedFetch` — the shared wrapper every other `lib/*-client.ts` file's authenticated calls go through, including a single silent-refresh-and-retry-once on a 401. `stores/auth-store.ts` holds the reactive `status`/`user` state components actually read.

Routes: `app/login`, `app/register`, `app/forgot-password`, `app/reset-password`, `app/verify-email` — all thin pages composing this feature's forms.

## Flow

1. `app/providers.tsx` mounts `AuthSessionRestorer` once, globally — on load it calls `auth-client.ts`'s `restoreSession()` (silent-refresh via the httpOnly refresh cookie) so a returning user with a valid session never sees a login prompt they shouldn't.
2. `LoginForm`/`RegisterForm` call `login`/`register`, then update `auth-store.ts` directly — no route-level redirect logic lives in the forms themselves, the calling page decides where to go next.
3. `useRequireAuth()` is the guard every customer-facing protected route uses (`/orders`, `/payments`'s history list) — same three-state shape (`checking`/`unauthenticated`/`allowed`) `features/admin/hooks/useRequireManageProducts.ts` established for staff-only routes, minus the permission check: any authenticated account, not a specific role. Client-side gating, not middleware, since the real access token only ever lives in `auth-client.ts`'s in-memory variable, which a server middleware has no way to see.
4. `VerifyEmailStatus`/`ResetPasswordForm` read a token from the URL query string and call the matching `auth-client.ts` function directly — no store involvement, since these are one-shot actions on a link a user clicked from an email, not part of the ongoing session.

## Responsibilities

- **This feature owns**: every auth-specific form/page component, the account menu, the route guard hook.
- **This feature borrows from `lib/auth-client.ts`/`stores/auth-store.ts`**: every network call, the access-token lifecycle, and the reactive session state — never duplicated locally.
- **This feature does not own**: role/permission checks beyond "is there a session at all" (`features/admin/`'s own guards own that), anything account-adjacent but domain-specific like order or payment history (`features/orders/`, `features/payments/` own those, reading `auth-store.ts` only to know who's asking).

## Known simplifications

- No "remember me" / long-lived-session toggle — the refresh-token rotation window is the same for every session.
- No social/OAuth login — email/password only.
- No account settings page (change email, change password while logged in, delete account) — only the logged-out forgot/reset-password flow exists today.

## Future extension

- An account-settings page would be additive: `lib/auth-client.ts` already has every primitive (`getSessions`/`revokeSession` exist and back the "active sessions" list a settings page would need) except a change-password-while-authenticated endpoint, which doesn't exist on the backend yet.
- Social/OAuth login would extend `AuthOptions`/`Coffeshop.Identity` on the backend first — nothing here assumes password-only today, but nothing is built to support a second provider either.
