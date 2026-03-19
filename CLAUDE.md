# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SUBLENS is a SaaS-based concept management platform where users create, version, and tag-manage "concepts". It uses a monorepo structure with separate `backend/` and `frontend/` directories.

## Commands

### Backend (Spring Boot, Java 21, Gradle)
```bash
cd backend
./gradlew bootRun          # Run backend locally (port 8080)
./gradlew build            # Build JAR
./gradlew test             # Run all tests
./gradlew test --tests "com.sublens.backend.SomeTest"  # Run a single test
```

### Frontend (Next.js 16, React 19, TypeScript)
```bash
cd frontend
npm run dev    # Start dev server (port 3000)
npm run build  # Production build
npm run lint   # ESLint
```

### Docker (full stack)
```bash
docker compose up --build      # Build and run all services
docker compose down            # Stop all services
docker compose down -v         # Stop and delete volumes (resets DB)
docker compose logs backend    # Logs for specific service
docker exec -it sublens-redis-1 redis-cli  # Redis CLI
```

### Environment Setup
Create `.env` in the root directory:
```
JWT_SECRET=<secret>
```

Backend reads env vars with fallbacks defined in `application.yaml`. Local defaults use `localhost:5432` (PostgreSQL) and `localhost:6379` (Redis).

Frontend needs `NEXT_PUBLIC_API_BASE_URL` in `frontend/.env.local` (currently set to the backend base URL).

## Architecture

### Backend (`com.sublens.backend`)
- **`auth/`** — Authentication: `AuthController` (routes under `/api/auth/**`), `AuthService`, `JwtTokenProvider`, DTOs
- **`security/`** — `SecurityConfig` (CORS, stateless sessions, filter chain), `JwtAuthenticationFilter` (reads `access_token` cookie per request)
- **`user/`** — `User` entity, `UserRepository`, `Role` enum
- **`mail/`** — `EmailService` orchestrates `ResendClient` (HTTP call to Resend API) and `MailTemplate` for password reset emails
- **`global/exception/`** — `GlobalExceptionHandler`, `BusinessException`, `ErrorCode`, `ApiResponse` (standardized response wrapper)
- **`config/`** — `RedisConfig`

### Frontend (`frontend/`)
- **`app/`** — Next.js App Router. `(auth)/` is a route group containing `login`, `signup`, `dashboard`, `reset-password` pages. `layout.tsx` wraps with providers.
- **`features/auth/`** — `api.ts` (raw Axios calls), `hooks.ts` (TanStack Query wrappers)
- **`lib/axios.ts`** — Two Axios instances: `api` (with 401 interceptor for token refresh) and `plainApi` (no interceptor, used for auth endpoints)
- **`views/`** — UI components decoupled from routing (e.g., `views/login/Login.tsx`)
- **`providers/`** — `ReactQueryProvider.tsx`

### Auth Flow
Tokens are stored as **HttpOnly cookies** (`access_token`, `refresh_token`). The Axios interceptor in `lib/axios.ts` automatically calls `/api/auth/reissue` on 401, then retries the original request. On reissue failure, it logs out and redirects to `/login`.

### Redis Key Patterns
- `refresh:{userId}` — Refresh token (24h TTL), rotated on each reissue
- `reset:token:{token}` — Maps password reset token → userId (10min TTL)
- `reset:user:{userId}` — Maps userId → active reset token (10min TTL, used to invalidate old tokens)

### Infrastructure
Docker Compose runs: `postgres:16`, `redis:7`, `backend` (8080→8081), `frontend` (3000), `nginx` (80). The `nginx/nginx.conf` proxies traffic.

`ddl-auto: update` is active — schema changes in JPA entities are applied automatically on startup.
