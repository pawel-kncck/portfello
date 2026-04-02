# Debugging Log

Project: Portfello
Purpose: Track all debugging sessions and their resolutions

## Debugging Protocol
1. Document symptoms first
2. Form hypothesis before acting
3. Log every debugging action
4. Document the fix and verification
5. Include lessons learned

---

## Session: 2026-04-02 23:40

### Issue: Authentication fails in production — "Account created but login failed"

#### 23:40 - Investigation Started
**Symptoms**: 
- User can create account successfully (signup server action works)
- Auto-login after signup fails with: "Account created but login failed. Please sign in manually."
- Production only — app runs behind Coolify's reverse proxy (Traefik) on Hetzner

**Hypothesis**: CSRF token validation fails because Auth.js doesn't trust the reverse proxy's forwarded headers, causing a mismatch between the client-side URL (public HTTPS) and the server-side URL (internal HTTP).

#### 23:41 - Debugging Steps
1. **Action**: Traced the error message to `app/(auth)/signup/page.tsx:26`
   **Result**: Error triggers when `signIn('credentials', { redirect: false })` returns `signInResult?.error`
   **Learning**: The signup server action succeeds (user created in DB) but the subsequent client-side signIn POST fails

2. **Action**: Reviewed `auth.ts` NextAuth configuration
   **Result**: No `trustHost` setting, no `AUTH_TRUST_HOST` env var referenced
   **Learning**: Auth.js v5 behind a reverse proxy needs `trustHost: true` to accept forwarded Host/Proto headers

3. **Action**: Checked deployment config in `docker-compose.yml` and `docs/deployment-lessons.md`
   **Result**: App deployed on Coolify (Hetzner CX22) behind reverse proxy. `AUTH_URL: http://localhost:3000` in docker-compose (local dev), production env vars set in Coolify separately
   **Learning**: The reverse proxy terminates TLS and forwards HTTP to the app. Without trustHost, Auth.js sees internal HTTP URL, not the public HTTPS URL

4. **Action**: Verified `bcryptjs` is pure JS (no native binding issues across platforms)
   **Result**: Confirmed — not a password hashing platform issue
   **Learning**: Rules out authorize() itself as the failure point

#### 23:42 - Root Cause Identified
**Cause**: Auth.js v5 CSRF validation fails behind Coolify's reverse proxy. The `signIn()` client call POSTs to `/api/auth/callback/credentials` through the proxy. Auth.js generates CSRF tokens based on the request URL. Without `trustHost: true`, it uses the internal URL (`http://0.0.0.0:3000`) instead of the public HTTPS URL, causing the CSRF token from the client cookie to not match.

The signup server action works because it's a direct server-side Prisma call — no HTTP request through the proxy, no CSRF involved.

**File(s)**: `auth.ts`

#### 23:42 - Fix Applied
**Solution**: Added `trustHost: true` to the NextAuth configuration in `auth.ts`
**Verification**: All tests pass (10/10)

#### 23:42 - Post-Mortem
**Lessons Learned**: 
- Auth.js v5 behind a reverse proxy always needs `trustHost: true` or the `AUTH_TRUST_HOST=true` env var
- Server actions bypass the proxy's HTTP layer, so they can mask auth issues (signup works but signIn doesn't)
- This should be added to `docs/deployment-lessons.md` as Issue 8

---
