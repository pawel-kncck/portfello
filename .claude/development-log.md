# Development Log

Project: Portfello
Started: 2026-04-02

## Session Guidelines
- Each session starts with a todo list
- Each completed todo gets a commit
- Each commit gets a log entry
- No exceptions to the above rules

---

## Session: 2026-04-02 23:40

### Todo List:
- [x] Diagnose production auth failure ("Account created but login failed")
- [x] Fix Auth.js configuration for reverse proxy

### Changes:

#### 23:42 - Fix Auth.js trustHost for production reverse proxy
**Files Modified**: 
- `auth.ts` - Added `trustHost: true` to NextAuth config

**Details**:
- Root cause: Auth.js CSRF validation fails behind Coolify's reverse proxy without `trustHost: true`
- The `signIn()` client-side call goes through the proxy, but Auth.js didn't trust forwarded headers
- This caused URL mismatch between client (HTTPS public URL) and server (HTTP internal URL)
- Fix: single line addition of `trustHost: true` to NextAuth config

---
