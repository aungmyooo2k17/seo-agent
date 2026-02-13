# Running the AI Development Team

This guide explains how to invoke each AI agent to build the SEO Agent system.

---

## Overview

```
Phase 1 (Parallel)     Phase 2 (Parallel)     Phase 3          Phase 4
─────────────────     ─────────────────     ─────────────    ─────────────
│ Backend       │     │ SEO Engineer  │     │           │    │           │
│ AI Engineer   │ ──▶ │ Content Eng   │ ──▶ │ Architect │ ──▶│    QA     │
│ DevOps        │     │ Integrations  │     │           │    │           │
─────────────────     ─────────────────     ─────────────    ─────────────
```

---

## Agent Invocation Template

Each agent is invoked with this prompt structure:

```
<project_context>
[Contents of PROJECT_CONTEXT.md]
</project_context>

<interfaces>
[Contents of INTERFACES.md]
</interfaces>

<agent_context>
[Contents of agents/{agent-name}.md]
</agent_context>

<current_files>
[List of files that already exist in the project]
</current_files>

<task>
Build all files specified in your agent context.
Follow the implementation requirements exactly.
Create production-quality code with proper error handling.
Update STATUS.md when complete.
</task>
```

---

## Phase 1: Foundation (Run in Parallel)

### Agent 1: Backend Engineer

```
Invoke with:
- PROJECT_CONTEXT.md
- INTERFACES.md
- agents/backend.md

Expected output files:
- /src/types/index.ts
- /src/types/config.ts
- /src/types/codebase.ts
- /src/types/seo.ts
- /src/types/content.ts
- /src/types/analytics.ts
- /src/types/services.ts
- /src/config/index.ts
- /src/config/loader.ts
- /src/db/index.ts
- /src/db/client.ts
- /src/db/schema.sql
```

### Agent 2: AI Engineer

```
Invoke with:
- PROJECT_CONTEXT.md
- INTERFACES.md
- agents/ai-engineer.md

Expected output files:
- /src/ai/index.ts
- /src/ai/client.ts
- /src/ai/prompts.ts
```

### Agent 3: DevOps Engineer

```
Invoke with:
- PROJECT_CONTEXT.md
- agents/devops.md

Expected output files:
- Dockerfile
- docker-compose.yml
- .env.example
- .gitignore
- .dockerignore
- scripts/init-db.ts
- scripts/run.sh
```

---

## Phase 2: Core Features (Run in Parallel, After Phase 1)

### Agent 4: SEO Engineer

```
Invoke with:
- PROJECT_CONTEXT.md
- INTERFACES.md
- agents/seo-engineer.md
- [Files created in Phase 1]

Expected output files:
- /src/scanner/index.ts
- /src/scanner/detector.ts
- /src/scanner/profiler.ts
- /src/scanner/seo-analyzer.ts
- /src/scanner/frameworks/index.ts
- /src/scanner/frameworks/types.ts
- /src/scanner/frameworks/nextjs-app.ts
- /src/scanner/frameworks/nextjs-pages.ts
- /src/scanner/frameworks/astro.ts
- /src/scanner/frameworks/html.ts
- /src/optimizer/index.ts
- /src/optimizer/meta.ts
- /src/optimizer/schema.ts
- /src/optimizer/sitemap.ts
- /src/optimizer/robots.ts
- /src/optimizer/internal-links.ts
```

### Agent 5: Content Engineer

```
Invoke with:
- PROJECT_CONTEXT.md
- INTERFACES.md
- agents/content-engineer.md
- [Files created in Phase 1]

Expected output files:
- /src/optimizer/content.ts
- /src/optimizer/images/index.ts
- /src/optimizer/images/replicate.ts
- /src/optimizer/images/optimizer.ts
```

### Agent 6: Integrations Engineer

```
Invoke with:
- PROJECT_CONTEXT.md
- INTERFACES.md
- agents/integrations.md
- [Files created in Phase 1]

Expected output files:
- /src/github/index.ts
- /src/github/client.ts
- /src/github/clone.ts
- /src/github/commit.ts
- /src/github/push.ts
- /src/analytics/index.ts
- /src/analytics/search-console.ts
- /src/analytics/tracker.ts
- /src/reports/index.ts
- /src/reports/daily.ts
- /src/reports/weekly.ts
- /src/reports/email.ts
```

---

## Phase 3: Integration (Sequential, After Phase 2)

### Agent 7: Architect

```
Invoke with:
- PROJECT_CONTEXT.md
- INTERFACES.md
- agents/architect.md
- [ALL files created in Phase 1 and 2]

Expected output files:
- /src/index.ts
```

---

## Phase 4: Quality Assurance (Sequential, After Phase 3)

### Agent 8: QA Engineer

```
Invoke with:
- PROJECT_CONTEXT.md
- agents/qa.md
- [ALL files created]

Expected output files:
- /tests/unit/*.test.ts
- /tests/integration/*.test.ts
- /tests/e2e/*.test.ts
- /tests/fixtures/
- /tests/setup.ts
- /tests/helpers.ts
```

---

## Running Multiple Agents in Parallel

When using Claude Code's Task tool, you can run Phase 1 agents in parallel:

```typescript
// Pseudocode for parallel agent invocation
const phase1Results = await Promise.all([
  runAgent('backend', backendPrompt),
  runAgent('ai-engineer', aiEngineerPrompt),
  runAgent('devops', devopsPrompt),
])

// After Phase 1 completes
const phase2Results = await Promise.all([
  runAgent('seo-engineer', seoEngineerPrompt),
  runAgent('content-engineer', contentEngineerPrompt),
  runAgent('integrations', integrationsPrompt),
])

// Sequential phases
await runAgent('architect', architectPrompt)
await runAgent('qa', qaPrompt)
```

---

## Validation Between Phases

After each phase, verify:

1. **All expected files exist**
2. **TypeScript compiles**: `npm run typecheck`
3. **No import errors**: Check all imports resolve
4. **Exports are correct**: Each module exports via index.ts

---

## Status Tracking

Each agent should update `STATUS.md` after completing their work:

1. Change their status from 🔴 to 🟢
2. Check off completed files
3. Add any notes about decisions made
4. Document any blockers or issues

---

## Conflict Resolution

If two agents need the same file:

1. **Check TEAM.md** for ownership
2. **Owner implements**, other reviews
3. **Architect decides** if unclear

---

## Full Build Command Sequence

After all agents complete:

```bash
# Install dependencies
npm install

# Type check
npm run typecheck

# Build
npm run build

# Initialize database
npx ts-node scripts/init-db.ts

# Test Docker build
docker-compose build

# Run tests
npm test

# Full test run
docker-compose up
```

---

## Troubleshooting

### Import Errors

If agent's code has import errors:
1. Check if dependency files exist
2. Verify export names match
3. Check tsconfig.json paths

### Type Errors

If TypeScript compilation fails:
1. Verify types in /src/types/ are complete
2. Check interface implementations
3. Ensure all required fields are present

### Runtime Errors

If code crashes at runtime:
1. Check environment variables
2. Verify database initialization
3. Check API credentials

---

## Agent Context Files Summary

| Agent | Context File | Phase |
|-------|--------------|-------|
| Backend | `agents/backend.md` | 1 |
| AI Engineer | `agents/ai-engineer.md` | 1 |
| DevOps | `agents/devops.md` | 1 |
| SEO Engineer | `agents/seo-engineer.md` | 2 |
| Content Engineer | `agents/content-engineer.md` | 2 |
| Integrations | `agents/integrations.md` | 2 |
| Architect | `agents/architect.md` | 3 |
| QA | `agents/qa.md` | 4 |
