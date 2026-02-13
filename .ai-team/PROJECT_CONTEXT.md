# Project Context — SEO Agent

> This file is read by ALL AI agents. It provides the shared understanding of what we're building.

---

## What We're Building

An **autonomous SEO optimization agent** that:

1. Connects to GitHub repositories
2. Scans and understands codebases (detects framework, structure)
3. Identifies SEO issues automatically
4. Fixes issues by modifying code
5. Generates blog content with AI
6. Creates images for posts
7. Commits and pushes changes directly (no approval needed)
8. Tracks performance via Google Search Console
9. Sends daily/weekly email reports
10. Runs daily in a Docker container

---

## Key Decisions (Already Made)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Auto-merge | YES, always | User wants full automation |
| Content approval | NO | Publish directly |
| Multiple repos | YES | Multi-tenant by design |
| Hosting | User handles | We only modify code |
| Runtime | Docker + cron | Daily scheduled runs |
| AI Provider | Anthropic Claude | Using existing pattern |
| Image Gen | Replicate (Flux) | Best quality/cost |
| Database | SQLite | Simple, file-based |
| Language | TypeScript | Type safety |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     DOCKER CONTAINER                             │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    ORCHESTRATOR                           │  │
│  │                     (index.ts)                            │  │
│  │                                                           │  │
│  │  for each repo:                                           │  │
│  │    1. Clone/pull from GitHub                              │  │
│  │    2. Scan codebase → build profile                       │  │
│  │    3. Analyze → find SEO issues                           │  │
│  │    4. ★ STRATEGIC PLANNING ★ → AI thinks about what to do │  │
│  │    5. Execute plan → prioritized fixes + content          │  │
│  │    6. Generate images → featured images                   │  │
│  │    7. Commit & push → direct to main                      │  │
│  │    8. Fetch analytics → store metrics                     │  │
│  │  Generate reports                                         │  │
│  │  Send emails                                              │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              │                                   │
│      ┌───────────────────────┼───────────────────────┐          │
│      ▼                       ▼                       ▼          │
│  ┌────────┐            ┌──────────┐            ┌────────┐      │
│  │   AI   │            │  GitHub  │            │ Google │      │
│  │ Client │            │  Client  │            │  APIs  │      │
│  │   +    │            └──────────┘            └────────┘      │
│  │Strategist│                │                       │          │
│  └────────┘                  ▼                       ▼          │
│      │                 ┌──────────┐            ┌────────┐      │
│      ▼                 │  GitHub  │            │ Search │      │
│  ┌────────┐            │   API    │            │Console │      │
│  │Anthropic│           └──────────┘            └────────┘      │
│  │  API   │                                                     │
│  └────────┘                                                     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Key Insight: The Strategic Planning Phase**

Instead of mechanically fixing the "top 10" issues, the SEO Strategist:
1. Analyzes the full context (profile, issues, metrics history, past change impacts)
2. **Thinks strategically** about what will have the most impact
3. Creates a prioritized action plan with reasoning
4. Explicitly skips low-value actions with explanation

This prevents:
- Changing too many things at once (hard to measure impact)
- Fixing low-priority issues while ignoring high-impact opportunities
- Making changes without understanding the site's current performance
- Generating content when technical SEO needs fixing first

---

## Directory Structure

```
/seo-agent
├── src/
│   ├── index.ts              # Main orchestrator (Architect)
│   │
│   ├── types/                # Shared types (Architect)
│   │   ├── index.ts
│   │   ├── config.ts
│   │   ├── codebase.ts
│   │   ├── seo.ts
│   │   ├── content.ts
│   │   └── analytics.ts
│   │
│   ├── config/               # Configuration (Backend)
│   │   ├── index.ts
│   │   └── loader.ts
│   │
│   ├── db/                   # Database (Backend)
│   │   ├── index.ts
│   │   ├── client.ts
│   │   └── schema.sql
│   │
│   ├── ai/                   # AI Client + Strategist (AI Engineer)
│   │   ├── index.ts
│   │   ├── client.ts
│   │   ├── prompts.ts
│   │   └── strategist.ts     # Strategic planning AI
│   │
│   ├── scanner/              # Codebase Scanner (SEO Engineer)
│   │   ├── index.ts
│   │   ├── detector.ts
│   │   ├── profiler.ts
│   │   ├── seo-analyzer.ts
│   │   └── frameworks/
│   │       ├── index.ts
│   │       ├── types.ts
│   │       ├── nextjs-app.ts
│   │       ├── nextjs-pages.ts
│   │       ├── astro.ts
│   │       └── html.ts
│   │
│   ├── optimizer/            # Optimizers (SEO + Content Engineers)
│   │   ├── index.ts
│   │   ├── meta.ts           # SEO Engineer
│   │   ├── schema.ts         # SEO Engineer
│   │   ├── sitemap.ts        # SEO Engineer
│   │   ├── robots.ts         # SEO Engineer
│   │   ├── internal-links.ts # SEO Engineer
│   │   ├── content.ts        # Content Engineer
│   │   └── images/           # Content Engineer
│   │       ├── index.ts
│   │       ├── replicate.ts
│   │       └── optimizer.ts
│   │
│   ├── github/               # GitHub Integration (Integrations)
│   │   ├── index.ts
│   │   ├── client.ts
│   │   ├── clone.ts
│   │   ├── commit.ts
│   │   └── push.ts
│   │
│   ├── analytics/            # Analytics (Integrations)
│   │   ├── index.ts
│   │   ├── search-console.ts
│   │   └── tracker.ts
│   │
│   └── reports/              # Reports (Integrations)
│       ├── index.ts
│       ├── daily.ts
│       ├── weekly.ts
│       └── email.ts
│
├── config/
│   └── repos.json            # Repository configurations
│
├── data/                     # Runtime data (Docker volume)
│   ├── repos/
│   ├── seo-agent.db
│   └── reports/
│
├── scripts/                  # Utility scripts (DevOps)
│   └── init-db.ts
│
├── tests/                    # Tests (QA)
│   └── ...
│
├── .ai-team/                 # AI Team files
│   ├── TEAM.md
│   ├── PROJECT_CONTEXT.md
│   ├── INTERFACES.md
│   ├── STATUS.md
│   └── agents/
│       ├── architect.md
│       ├── backend.md
│       ├── ai-engineer.md
│       ├── seo-engineer.md
│       ├── content-engineer.md
│       ├── integrations.md
│       ├── devops.md
│       └── qa.md
│
├── Dockerfile                # DevOps
├── docker-compose.yml        # DevOps
├── .env.example              # DevOps
├── package.json
├── tsconfig.json
├── PLAN.md
└── TODO.md
```

---

## Key Interfaces (Summary)

See `INTERFACES.md` for full type definitions. Key types:

```typescript
// Config
interface RepoConfig {
  id: string
  url: string
  branch: string
  domain: string
  settings: RepoSettings
  searchConsole?: { propertyUrl: string }
}

// Codebase
interface CodebaseProfile {
  framework: FrameworkType
  structure: { pagesDir, componentsDir, ... }
  seoPatterns: { metaHandling, existingSitemap, ... }
  pages: PageInfo[]
}

// SEO
interface SEOIssue {
  id: string
  type: SEOIssueType
  severity: 'critical' | 'warning' | 'info'
  file?: string
  autoFixable: boolean
}

interface CodeFix {
  file: string
  action: 'create' | 'modify' | 'delete'
  search?: string
  replace?: string
  content?: string
}

// Content
interface BlogPost {
  title: string
  slug: string
  content: string
  metaDescription: string
  featuredImage?: GeneratedImage
}

// Analytics
interface DailyMetrics {
  clicks: number
  impressions: number
  ctr: number
  position: number
  pages: PageMetrics[]
}
```

---

## Environment Variables

```bash
# AI
ANTHROPIC_API_KEY=sk-ant-...
AI_MODEL=claude-sonnet-4-20250514

# GitHub
GITHUB_TOKEN=ghp_...

# Images
IMAGE_PROVIDER=replicate
IMAGE_MODEL=flux-schnell
REPLICATE_API_TOKEN=r8_...
MAX_IMAGES_PER_DAY=5

# Google
GOOGLE_SERVICE_ACCOUNT_KEY={"type":"service_account",...}

# Email
RESEND_API_KEY=re_...
REPORT_EMAIL=you@example.com

# Data
DATA_DIR=/data
```

---

## Coding Standards

### TypeScript
- Strict mode enabled
- No `any` types (use `unknown` if needed)
- All functions have return types
- All public APIs have JSDoc comments

### Error Handling
- Use custom error classes
- Always log errors with context
- Graceful degradation (one repo failing doesn't stop others)

### Naming
- Files: `kebab-case.ts`
- Classes: `PascalCase`
- Functions/variables: `camelCase`
- Constants: `UPPER_SNAKE_CASE`
- Types/Interfaces: `PascalCase`

### Exports
- Use named exports (not default)
- Re-export from `index.ts` files
- Keep public API surface small

---

## Dependencies

```json
{
  "dependencies": {
    "better-sqlite3": "^11.0.0",
    "simple-git": "^3.24.0",
    "@octokit/rest": "^20.1.0",
    "googleapis": "^134.0.0",
    "replicate": "^0.30.0",
    "sharp": "^0.33.3",
    "resend": "^3.2.0",
    "glob": "^10.3.12",
    "dotenv": "^16.4.5"
  }
}
```

---

## What Success Looks Like

When complete, running `docker-compose up` should:

1. Load configuration from `config/repos.json`
2. For each repository:
   - Clone (or pull latest)
   - Detect framework
   - Find SEO issues
   - Fix auto-fixable issues
   - Generate blog post (if due)
   - Generate featured image
   - Commit all changes
   - Push to GitHub
   - Fetch Search Console data
3. Generate daily report
4. Send email summary
5. Exit cleanly

The whole process should take 5-15 minutes depending on number of repos.
