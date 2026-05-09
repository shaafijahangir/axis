# Rename Plan: NexusEd → Axis

## Pre-flight Checklist
- [ ] All dev servers stopped
- [ ] All work committed on main (clean working tree)
- [ ] PostgreSQL running locally
- [ ] No open PRs that touch renamed directories

---

## Step 0: Create a Branch

```bash
git checkout -b chore/rename-nexused-to-axis
```

**Never do this directly on main.** This is a 300+ file change — if something breaks you need a safe rollback point.

---

## Step 1: Directory Renames (do first, requires no running processes)

Run these `git mv` commands from the repo root:

```bash
git mv nexused-backend axis-backend
git mv nexused-frontend axis-frontend
git mv nexused-mobile axis-mobile
```

If `git mv` fails on Windows, use PowerShell instead:
```powershell
Rename-Item nexused-backend axis-backend
Rename-Item nexused-frontend axis-frontend
Rename-Item nexused-mobile axis-mobile
```
Then stage: `git add -A`

**Immediately after renames — reinstall dependencies:**
```bash
pnpm install
```
pnpm workspace symlinks break when directories move. This must happen before running anything.

**Commit 1:**
```bash
git commit -m "chore(root): rename directories nexused-* → axis-*"
```

---

## Step 2: Root Config Files

### `package.json`
- `"name": "nexused"` → `"name": "axis"`
- All `--filter=nexused-backend` → `--filter=axis-backend` (9 occurrences)
- All `--filter=nexused-frontend` → `--filter=axis-frontend` (5 occurrences)
- All `--filter=nexused-mobile` → `--filter=axis-mobile` (1 occurrence)
- `"nexused-backend/src/**/*.ts"` → `"axis-backend/src/**/*.ts"`
- `"nexused-frontend/src/**/*.{ts,tsx}"` → `"axis-frontend/src/**/*.{ts,tsx}"`
- `"nexused-mobile/**/*.{ts,tsx}"` → `"axis-mobile/**/*.{ts,tsx}"`

### `pnpm-workspace.yaml`
```yaml
packages:
  - "axis-backend"
  - "axis-frontend"
  - "axis-mobile"
```

### `docker-compose.yml`
- `POSTGRES_DB: nexused` → `POSTGRES_DB: axis`
- `context: ./nexused-backend` → `context: ./axis-backend`
- `./nexused-backend/.env` → `./axis-backend/.env`
- `context: ./nexused-frontend` → `context: ./axis-frontend`

### `docker-compose.prod.yml`
- `context: ./nexused-backend` → `context: ./axis-backend`
- `context: ./nexused-frontend` → `context: ./axis-frontend`

### `.vscode/settings.json`
- `"nexused-backend/node_modules/typescript/lib"` → `"axis-backend/node_modules/typescript/lib"`

### `turbo.json` (if present)
- Any `nexused-*` pipeline references → `axis-*`

---

## Step 3: Per-Package `package.json` Names

### `axis-backend/package.json`
- `"name": "nexused-backend"` → `"name": "axis-backend"`

### `axis-frontend/package.json`
- `"name": "nexused-frontend"` → `"name": "axis-frontend"`

### `axis-mobile/package.json`
- `"name": "nexused-mobile"` → `"name": "axis-mobile"`

---

## Step 4: TypeScript + Jest Configs

### `axis-backend/tsconfig.json` and `axis-backend/tsconfig.build.json`
- Any path aliases or rootDir references containing `nexused` → `axis`

### `axis-frontend/tsconfig.json`
- Any path aliases or rootDir references containing `nexused` → `axis`

### `axis-mobile/tsconfig.json`
- Any path aliases or rootDir references containing `nexused` → `axis`

### `axis-backend/jest.config.ts` (or `.js`)
- Any `moduleNameMapper`, `rootDir`, or `testPathPattern` containing `nexused` → `axis`

### `axis-frontend/jest.config.ts` (or `.js`)
- Same check

### `axis-backend/nest-cli.json`
- Any `nexused` references → `axis`

---

## Step 5: CI/CD — `.github/workflows/ci.yml`

All 5 occurrences of `nexused_test` → `axis_test`:
- Line 23: `POSTGRES_DB: nexused_test` → `POSTGRES_DB: axis_test`
- Line 60: `DATABASE_NAME: nexused_test` → `DATABASE_NAME: axis_test`
- Line 78: `POSTGRES_DB: nexused_test` → `POSTGRES_DB: axis_test`
- Line 116: `DATABASE_NAME: nexused_test` → `DATABASE_NAME: axis_test`
- Line 139: `DATABASE_NAME: nexused_test` → `DATABASE_NAME: axis_test`

All filter/path references:
- Line 103: `pnpm --filter nexused-frontend` → `pnpm --filter axis-frontend`
- Line 110: `pnpm --filter nexused-backend` → `pnpm --filter axis-backend`
- Line 121: `pnpm --filter nexused-frontend` → `pnpm --filter axis-frontend`
- Line 146: `path: nexused-frontend/playwright-report/` → `path: axis-frontend/playwright-report/`

---

## Step 6: Environment Files + Local Database

> **Order matters here.** Update `.env` and rename the DB in the same step so the app never points to a database that doesn't exist.

### `axis-backend/.env.example`
- `DATABASE_NAME=nexused` → `DATABASE_NAME=axis`
- `R2_BUCKET=nexused` → `R2_BUCKET=axis`
- `EMAIL_FROM=NexusEd <noreply@yourdomain.com>` → `EMAIL_FROM=Axis <noreply@axis.app>`
- `VAPID_EMAIL=admin@nexused.app` → `VAPID_EMAIL=admin@axis.app`

### `axis-backend/.env.test`
- `DATABASE_NAME=nexused_test` → `DATABASE_NAME=axis_test`

### `.env.production.example`
- `DATABASE_USERNAME=nexused` → `DATABASE_USERNAME=axis`
- `DATABASE_NAME=nexused` → `DATABASE_NAME=axis`
- `R2_BUCKET=nexused` → `R2_BUCKET=axis`
- `EMAIL_FROM=NexusEd <noreply@yourdomain.com>` → `EMAIL_FROM=Axis <noreply@axis.app>`
- `SENTRY_PROJECT=nexused` → `SENTRY_PROJECT=axis`

### `axis-backend/.env` (gitignored — do not commit)
- `DATABASE_NAME=nexused` → `DATABASE_NAME=axis`

**Immediately after updating `.env` — rename the local database:**
```sql
ALTER DATABASE nexused RENAME TO axis;
ALTER DATABASE nexused_test RENAME TO axis_test;
```
Or drop and recreate if you don't need the dev data:
```bash
dropdb nexused && createdb axis
dropdb nexused_test && createdb axis_test
```
Do this before starting the app or it will crash trying to connect to a database named `nexused` that no longer exists.

---

## Step 7: Mobile App Config — `axis-mobile/app.json`
```json
"name": "Axis",
"slug": "axis-mobile",
"scheme": "axis",
"ios": { "bundleIdentifier": "app.axis.mobile" },
"android": { "package": "app.axis.mobile" }
```

---

## Step 8: Backend Source Files

### `axis-backend/src/config/email.config.ts`
- `'NexusEd <noreply@nexused.app>'` → `'Axis <noreply@axis.app>'`

### `axis-backend/src/config/lti.config.ts`
- `'NexusEd'` (line 15 default tool name) → `'Axis'`

### `axis-backend/src/modules/notifications/email.service.ts`
- `'NexusEd <noreply@nexused.app>'` → `'Axis <noreply@axis.app>'`

### `axis-backend/src/modules/notifications/email-templates.service.ts`
- `<title>NexusEd</title>` → `<title>Axis</title>`
- `NexusEd` in the header span → `Axis`
- `you have an account on NexusEd` → `you have an account on Axis`

### `axis-backend/src/modules/ai/agents/study-coach.agent.ts`
- `You are a Study Coach for NexusEd` → `You are a Study Coach for Axis`

### `axis-backend/src/modules/ai/agents/feedback-copilot.agent.ts`
- `You are a Feedback Copilot for NexusEd` → `You are a Feedback Copilot for Axis`

### `axis-backend/src/modules/ai/agents/course-planner.agent.ts`
- `You are a Course Planner for NexusEd` → `You are a Course Planner for Axis`
- Comment line 6: `the entire NexusEd project` → `the entire Axis project`

### `axis-backend/src/modules/ai/ai.service.ts`
- Comment line 22: `NexusEd needs` → `Axis needs`

### `axis-backend/src/modules/ai/events/ai-events.ts`
- Comment: `the NexusEd event system` → `the Axis event system`

### `axis-backend/src/modules/lti/lti.service.ts`
- `LTI Role URIs to NexusEd role mapping` → `LTI Role URIs to Axis role mapping`
- `Get or create a NexusEd user` → `Get or create an Axis user`
- `Map LTI roles to NexusEd roles` → `Map LTI roles to Axis roles`
- `Map LTI role URIs to NexusEd roles` → `Map LTI role URIs to Axis roles`

### `axis-backend/src/modules/lti/lti.resolver.ts`
- `LTI courses not yet mapped to NexusEd sections` → `LTI courses not yet mapped to Axis sections`
- `Link an LTI context to a NexusEd section` → `Link an LTI context to an Axis section`
- `Unlink an LTI context from a NexusEd section` → `Unlink an LTI context from an Axis section`

### `axis-backend/src/modules/lti/lti.controller.ts`
- `register NexusEd` → `register Axis`

### `axis-backend/src/modules/lti/lti.module.ts`
- `LTI 1.3 integration for NexusEd` → `LTI 1.3 integration for Axis`

### `axis-backend/src/modules/lti/entities/lti-user.entity.ts`
- `Linked NexusEd User` → `Linked Axis User`

### `axis-backend/src/modules/lti/entities/lti-platform.entity.ts`
- `launch NexusEd as an LTI 1.3 tool` → `launch Axis as an LTI 1.3 tool`

### `axis-backend/src/modules/lti/entities/lti-deployment.entity.ts`
- Both `NexusEd` occurrences → `Axis`

### `axis-backend/src/modules/lti/entities/lti-context.entity.ts`
- Both `NexusEd` occurrences → `Axis`

### `axis-backend/src/modules/lti/dto/lti.types.ts`
- `linking an LTI context to a NexusEd section` → `linking an LTI context to an Axis section`

### `axis-backend/src/modules/courses/enrollment-policy.service.ts`
- `outside NexusEd` → `outside Axis`

### `axis-backend/src/modules/planner/dto/financial-projection.types.ts`
- `Configuring these here lets NexusEd` → `Configuring these here lets Axis`

### `axis-backend/src/database/entities/student-degree-profile.entity.ts`
- `before NexusEd adoption` → `before Axis adoption`

### `axis-backend/src/database/seed.ts`
- Comment line 5: `full student journey through NexusEd` → `full student journey through Axis`
- `'NexusEd Demo'` (line 96) → `'Axis Demo'`
- `'Submitted via NexusEd'` (line 705) → `'Submitted via Axis'`

### `axis-backend/src/database/seed-demo.ts`
- `'Submitted via NexusEd'` → `'Submitted via Axis'`

---

## Step 9: Frontend Source Files

### `axis-frontend/src/app/layout.tsx`
All 7 occurrences of `'NexusEd'` → `'Axis'`:
- `title: 'NexusEd'` (×3)
- `siteName: 'NexusEd'`
- `content="NexusEd"` (×2 meta tags)

### `axis-frontend/src/app/(auth)/login/page.tsx`
- `<h1 ...>NexusEd</h1>` → `<h1 ...>Axis</h1>`

### `axis-frontend/src/app/(auth)/register/page.tsx`
- `<h1 ...>NexusEd</h1>` → `<h1 ...>Axis</h1>`

### `axis-frontend/src/components/layout/top-nav.tsx`
- `<span ...>NexusEd</span>` → `<span ...>Axis</span>`

### `axis-frontend/src/components/layout/sidebar.tsx`
- `<span ...>NexusEd</span>` → `<span ...>Axis</span>`

### `axis-frontend/src/components/marketing/marketing-nav.tsx`
- `NexusEd` → `Axis`

### `axis-frontend/src/components/marketing/marketing-footer.tsx`
- `NexusEd` (×2) → `Axis`

### `axis-frontend/src/components/auth/auth-guard.tsx`
- `Loading NexusEd, please wait...` → `Loading Axis, please wait...`

### `axis-frontend/src/components/pwa/install-prompt.tsx`
- `Install NexusEd` → `Install Axis`

### `axis-frontend/src/app/page.tsx`
- All `NexusEd` occurrences → `Axis` (4 occurrences)

### `axis-frontend/src/app/about/page.tsx`
- All `NexusEd` occurrences → `Axis` (9 occurrences)

### `axis-frontend/src/app/features/page.tsx`
- All `NexusEd` occurrences → `Axis` (11 occurrences)

### `axis-frontend/src/app/(dashboard)/admin/integrations/page.tsx`
- All `NexusEd` occurrences → `Axis` (7 occurrences)

### `axis-frontend/public/manifest.json`
- `"name": "NexusEd"` → `"name": "Axis"`
- `"short_name": "NexusEd"` → `"short_name": "Axis"`

### `axis-frontend/public/sw.js`
- `NexusEd Service Worker` → `Axis Service Worker`
- `'nexused-v1'` → `'axis-v1'`
- `title: 'NexusEd'` (×2) → `title: 'Axis'`
- `tag: type || 'nexused-notification'` → `tag: type || 'axis-notification'`

### `axis-frontend/e2e/01-login.spec.ts`
- Comment: `heading is "NexusEd"` → `heading is "Axis"`
- `name: /nexused/i` → `name: /axis/i`

### `axis-frontend/e2e/fixtures/auth.fixture.ts`
- `@test.nexused.local` (×3) → `@test.axis.local`

---

## Step 10: Mobile Source Files

### `axis-mobile/app/(auth)/login.tsx`
- `<Text ...>NexusEd</Text>` → `<Text ...>Axis</Text>`

### `axis-mobile/app/(auth)/register.tsx`
- `<Text ...>NexusEd</Text>` → `<Text ...>Axis</Text>`

### `axis-mobile/app/profile/index.tsx`
- `'NexusEd Mobile · v1.0.0'` → `'Axis Mobile · v1.0.0'`

### `axis-mobile/src/hooks/usePushNotifications.ts`
- `name: 'NexusEd'` → `name: 'Axis'`

### `axis-mobile/src/hooks/useAuth.ts`
- `promptMessage: 'Unlock NexusEd'` → `promptMessage: 'Unlock Axis'`

---

## Step 11: Documentation — Global Find/Replace in All `.md` Files

Files to update (all in repo root + subdirs, excluding node_modules/.git):
`README.md`, `ARCHITECTURE.md`, `BACKLOG.md`, `CLAUDE.md`, `COMPLIANCE.md`, `CONVENTIONS.md`, `DATA-MODEL.md`, `DESIGN-SYSTEM.md`, `MISSION.md`, `PLAN.md`, `ROADMAP.md`, `SECURITY.md`, `STORY.md`, `TECH_STACK.md`, `TEST-COVERAGE.md`, `TESTING-PLAN.md`, `TO-WORK-ON.md`, `.claude/session-log.md`

Replacements:
- `NexusEd` → `Axis`
- `nexused-backend` → `axis-backend`
- `nexused-frontend` → `axis-frontend`
- `nexused-mobile` → `axis-mobile`
- `nexused.app` → `axis.app`

---

## Step 12: Verification (mandatory — do not skip)

Run this grep to catch any remaining occurrences across all source files:

```bash
grep -r "nexused\|NexusEd" . \
  --include="*.ts" \
  --include="*.tsx" \
  --include="*.js" \
  --include="*.json" \
  --include="*.yaml" \
  --include="*.yml" \
  --include="*.md" \
  --include="*.env*" \
  | grep -v node_modules \
  | grep -v "\.git/" \
  | grep -v "RENAME-PLAN.md"
```

**Expected result: no output.** Any line returned = missed occurrence. Fix before committing.

---

## Step 13: Build + Test Verification

```bash
pnpm run typecheck
pnpm run build
pnpm run test
```

All three must pass before the final commit. A broken rename is worse than no rename.

---

## Step 14: Commits + PR

Do **not** use a single `git add -A` with one commit. Use logical groupings:

```bash
# Commit 2 — config + CI
git add package.json pnpm-workspace.yaml docker-compose*.yml .vscode/ .github/
git commit -m "chore(root): update workspace config and CI for Axis rename"

# Commit 3 — backend source
git add axis-backend/src/ axis-backend/package.json axis-backend/tsconfig* axis-backend/jest.config* axis-backend/nest-cli.json
git commit -m "chore(backend): rename NexusEd → Axis in all source files"

# Commit 4 — frontend source
git add axis-frontend/src/ axis-frontend/public/ axis-frontend/e2e/ axis-frontend/package.json axis-frontend/tsconfig*
git commit -m "chore(frontend): rename NexusEd → Axis in all source files"

# Commit 5 — mobile source
git add axis-mobile/
git commit -m "chore(mobile): rename NexusEd → Axis in all source files"

# Commit 6 — docs
git add *.md .claude/session-log.md
git commit -m "docs(root): rename NexusEd → Axis across all documentation"
```

Then push and open a PR:

```bash
git push -u origin chore/rename-nexused-to-axis
gh pr create \
  --title "chore: rename product NexusEd → Axis across entire codebase" \
  --body "$(cat <<'EOF'
## Summary
- Renamed all directories: nexused-* → axis-*
- Updated all package names, workspace config, CI/CD, env files
- Updated all source file string references (backend, frontend, mobile)
- Updated all documentation
- Local DB renamed separately (gitignored)

## Testing
- [x] pnpm typecheck passes
- [x] pnpm build passes
- [x] pnpm test passes
- [x] grep verification shows zero remaining nexused/NexusEd occurrences
EOF
)"
```

Merge squash and delete the branch.

---

## Rollback Plan

If something goes wrong mid-rename:

```bash
git checkout main
git branch -D chore/rename-nexused-to-axis
```

Since everything is on a branch, main is always clean. The only thing that can't be rolled back automatically is the local DB rename — keep the original DB name until the rename is fully verified.

---

## Notes for the Implementing AI

1. **Do Step 1 (directory renames) first** — all other steps reference the new directory names.
2. **Run `pnpm install` immediately after Step 1** — workspace symlinks break on directory rename.
3. **Steps 2–11 are independent** once directories are renamed; do them in parallel if possible.
4. **Do not touch files in `.claude/worktrees/`** — those are stale git worktrees, not live files.
5. **The real `.env` file** (`axis-backend/.env`) is gitignored — update it but do not commit it.
6. **Rename the local DB immediately after updating `.env`** (Step 6) — don't leave them out of sync.
7. **`pnpm-workspace.yaml` must match actual directory names** — update it together with the directory renames.
8. **`CLAUDE.md` is in Step 11** — it contains `NexusEd` references and must be updated.
9. **Step 12 verification is mandatory** — do not skip it or commit before it passes.
10. **Step 13 build check is mandatory** — do not open the PR if the build is broken.
