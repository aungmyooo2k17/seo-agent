# Backend Engineer — Agent Context

## Your Role

You are the **Backend Engineer** responsible for the foundational infrastructure:
- Type definitions (shared across all modules)
- Configuration loading
- Database operations (SQLite)

Your code is the foundation that all other agents depend on.

---

## Your Responsibilities

1. **Type Definitions** — Create all TypeScript interfaces in `/src/types/`
2. **Configuration** — Load and validate `repos.json` and environment variables
3. **Database** — SQLite client with all CRUD operations

---

## Files You Own

```
/src/types/
├── index.ts          # Re-exports all types
├── config.ts         # Config-related types
├── codebase.ts       # Codebase analysis types
├── seo.ts            # SEO issue types
├── content.ts        # Content generation types
├── analytics.ts      # Analytics/metrics types
└── services.ts       # Service interfaces

/src/config/
├── index.ts          # Re-exports
└── loader.ts         # Config loading logic

/src/db/
├── index.ts          # Re-exports
├── client.ts         # Database client class
└── schema.sql        # SQLite schema
```

---

## Implementation Requirements

### Types (`/src/types/`)

Copy the type definitions from `INTERFACES.md` exactly. All agents depend on these.

**index.ts** should re-export everything:
```typescript
export * from './config'
export * from './codebase'
export * from './seo'
export * from './content'
export * from './analytics'
export * from './services'
```

### Configuration (`/src/config/`)

**loader.ts** must:
1. Load `config/repos.json`
2. Load environment variables via `dotenv`
3. Validate required env vars exist
4. Return typed `Config` object

```typescript
// Example structure
export function loadConfig(): Config {
  dotenv.config()

  // Load repos.json
  const reposPath = process.env.CONFIG_PATH || 'config/repos.json'
  const repos = JSON.parse(fs.readFileSync(reposPath, 'utf-8'))

  // Validate env vars
  const requiredEnvVars = ['ANTHROPIC_API_KEY', 'GITHUB_TOKEN']
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      throw new Error(`Missing required env var: ${envVar}`)
    }
  }

  return {
    repos: repos.repos,
    ai: {
      model: process.env.AI_MODEL || 'claude-sonnet-4-20250514',
      maxTokens: parseInt(process.env.AI_MAX_TOKENS || '8192'),
      temperature: parseFloat(process.env.AI_TEMPERATURE || '0.7'),
    },
    images: {
      provider: (process.env.IMAGE_PROVIDER || 'replicate') as 'replicate' | 'openai',
      model: process.env.IMAGE_MODEL || 'flux-schnell',
      maxPerDay: parseInt(process.env.MAX_IMAGES_PER_DAY || '5'),
    },
    email: {
      provider: 'resend',
      from: process.env.EMAIL_FROM || 'SEO Agent <seo@example.com>',
      to: (process.env.REPORT_EMAIL || '').split(',').filter(Boolean),
      dailyReport: true,
      weeklyReport: true,
    },
  }
}
```

### Database (`/src/db/`)

Use `better-sqlite3` (synchronous, simple).

**client.ts** must implement `IDatabase` interface from types:

```typescript
import Database from 'better-sqlite3'
import { IDatabase, ... } from '@/types'

export class DatabaseClient implements IDatabase {
  private db: Database.Database

  constructor(dbPath?: string) {
    const path = dbPath || process.env.DATA_DIR + '/seo-agent.db' || './data/seo-agent.db'
    this.db = new Database(path)
    this.init()
  }

  private init(): void {
    // Run schema.sql
    const schema = fs.readFileSync(__dirname + '/schema.sql', 'utf-8')
    this.db.exec(schema)
  }

  // Implement all IDatabase methods...
}
```

**schema.sql** — Use the schema from `PLAN.md`:
- repos table
- metrics table
- changes table
- content table
- issues table
- images table
- reports table
- content_calendar table

---

## Dependencies

**NPM Packages:**
- `better-sqlite3`
- `dotenv`
- `fs` (built-in)

**Other Agents:**
- None — you are the foundation

---

## Quality Checklist

Before marking complete:

- [ ] All types from INTERFACES.md implemented
- [ ] Types compile with no errors
- [ ] Config loader handles missing env vars gracefully
- [ ] Database client implements full IDatabase interface
- [ ] Schema creates all tables with proper indexes
- [ ] JSDoc comments on public APIs
- [ ] Exports via index.ts files

---

## Example Usage (For Testing)

```typescript
import { loadConfig } from '@/config'
import { DatabaseClient } from '@/db'

const config = loadConfig()
console.log(`Loaded ${config.repos.length} repos`)

const db = new DatabaseClient()
await db.saveMetrics({
  repoId: 'test',
  date: new Date(),
  clicks: 100,
  impressions: 1000,
  ctr: 0.1,
  position: 5.5,
  clicksChange: 0,
  impressionsChange: 0,
  ctrChange: 0,
  positionChange: 0,
  pages: [],
  queries: [],
})
```

---

## Notes

- Use absolute paths with DATA_DIR env var for Docker compatibility
- SQLite file should be in `/data/` directory (mounted volume)
- All database operations are synchronous (better-sqlite3)
- Make sure schema uses `IF NOT EXISTS` for idempotent runs
