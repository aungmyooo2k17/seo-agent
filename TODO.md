# SEO Agent — Build Checklist

## Phase 1: Foundation (Days 1-2)

### Project Setup
- [ ] `npm init -y`
- [ ] Install TypeScript: `npm i -D typescript @types/node ts-node`
- [ ] Create `tsconfig.json`
- [ ] Install ESLint + Prettier
- [ ] Create `.gitignore`
- [ ] Create `Dockerfile`
- [ ] Create `docker-compose.yml`
- [ ] Create `.env.example`

### Core Infrastructure
- [ ] Create `/src/config/index.ts` — Config loader
- [ ] Create `/src/config/types.ts` — Type definitions
- [ ] Create `/src/db/index.ts` — SQLite client (better-sqlite3)
- [ ] Create `/src/db/schema.sql` — Database schema
- [ ] Create `/src/types/` — All TypeScript interfaces

### AI Client
- [ ] Create `/src/ai/client.ts` — Anthropic direct SDK
- [ ] Create `/src/ai/prompts.ts` — System prompts
- [ ] Test basic chat completion
- [ ] Implement tool-use loop (if needed)

---

## Phase 2: GitHub Integration (Days 3-4)

### GitHub Client
- [ ] Install: `npm i simple-git @octokit/rest`
- [ ] Create `/src/github/client.ts` — Main GitHub client
- [ ] Create `/src/github/clone.ts` — Clone/pull logic
- [ ] Create `/src/github/commit.ts` — Commit logic
- [ ] Create `/src/github/push.ts` — Push logic

### Testing
- [ ] Test clone public repo
- [ ] Test clone private repo (SSH)
- [ ] Test pull latest
- [ ] Test commit changes
- [ ] Test push to remote

---

## Phase 3: Codebase Scanner (Days 5-7)

### Framework Detection
- [ ] Create `/src/scanner/detector.ts`
- [ ] Detect Next.js App Router
- [ ] Detect Next.js Pages Router
- [ ] Detect Astro
- [ ] Detect Nuxt
- [ ] Detect plain HTML
- [ ] Handle unknown frameworks

### Framework Handlers
- [ ] Create `/src/scanner/frameworks/types.ts` — Interface
- [ ] Create `/src/scanner/frameworks/nextjs-app.ts`
- [ ] Create `/src/scanner/frameworks/nextjs-pages.ts`
- [ ] Create `/src/scanner/frameworks/astro.ts`
- [ ] Create `/src/scanner/frameworks/html.ts`

### Codebase Profiler
- [ ] Create `/src/scanner/profiler.ts`
- [ ] Map directory structure
- [ ] Extract page information
- [ ] Detect meta handling patterns
- [ ] Identify safe/danger zones

### SEO Analyzer
- [ ] Create `/src/scanner/seo-analyzer.ts`
- [ ] Detect missing meta titles
- [ ] Detect missing meta descriptions
- [ ] Detect duplicate titles/descriptions
- [ ] Detect missing OG tags
- [ ] Detect missing sitemap
- [ ] Detect missing robots.txt
- [ ] Detect missing schema
- [ ] Detect missing alt text
- [ ] Detect thin content

---

## Phase 4: Optimizers (Days 8-11)

### Meta Tag Optimizer
- [ ] Create `/src/optimizer/meta.ts`
- [ ] Generate compelling titles (AI)
- [ ] Generate compelling descriptions (AI)
- [ ] Generate framework-specific code
- [ ] Apply changes to files

### Schema.org Builder
- [ ] Create `/src/optimizer/schema.ts`
- [ ] Generate Organization schema
- [ ] Generate WebSite schema
- [ ] Generate BlogPosting schema
- [ ] Generate FAQ schema
- [ ] Generate Product schema
- [ ] Insert into pages correctly

### Sitemap Generator
- [ ] Create `/src/optimizer/sitemap.ts`
- [ ] Extract all pages
- [ ] Calculate priorities
- [ ] Generate framework-specific sitemap

### Robots.txt Generator
- [ ] Create `/src/optimizer/robots.ts`
- [ ] Generate appropriate robots.txt
- [ ] Include sitemap reference

### Content Generator
- [ ] Create `/src/optimizer/content.ts`
- [ ] Topic research (AI)
- [ ] Blog post generation (AI)
- [ ] Frontmatter generation
- [ ] Determine correct file path
- [ ] Handle MDX vs MD vs TSX

### Internal Links Optimizer
- [ ] Create `/src/optimizer/internal-links.ts`
- [ ] Find link opportunities (AI)
- [ ] Detect orphan pages
- [ ] Suggest link additions

---

## Phase 5: Image Generation (Days 12-13)

### Image Service
- [ ] Install: `npm i replicate sharp`
- [ ] Create `/src/optimizer/images/index.ts`
- [ ] Implement Replicate provider (Flux)
- [ ] Implement OpenAI provider (DALL-E) — optional
- [ ] Generate image prompts (AI)
- [ ] Download and optimize images (Sharp)
- [ ] Generate alt text (AI)
- [ ] Save to correct location

### Budget Control
- [ ] Create `/src/optimizer/images/budget.ts`
- [ ] Track daily usage per repo
- [ ] Enforce limits
- [ ] Log costs

---

## Phase 6: Analytics (Days 14-15)

### Google Search Console
- [ ] Install: `npm i googleapis`
- [ ] Create `/src/analytics/search-console.ts`
- [ ] Implement service account auth
- [ ] Fetch daily metrics
- [ ] Fetch per-page metrics
- [ ] Fetch query metrics
- [ ] Handle rate limits

### Impact Tracker
- [ ] Create `/src/analytics/tracker.ts`
- [ ] Correlate changes to metrics
- [ ] Calculate before/after impact
- [ ] Store impact measurements

### Metrics Store
- [ ] Create `/src/analytics/metrics-store.ts`
- [ ] Save daily metrics to DB
- [ ] Calculate 7-day averages
- [ ] Calculate deltas

---

## Phase 7: Reporting (Days 16-17)

### Daily Report
- [ ] Create `/src/reports/daily.ts`
- [ ] Aggregate metrics across repos
- [ ] List changes made
- [ ] List top growing pages
- [ ] List next actions
- [ ] Format as HTML

### Weekly Report
- [ ] Create `/src/reports/weekly.ts`
- [ ] Aggregate weekly metrics
- [ ] Show trends
- [ ] Highlight biggest wins
- [ ] Show impact correlations

### Email Sender
- [ ] Install: `npm i resend`
- [ ] Create `/src/reports/email.ts`
- [ ] Implement Resend integration
- [ ] Send daily reports
- [ ] Send weekly reports
- [ ] Handle failures gracefully

---

## Phase 8: Main Orchestrator (Day 18)

### Entry Point
- [ ] Create `/src/index.ts`
- [ ] Load configuration
- [ ] Initialize all services
- [ ] Process each repository:
  - [ ] Clone/pull
  - [ ] Scan (if needed)
  - [ ] Analyze
  - [ ] Fix issues
  - [ ] Generate content (if due)
  - [ ] Generate images (if needed)
  - [ ] Commit and push
  - [ ] Fetch analytics
- [ ] Generate reports
- [ ] Send emails
- [ ] Handle errors gracefully
- [ ] Log everything

---

## Phase 9: Testing & Polish (Days 19-20)

### Testing
- [ ] Test with Next.js App Router repo
- [ ] Test with Next.js Pages Router repo
- [ ] Test with Astro repo
- [ ] Test with plain HTML repo
- [ ] Test image generation
- [ ] Test Search Console integration
- [ ] Test email delivery
- [ ] Test full daily run

### Error Handling
- [ ] Graceful failures per repo
- [ ] Retry logic for API calls
- [ ] Proper error logging
- [ ] Alert on critical failures

### Documentation
- [ ] Update README.md
- [ ] Document configuration options
- [ ] Document environment variables
- [ ] Add troubleshooting guide

### Docker
- [ ] Optimize image size
- [ ] Test container build
- [ ] Test container run
- [ ] Test cron scheduling

---

## Post-Launch

### Monitoring
- [ ] Set up log aggregation
- [ ] Monitor daily runs
- [ ] Track costs
- [ ] Review impact metrics

### Iteration
- [ ] Review what's working
- [ ] Adjust prompts based on quality
- [ ] Add more framework support
- [ ] Improve content quality

---

## Dependencies Summary

```json
{
  "dependencies": {
    "better-sqlite3": "^9.0.0",
    "simple-git": "^3.20.0",
    "@octokit/rest": "^20.0.0",
    "googleapis": "^130.0.0",
    "replicate": "^0.25.0",
    "sharp": "^0.33.0",
    "resend": "^2.0.0",
    "glob": "^10.0.0",
    "dotenv": "^16.0.0"
  },
  "devDependencies": {
    "typescript": "^5.3.0",
    "@types/node": "^20.0.0",
    "@types/better-sqlite3": "^7.6.0",
    "ts-node": "^10.9.0",
    "eslint": "^8.0.0",
    "@typescript-eslint/eslint-plugin": "^6.0.0",
    "@typescript-eslint/parser": "^6.0.0",
    "prettier": "^3.0.0"
  }
}
```

---

## Quick Start Commands

```bash
# Initialize project
npm init -y
npm i typescript @types/node ts-node -D
npx tsc --init

# Install core dependencies
npm i better-sqlite3 simple-git @octokit/rest dotenv glob

# Install AI/Image dependencies
npm i replicate sharp

# Install analytics/reporting
npm i googleapis resend

# Install types
npm i @types/better-sqlite3 -D

# Build
npm run build

# Run locally
npm start

# Docker build
docker build -t seo-agent .

# Docker run
docker-compose up
```
