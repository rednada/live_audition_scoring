# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm run dev          # Start dev server on http://localhost:3000

# Database
npm run db:seed      # Seed sessions, houses, roles and generate QR codes
npm run db:studio    # Open Prisma Studio (DB GUI)
npx prisma migrate dev --name <name>  # Create and apply a migration

# Build & lint
npm run build        # Production build
npm run lint         # ESLint
npx tsc --noEmit     # TypeScript type check (no test suite currently)
```

## Architecture

**Full-stack Next.js 14 (App Router)** with:
- **Prisma 7 + SQLite** (`dev.db` at project root, set by `DATABASE_URL="file:./dev.db"` in `.env`) — swap provider to `postgresql` in `prisma.config.ts` to migrate. Prisma 7 requires the `@prisma/adapter-better-sqlite3` adapter; `url` is NOT in `schema.prisma` (set via `prisma.config.ts` datasource). Use `new PrismaBetterSqlite3({ url: dbUrl })` then pass adapter to `PrismaClient`.
- **File storage** — `uploads/` served via `/api/files/[...path]/route.ts`; swap `src/lib/storage.ts` to migrate to S3/OSS
- **Auth** — cookie-based (`las_session`), no real validation; director SSO IDs start with `2`, casting with `3`

### Three user flows

| Role | Entry | Key pages |
|------|-------|-----------|
| 演员 (Actor) | QR code scan | `/checkin/[code]` — mobile-first form |
| 导演 (Director) | `/director/login` | `/director/scoring` — star ratings, drafts, House/Role select |
| 甄选团队 (Casting) | `/casting/login` | `/casting/results` — aggregated table, Wrap Up edit, Excel export |

### Key data flow

1. **Actor check-in**: scans QR → `POST /api/actors` creates actor record → `POST /api/upload` stores photos per type (`front_half`, `left_half`, `right_half`, `left_full`, `right_full`, `tattoo`)
2. **Director scoring**: drafts auto-saved to localStorage + debounced `PUT /api/drafts` (2s) → batch `POST /api/scores` on submit → moves actor to "已打分" tab
3. **Casting view**: `GET /api/wrap-up` returns actors with all director scores + computed avg → `PUT /api/wrap-up` to save Wrap Up edits → `GET /api/export` generates Excel

### Database singleton pattern

`src/lib/db.ts` exports a global Prisma client singleton using `PrismaBetterSqlite3` adapter (Prisma 7 requires explicit adapter — no `url` in `schema.prisma`).

### Draft persistence

Drafts live in both localStorage (key: `las_drafts_{ssoId}`) and the `ScoreDraft` DB table. On session/stage change, the scoring page fetches DB drafts and merges them into local state. On submit, the corresponding drafts are deleted server-side.

### Other directors' scores

Toggle "查看他人打分" — when on, SWR polls `/api/scores?excludeSelf=true` every 15 seconds. Scores shown inside each actor card in a collapsible panel.
