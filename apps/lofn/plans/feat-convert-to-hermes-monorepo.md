# feat: Convert to Hermes Monorepo with Bun Workspaces

## Overview

Convert the existing `lofn` project into a Bun workspaces monorepo called `hermes`. The current application becomes `apps/lofn` within the new structure, enabling future multi-app development with shared packages.

## Problem Statement / Motivation

The current project structure is a single package. As the project grows, we need:

- **Multi-app support**: Ability to add new apps (dashboard, API, CLI) that share code
- **Code sharing**: Extract common domain logic, AI services, and utilities
- **Better organization**: Clear separation between apps and shared packages
- **Scalability**: Foundation for team growth and parallel development

## Proposed Solution

Create a Bun workspaces monorepo with:

- Root `hermes/` directory with workspace configuration
- `apps/lofn/` - Current application (deployable)
- `packages/` - Future shared libraries (prepared but empty initially)

### Target Directory Structure

```
hermes/                                 # Root monorepo (rename current dir)
├── package.json                        # Workspace root: "workspaces": ["apps/*", "packages/*"]
├── bun.lock                            # Unified lockfile
├── bunfig.toml                         # Bun workspace configuration
├── tsconfig.base.json                  # Shared TypeScript config
├── .gitignore                          # Root gitignore
├── CLAUDE.md                           # Monorepo development guidelines
├── README.md                           # Monorepo overview
│
├── apps/
│   └── lofn/                           # Current app moves here
│       ├── package.json                # name: "@hermes/lofn", deps with workspace:*
│       ├── tsconfig.json               # extends ../../tsconfig.base.json
│       ├── index.ts                    # Entry point
│       ├── .env                        # App-specific environment
│       ├── .env.example
│       ├── src/                        # Existing source code (unchanged internally)
│       │   ├── main.ts
│       │   ├── config/
│       │   ├── domain/
│       │   ├── services/
│       │   └── layers/
│       ├── data/                       # Runtime data (moved with app)
│       │   └── polymarket/
│       ├── plans/                      # Planning docs
│       ├── todos/                      # Technical debt tracking
│       └── agent-rules/                # AI agent documentation
│
└── packages/                           # Future shared packages (empty initially)
    └── .gitkeep                        # Placeholder
```

## Technical Approach

### Phase 1: Create Monorepo Root Structure

**1.1 Rename project directory**

```bash
# From parent directory
mv lofn hermes
cd hermes
```

**1.2 Create root package.json**

```json
{
  "name": "hermes",
  "version": "1.0.0",
  "private": true,
  "workspaces": ["apps/*", "packages/*"],
  "scripts": {
    "dev": "bun --cwd apps/lofn run index.ts",
    "dev:hot": "bun --hot --cwd apps/lofn run index.ts",
    "test": "bun --filter '*' test",
    "check": "bun --filter '*' run check",
    "clean": "rm -rf apps/*/node_modules packages/*/node_modules node_modules bun.lock"
  },
  "devDependencies": {
    "@types/bun": "latest",
    "typescript": "^5"
  }
}
```

**1.3 Create bunfig.toml**

```toml
[workspace]
packages = ["apps/*", "packages/*"]

[install]
linkWorkspacePackages = true

[install.workspace]
exclude = [
  "**/node_modules/**",
  "**/dist/**",
  "**/data/**"
]
```

**1.4 Create tsconfig.base.json**

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "Preserve",
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "skipLibCheck": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "types": ["bun-types"]
  }
}
```

### Phase 2: Move App to apps/lofn

**2.1 Create apps directory and move code**

```bash
mkdir -p apps
git mv src apps/lofn/src
git mv index.ts apps/lofn/
git mv data apps/lofn/
git mv plans apps/lofn/
git mv todos apps/lofn/
git mv agent-rules apps/lofn/
git mv .env apps/lofn/ 2>/dev/null || true
git mv .env.example apps/lofn/ 2>/dev/null || true
```

**2.2 Create apps/lofn/package.json**

```json
{
  "name": "@hermes/lofn",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "module": "index.ts",
  "scripts": {
    "start": "bun run index.ts",
    "dev": "bun --hot run index.ts",
    "check": "bunx tsc --noEmit"
  },
  "dependencies": {
    "@effect/ai": "^0.32.1",
    "@effect/ai-anthropic": "^0.22.0",
    "@effect/ai-google": "^0.11.1",
    "@effect/ai-openai": "^0.36.0",
    "@effect/platform": "^0.93.8",
    "@effect/platform-bun": "^0.86.0",
    "@effect/schema": "^0.75.5",
    "effect": "^3.19.12",
    "nodejs-polars": "^0.23.4"
  }
}
```

**2.3 Create apps/lofn/tsconfig.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": ".",
    "baseUrl": "."
  },
  "include": ["**/*.ts"],
  "exclude": ["node_modules", "data"]
}
```

### Phase 3: Update Configuration Files

**3.1 Update root .gitignore**

Add to existing .gitignore:

```gitignore
# Workspace-specific
apps/*/node_modules
packages/*/node_modules

# Data directories (app-specific)
apps/*/data/

# Build outputs
apps/*/dist
packages/*/dist
*.tsbuildinfo
```

**3.2 Update CLAUDE.md for monorepo**

Add monorepo-specific instructions:

````markdown
## Monorepo Structure

This is a Bun workspaces monorepo called "hermes".

### Running Commands

```bash
# From root - run lofn app
bun run dev              # Uses root script
bun --cwd apps/lofn dev  # Direct workspace command

# Install dependencies
bun install              # Installs all workspaces

# Add dependency to specific workspace
bun add package --cwd apps/lofn
````

### Workspace Protocol

When referencing internal packages, use `workspace:*`:

```json
{
  "dependencies": {
    "@hermes/shared": "workspace:*"
  }
}
```

````

### Phase 4: Cleanup and Verification

**4.1 Create packages placeholder**
```bash
mkdir -p packages
touch packages/.gitkeep
````

**4.2 Remove old root files**

```bash
# Old package.json and tsconfig.json are replaced by new ones
rm -f package.json tsconfig.json
# Remove old node_modules and lockfile
rm -rf node_modules bun.lock
```

**4.3 Install and verify**

```bash
bun install
bun run dev
```

## Acceptance Criteria

### Functional Requirements

- [ ] Root `hermes/` directory with workspace configuration
- [ ] `apps/lofn/` contains all application code
- [ ] `packages/` directory exists for future shared code
- [ ] Application starts and runs correctly from root (`bun run dev`)
- [ ] Application starts from workspace (`cd apps/lofn && bun run index.ts`)
- [ ] WebSocket connection to Polymarket works
- [ ] Data loading and saving works (correct paths)
- [ ] Environment variables load from `apps/lofn/.env`
- [ ] All existing functionality preserved

### Non-Functional Requirements

- [ ] Git history preserved for moved files (`git log --follow` works)
- [ ] TypeScript type checking passes (`bun run check`)
- [ ] No broken imports or module resolution errors
- [ ] README updated with monorepo structure
- [ ] CLAUDE.md updated with monorepo commands

### Quality Gates

- [ ] `bun install` completes without errors
- [ ] `bun --cwd apps/lofn run index.ts` starts the app
- [ ] App runs for 60+ seconds without errors (tests scheduled tasks)
- [ ] Data persists across restarts

## Success Metrics

- Application starts and connects to Polymarket WebSocket
- Historical trades fetch successfully
- AI swarm queries execute without errors
- Data saves to `apps/lofn/data/polymarket/`

## Dependencies & Prerequisites

- Bun v1.0+ (current: appears to be 1.3.x based on features used)
- Git (for history-preserving moves)
- Existing lofn application working

## Risk Analysis & Mitigation

| Risk                               | Likelihood | Impact   | Mitigation                                            |
| ---------------------------------- | ---------- | -------- | ----------------------------------------------------- |
| Data path resolution breaks        | Medium     | Critical | Test data load/save immediately after migration       |
| .env not found                     | Medium     | Critical | Verify Bun loads .env from workspace directory        |
| Import paths break                 | Low        | High     | Internal imports use relative paths, no change needed |
| Git history lost                   | Low        | Medium   | Use `git mv` for all moves                            |
| nodejs-polars native bindings fail | Low        | High     | Test early, verify from nested workspace              |

## Documentation Plan

Update these files post-migration:

- `README.md` - Monorepo overview and getting started
- `CLAUDE.md` - Development commands for monorepo
- `apps/lofn/README.md` - App-specific documentation

## Future Considerations

Once the monorepo is established, consider extracting:

1. **@hermes/domain** - Market and Prediction types, schemas
2. **@hermes/ai** - Swarm service, model layers, prompts
3. **@hermes/data** - DataService, Polars utilities
4. **@hermes/polymarket** - WebSocket and Historical services

These extractions enable:

- Reusing AI swarm across multiple apps
- Sharing domain types between backend and future frontend
- Testing services in isolation

## Implementation Checklist

### Pre-Migration

- [ ] Backup data directory
- [ ] Note current working state
- [ ] Create migration branch

### Phase 1: Root Structure

- [ ] Create root package.json
- [ ] Create bunfig.toml
- [ ] Create tsconfig.base.json

### Phase 2: Move App

- [ ] Create apps/ directory
- [ ] git mv src, index.ts, data, plans, todos, agent-rules
- [ ] git mv .env files
- [ ] Create apps/lofn/package.json
- [ ] Create apps/lofn/tsconfig.json

### Phase 3: Configuration

- [ ] Update .gitignore
- [ ] Update CLAUDE.md
- [ ] Update README.md

### Phase 4: Verification

- [ ] Create packages/.gitkeep
- [ ] Remove old root config files
- [ ] Run bun install
- [ ] Test bun run dev
- [ ] Verify data persistence
- [ ] Verify WebSocket connection
- [ ] Test for 60+ seconds

### Post-Migration

- [ ] Commit with descriptive message
- [ ] Push and create PR
- [ ] Document any issues found

## References & Research

### Internal References

- Current structure: `src/main.ts:16-67` - Application entry and scheduled tasks
- Data loading: `src/services/data/DataService.ts:73-128`
- Config loading: `src/config/constants.ts`

### External References

- [Bun Workspaces Documentation](https://bun.sh/docs/install/workspaces)
- [Bun TypeScript Guide](https://bun.sh/docs/typescript)
- [Effect.ts Documentation](https://effect.website)

### Related Work

- Completed P1 fixes: #002, #003, #004, #005
- Pending: #001 (DataService repository abstraction - path to Convex)
