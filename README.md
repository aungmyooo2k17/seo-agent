# SEO Agent

An autonomous SEO optimization agent that analyzes codebases, fixes SEO issues, generates content, and pushes changes directly to your repositories.

## What It Does

SEO Agent runs daily in a Docker container and automatically:

1. **Scans your repositories** - Detects framework (Next.js, Astro, HTML, etc.) and builds a codebase profile
2. **Identifies SEO issues** - Missing meta tags, duplicate titles, missing sitemaps, alt text, thin content, and more
3. **Fixes issues automatically** - Generates and applies code fixes using AI
4. **Creates blog content** - Writes SEO-optimized articles with featured images
5. **Commits and pushes** - Changes go directly to your repositories (no approval needed)
6. **Tracks performance** - Fetches Google Search Console data
7. **Sends reports** - Daily/weekly email summaries of changes and metrics

## Features

- **Multi-framework support** - Next.js (App/Pages Router), Astro, Nuxt, Gatsby, Remix, SvelteKit, plain HTML
- **AI-powered analysis** - Uses Claude to understand code and generate fixes
- **Image generation** - Creates featured images via Replicate (Flux)
- **Full automation** - No manual approval required
- **Multi-tenant** - Manage multiple repositories from one instance
- **Impact tracking** - Measures SEO improvements over time

## Quick Start

### 1. Clone and Install

```bash
git clone <your-repo>
cd seo-agent
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your API keys:

```bash
# Required
ANTHROPIC_API_KEY=sk-ant-...
GITHUB_TOKEN=ghp_...

# Optional - for image generation
REPLICATE_API_TOKEN=r8_...

# Optional - for analytics
GOOGLE_SERVICE_ACCOUNT_KEY={"type":"service_account",...}

# Optional - for email reports
RESEND_API_KEY=re_...
REPORT_EMAIL=you@example.com
```

### 3. Add Repositories

Create `config/repos.json`:

```json
{
  "repos": [
    {
      "id": "my-site",
      "url": "git@github.com:username/my-site.git",
      "branch": "main",
      "domain": "https://mysite.com",
      "settings": {
        "contentFrequency": "weekly",
        "tone": "professional",
        "topics": ["web development", "tutorials"],
        "maxBlogsPerWeek": 2,
        "maxImagesPerDay": 5,
        "excludePaths": ["/admin", "/api"]
      },
      "searchConsole": {
        "propertyUrl": "https://mysite.com"
      }
    }
  ]
}
```

### 4. Run

```bash
# Initialize database
npm run init-db

# Run once
npm start

# Or with Docker
docker-compose up --build
```

## Configuration

### Repository Settings

| Setting | Type | Description |
|---------|------|-------------|
| `contentFrequency` | `daily` \| `weekly` \| `biweekly` \| `monthly` | How often to generate blog posts |
| `tone` | `professional` \| `casual` \| `technical` \| `friendly` | Writing style for content |
| `topics` | `string[]` | Topics to write about |
| `maxBlogsPerWeek` | `number` | Maximum blog posts per week |
| `maxImagesPerDay` | `number` | Maximum images to generate per day |
| `excludePaths` | `string[]` | Paths to ignore during scanning |
| `customInstructions` | `string` | Additional instructions for AI |

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | Yes | Claude API key |
| `GITHUB_TOKEN` | Yes | GitHub personal access token with repo scope |
| `AI_MODEL` | No | Model to use (default: `claude-sonnet-4-20250514`) |
| `REPLICATE_API_TOKEN` | No | For image generation |
| `IMAGE_MODEL` | No | `flux-schnell` (fast) or `flux-pro` (quality) |
| `MAX_IMAGES_PER_DAY` | No | Daily image limit (default: 5) |
| `GOOGLE_SERVICE_ACCOUNT_KEY` | No | JSON credentials for Search Console |
| `RESEND_API_KEY` | No | For email reports |
| `REPORT_EMAIL` | No | Comma-separated recipient emails |

## SEO Issues Detected

### Technical SEO
- Missing or duplicate meta titles
- Missing or duplicate meta descriptions
- Title too long (>60 characters)
- Description too long (>155 characters)
- Missing Open Graph tags
- Missing Twitter cards
- Missing canonical URLs
- Missing sitemap.xml
- Missing robots.txt
- Missing structured data (JSON-LD)

### Content SEO
- Missing H1 tags
- Multiple H1 tags
- Thin content (<300 words)
- Missing image alt text
- Broken internal links

### Site Structure
- Orphan pages (no internal links pointing to them)
- Deep pages (>3 clicks from homepage)
- Missing breadcrumbs

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     DOCKER CONTAINER                         │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                    ORCHESTRATOR                         │ │
│  │                                                         │ │
│  │  for each repo:                                         │ │
│  │    1. Clone/pull from GitHub                            │ │
│  │    2. Detect framework, build profile                   │ │
│  │    3. Analyze SEO issues                                │ │
│  │    4. Fix auto-fixable issues                           │ │
│  │    5. Generate blog post (if due)                       │ │
│  │    6. Commit & push changes                             │ │
│  │    7. Fetch Search Console metrics                      │ │
│  │  Generate and send reports                              │ │
│  └────────────────────────────────────────────────────────┘ │
│                              │                               │
│      ┌───────────────────────┼───────────────────────┐      │
│      ▼                       ▼                       ▼      │
│  ┌────────┐            ┌──────────┐            ┌────────┐  │
│  │Claude  │            │  GitHub  │            │ Google │  │
│  │  API   │            │   API    │            │  APIs  │  │
│  └────────┘            └──────────┘            └────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Project Structure

```
seo-agent/
├── src/
│   ├── index.ts              # Main orchestrator
│   ├── types/                # TypeScript interfaces
│   ├── config/               # Configuration loader
│   ├── db/                   # SQLite database
│   ├── ai/                   # Claude API client
│   ├── scanner/              # Framework detection & analysis
│   │   └── frameworks/       # Framework-specific handlers
│   ├── optimizer/            # SEO optimizers
│   │   └── images/           # Image generation
│   ├── github/               # Git operations
│   ├── analytics/            # Search Console integration
│   └── reports/              # Report generation & email
├── config/
│   └── repos.json            # Repository configurations
├── data/                     # Runtime data (Docker volume)
│   ├── repos/                # Cloned repositories
│   ├── seo-agent.db          # SQLite database
│   └── reports/              # Generated reports
├── tests/                    # Test suites
├── Dockerfile
├── docker-compose.yml
└── package.json
```

## Scheduling

### Option 1: Cron

```bash
# Run daily at 2 AM
0 2 * * * /path/to/seo-agent/scripts/run.sh
```

### Option 2: Systemd Timer

```bash
sudo systemctl enable seo-agent.timer
sudo systemctl start seo-agent.timer
```

## Development

```bash
# Install dependencies
npm install

# Type check
npm run typecheck

# Run tests
npm test

# Run with coverage
npm run test:coverage

# Build
npm run build

# Run locally
npm run dev
```

## Testing

```bash
# Unit tests (no API calls)
npm run test:unit

# Integration tests (requires API keys)
npm run test:integration

# E2E tests (full workflow)
E2E_TEST=true npm run test:e2e
```

## How It Works

### Framework Detection

SEO Agent automatically detects your framework by analyzing:
- `package.json` dependencies
- Configuration files (`next.config.js`, `astro.config.mjs`, etc.)
- Directory structure (`app/`, `pages/`, `src/pages/`)

### SEO Analysis

Combines rule-based checks (fast, deterministic) with AI analysis (deep, contextual):

1. **Rule-based**: Missing titles, duplicate content, length checks
2. **AI-powered**: Content quality, keyword optimization, semantic issues

### Code Generation

Fixes are generated using Claude with framework-specific knowledge:
- Next.js App Router: `metadata` exports, `MetadataRoute` types
- Next.js Pages: `next/head` components
- Astro: Frontmatter and `<head>` slots
- HTML: Direct tag insertion

### Content Generation

Blog posts are generated with:
- SEO-optimized titles (<60 chars)
- Meta descriptions (<155 chars)
- Proper heading hierarchy
- Target keyword integration (2-3% density)
- Internal link placeholders
- Featured images via AI

## Supported Frameworks

| Framework | Detection | Meta Handling | Sitemap | Blog Format |
|-----------|-----------|---------------|---------|-------------|
| Next.js App Router | `next` + `app/layout` | `metadata` export | `app/sitemap.ts` | MDX in `app/blog/` |
| Next.js Pages | `next` + `pages/` | `next/head` | `public/sitemap.xml` | MDX in `pages/blog/` |
| Astro | `astro` | Frontmatter | `@astrojs/sitemap` | `src/content/blog/` |
| Nuxt | `nuxt` | `useHead()` | `@nuxtjs/sitemap` | `content/blog/` |
| HTML | `index.html` | `<meta>` tags | `sitemap.xml` | `blog/*.html` |

## Troubleshooting

### "ANTHROPIC_API_KEY is required"

Set your API key in `.env`:
```bash
ANTHROPIC_API_KEY=sk-ant-api03-...
```

### "Could not clone repository"

Ensure your GitHub token has `repo` scope and SSH keys are configured:
```bash
ssh -T git@github.com
```

### "Search Console disabled"

The `GOOGLE_SERVICE_ACCOUNT_KEY` is optional. Without it, analytics features are skipped.

### Tests failing

Run with verbose output:
```bash
npm test -- --verbose
```

## License

MIT

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests: `npm test`
5. Submit a pull request
