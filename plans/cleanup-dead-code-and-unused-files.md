# Cleanup: Dead Code and Unused Files Across Monorepo

**Type:** refactor
**Priority:** Medium
**Created:** 2025-12-25
**Status:** TODO

## Overview

Perform a systematic cleanup of dead code, unused files, stale documentation, and configuration drift across the lofn monorepo. The research indicates this is a **healthy, actively developed codebase** with minimal dead code - primarily documentation drift and template remnants.

## Problem Statement

The monorepo has accumulated:

1. **Configuration drift** - `services/*` workspace pattern references non-existent directory
2. **Stale documentation** - README files don't reflect actual project structure
3. **Template remnants** - Example component files from initial setup
4. **Missing documentation** - No `.env.example` files for web/backend workspaces
5. **Naming inconsistency** - Root package named "hermes" but repo is "lofn"
6. **Accumulated planning docs** - 12 plan files in `/plans/` with unknown completion status

## Proposed Solution

Use **Knip** (the 2025 standard for dead code detection) combined with manual verification to safely identify and remove unused code, then update documentation to reflect current state.

## Technical Approach

### Phase 1: Investigation & Tooling Setup

**Install Knip and run initial scan:**

```bash
# Install Knip as dev dependency
bun add -D knip

# Run initial scan
bunx knip --include files,dependencies,exports > cleanup-report.txt

# Review results
cat cleanup-report.txt
```

**Create Knip configuration:**

```json
// knip.json
{
  "workspaces": {
    ".": {
      "entry": ["apps/*/src/index.ts"],
      "ignore": ["**/plans/**", "**/*.md"]
    },
    "apps/web": {
      "entry": ["src/main.tsx", "src/routes/**/*.tsx"],
      "ignore": ["**/*.test.ts", "**/*.spec.ts"]
    },
    "apps/lofn": {
      "entry": ["src/index.ts"],
      "ignore": ["**/*.test.ts"]
    },
    "packages/backend": {
      "entry": ["convex/http.ts", "convex/crons.ts"],
      "project": ["convex/**/*.ts"]
    }
  }
}
```

### Phase 2: Safe Configuration Cleanup

**2.1 Remove non-existent workspace pattern**

```json
// package.json - BEFORE
"workspaces": {
  "packages": [
    "apps/*",
    "packages/*",
    "services/*"  // DELETE THIS LINE
  ]
}

// package.json - AFTER
"workspaces": {
  "packages": [
    "apps/*",
    "packages/*"
  ]
}
```

**Reference:** `/Users/kevin/code/src/github/kevmok/lofn/package.json:9`

### Phase 3: Example Component Verification

**3.1 Verify example.tsx usage:**

```bash
# Check if example.tsx is imported anywhere besides component-example.tsx
grep -r "from.*example" apps/web/src/ --include="*.tsx" --include="*.ts" | grep -v "component-example"
grep -r "example.tsx" apps/web/src/ --include="*.tsx" --include="*.ts"
```

**3.2 Check if component-example.tsx is used in any route:**

```bash
grep -r "ComponentExample\|component-example" apps/web/src/routes/ --include="*.tsx"
```

**Expected result:** If both return empty, files are safe to delete.

**Files to potentially delete:**

- `apps/web/src/components/component-example.tsx` (470 lines)
- `apps/web/src/components/example.tsx` (55 lines)

### Phase 4: Documentation Updates

**4.1 Update root README.md:**

```markdown
# Lofn Monorepo

Polymarket prediction market analysis platform with AI-powered signals.

## Structure

- `apps/web` - Dashboard frontend (TanStack Start + React)
- `apps/lofn` - Market data collector (Effect.ts + WebSocket)
- `packages/backend` - Convex serverless backend

## Quick Start

\`\`\`bash
bun install
bun run dev
\`\`\`

## Documentation

See [CLAUDE.md](./CLAUDE.md) for comprehensive documentation.
```

**4.2 Create missing .env.example files:**

```bash
# apps/web/.env.example
VITE_CONVEX_URL=https://your-project.convex.cloud

# packages/backend/.env.example
CONVEX_DEPLOY_KEY=prod:your-deploy-key
ANTHROPIC_KEY=sk-ant-xxx
OPENAI_KEY=sk-xxx
GEMINI_KEY=xxx
```

**4.3 Update apps/web/README.md:**

```markdown
# Lofn Web Dashboard

Real-time dashboard for viewing AI-generated prediction market signals.

## Stack
- TanStack Start + Router
- React 19
- shadcn/ui components
- Convex real-time database

## Development

\`\`\`bash
bun run dev
\`\`\`

See root CLAUDE.md for full documentation.
```

### Phase 5: Planning Document Audit

**Review each plan file and add status:**

| File                                            | Status    | Action                         |
| ----------------------------------------------- | --------- | ------------------------------ |
| `00-design-decisions.md`                        | REFERENCE | Keep (architectural decisions) |
| `01-backend-signals-schema.md`                  | COMPLETED | Archive                        |
| `02-backend-trade-processing-pipeline.md`       | COMPLETED | Archive                        |
| `03-backend-resolution-performance-metrics.md`  | COMPLETED | Archive                        |
| `04-frontend-signal-feed-cards.md`              | COMPLETED | Archive                        |
| `05-frontend-dashboard-polish.md`               | COMPLETED | Archive                        |
| `dashboard-consolidation-and-detail-views.md`   | COMPLETED | Archive                        |
| `feat-lofn-saas-backend-architecture.md`        | REFERENCE | Keep                           |
| `feat-realtime-dashboard.md`                    | COMPLETED | Archive                        |
| `feat-scalable-ai-analysis-architecture.md`     | REFERENCE | Keep                           |
| `fix-convex-integration-use-official-client.md` | COMPLETED | Archive                        |
| `structured-ai-outputs.md`                      | COMPLETED | Archive                        |

**Create archive directory:**

```bash
mkdir -p plans/archive
mv plans/01-*.md plans/02-*.md plans/03-*.md plans/04-*.md plans/05-*.md plans/archive/
mv plans/dashboard-consolidation-*.md plans/archive/
mv plans/feat-realtime-dashboard.md plans/archive/
mv plans/fix-convex-*.md plans/archive/
mv plans/structured-ai-outputs.md plans/archive/
```

### Phase 6: Add Cleanup Scripts

**Add to root package.json:**

```json
{
  "scripts": {
    "lint:dead-code": "knip",
    "lint:dead-code:fix": "knip --fix",
    "clean": "rm -rf apps/*/dist packages/*/dist **/*.tsbuildinfo",
    "clean:all": "bun run clean && rm -rf node_modules apps/*/node_modules packages/*/node_modules && bun install"
  }
}
```

## Acceptance Criteria

### Functional Requirements

- [ ] Knip installed and configured with `knip.json`
- [ ] `services/*` workspace pattern removed from package.json
- [ ] Example component files verified and deleted (if unused)
- [ ] Root README.md updated with correct instructions
- [ ] `.env.example` files created for all workspaces
- [ ] Completed plan documents moved to `/plans/archive/`
- [ ] Cleanup scripts added to package.json

### Quality Gates

- [ ] `bun install` completes without errors
- [ ] `bun run build` (if exists) succeeds
- [ ] `bunx knip` returns no critical issues
- [ ] Dev servers start: `bun run dev` works for all workspaces
- [ ] Manual smoke test of dashboard routes passes

## Verification Steps

```bash
# 1. Clean install
rm -rf node_modules bun.lock
bun install

# 2. Type check
cd packages/backend && bun run typecheck
cd apps/web && bunx tsc --noEmit

# 3. Lint
bun run lint

# 4. Run Knip
bunx knip

# 5. Start dev servers (verify each starts)
bun run --filter backend dev &
bun run --filter web dev &
bun run --filter @hermes/lofn dev &

# 6. Manual test
# - Visit http://localhost:3000
# - Navigate to /dashboard/signals
# - Verify data loads
```

## Risk Assessment

| Item                          | Risk   | Mitigation                       |
| ----------------------------- | ------ | -------------------------------- |
| Delete used example files     | Medium | Verify with grep before deletion |
| Break workspace resolution    | Low    | Test `bun install` after change  |
| Lose important plan docs      | Low    | Archive, don't delete            |
| Missing env vars for new devs | Low    | Create .env.example files        |

## Dependencies & Prerequisites

- Git working directory must be clean before starting
- Create git commit/tag as rollback point before cleanup
- No active development branches that might conflict

## Files to Modify

1. `/package.json` - Remove services/\*, add scripts
2. `/README.md` - Update with correct instructions
3. `/knip.json` - Create new file
4. `/apps/web/.env.example` - Create new file
5. `/packages/backend/.env.example` - Create new file
6. `/apps/web/README.md` - Update
7. `/apps/web/src/components/example.tsx` - Delete (if verified unused)
8. `/apps/web/src/components/component-example.tsx` - Delete (if verified unused)

## References

### Internal References

- Architecture documentation: `/CLAUDE.md`
- Current schema: `/packages/backend/convex/schema.ts`
- Workspace config: `/package.json:9`

### External References

- [Knip Documentation](https://knip.dev)
- [Knip Monorepo Support](https://knip.dev/features/monorepos-and-workspaces)
- [TypeScript Remove (tsr)](https://github.com/line/tsr) - Alternative for automated removal

### Tools Used

- Knip v5.x - Dead code detection
- Bun - Package manager and runtime
