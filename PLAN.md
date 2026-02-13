# Autonomous SEO Agent — Complete Plan

> An AI agent that autonomously optimizes websites for SEO by analyzing codebases, making code changes, generating content, creating images, and tracking growth — all without human intervention.

---

## Table of Contents

1. [Overview](#overview)
2. [Core Requirements](#core-requirements)
3. [System Architecture](#system-architecture)
4. [Data Models](#data-models)
5. [AI Integration](#ai-integration)
6. [GitHub Integration](#github-integration)
7. [Codebase Intelligence](#codebase-intelligence)
8. [Optimization Modules](#optimization-modules)
9. [Image Generation](#image-generation)
10. [Analytics & Tracking](#analytics--tracking)
11. [Reporting System](#reporting-system)
12. [Docker Setup](#docker-setup)
13. [Configuration](#configuration)
14. [Database Schema](#database-schema)
15. [File Structure](#file-structure)
16. [API Reference](#api-reference)
17. [Build Phases](#build-phases)
18. [Cost Estimation](#cost-estimation)

---

## Overview

### What This Is

A **fully autonomous SEO optimization system** that:

1. Connects to user's GitHub repositories
2. Scans and understands the codebase (framework, structure, patterns)
3. Identifies SEO issues and opportunities
4. Makes code changes directly (meta tags, schema, sitemap, etc.)
5. Generates and publishes blog content
6. Creates images (featured, OG, illustrations)
7. Commits and pushes changes automatically
8. Tracks performance via Google Search Console
9. Sends daily/weekly reports with growth metrics
10. Learns and iterates based on what works

### What This Is NOT

- A recommendation tool (it takes action)
- A hosted SaaS with user dashboard (it's a Docker container)
- A deployment tool (user handles their own hosting)

---

## Core Requirements

| Requirement | Decision |
|-------------|----------|
| User approval for changes | **NO** — Always auto-merge, direct push |
| Content review before publish | **NO** — Always publish directly |
| Multiple repositories | **YES** — Multi-repo by design |
| Hosting/deployment | **USER HANDLES** — We only modify code |
| Runtime environment | **Docker container** — Runs daily via cron |
| AI provider | **Anthropic Claude** — Via existing RoadRunner pattern |
| Image generation | **YES** — Replicate (Flux) or DALL-E |

---

## System Architecture

### High-Level Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        DOCKER CONTAINER                              │
│                     (Runs daily via cron)                            │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                      ORCHESTRATOR                               │ │
│  │                       (index.ts)                                │ │
│  │                                                                 │ │
│  │  1. Load configuration                                          │ │
│  │  2. For each repository:                                        │ │
│  │     ├── Clone/pull latest from GitHub                          │ │
│  │     ├── Scan codebase (first run or on changes)                │ │
│  │     ├── Analyze SEO issues                                      │ │
│  │     ├── Generate & apply fixes (AI)                            │ │
│  │     ├── Generate content if due (AI)                           │ │
│  │     ├── Generate images if needed (Flux/DALL-E)                │ │
│  │     ├── Commit & push to main                                  │ │
│  │     └── Fetch analytics from Search Console                    │ │
│  │  3. Store metrics in database                                   │ │
│  │  4. Generate daily/weekly reports                               │ │
│  │  5. Send email summaries                                        │ │
│  │  6. Exit                                                        │ │
│  │                                                                 │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                              │                                       │
│          ┌───────────────────┼───────────────────┐                  │
│          ▼                   ▼                   ▼                  │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐            │
│  │  AI ENGINE   │   │    IMAGE     │   │   DATABASE   │            │
│  │              │   │   SERVICE    │   │              │            │
│  │ • Anthropic  │   │              │   │ • SQLite     │            │
│  │   Claude API │   │ • Replicate  │   │ • Metrics    │            │
│  │ • Tool loop  │   │   (Flux)     │   │ • Changes    │            │
│  │ • Prompts    │   │ • Sharp      │   │ • Content    │            │
│  │              │   │   optimize   │   │ • Profiles   │            │
│  └──────────────┘   └──────────────┘   └──────────────┘            │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
          │                   │                   │
          ▼                   ▼                   ▼
     ┌─────────┐        ┌───────────┐       ┌───────────┐
     │ GitHub  │        │ Anthropic │       │  Google   │
     │   API   │        │    API    │       │  Search   │
     │         │        │           │       │  Console  │
     │ • Clone │        │ • Claude  │       │           │
     │ • Push  │        │   Sonnet/ │       │ • Clicks  │
     │         │        │   Opus    │       │ • Impress │
     └─────────┘        └───────────┘       │ • CTR     │
                                            └───────────┘
```

### Component Interaction Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Config    │────▶│ Orchestrator│────▶│   GitHub    │
│   Loader    │     │             │     │   Clone     │
└─────────────┘     └──────┬──────┘     └──────┬──────┘
                           │                   │
                           ▼                   ▼
                    ┌─────────────┐     ┌─────────────┐
                    │  Codebase   │◀────│   Local     │
                    │  Scanner    │     │   Repo      │
                    └──────┬──────┘     └─────────────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
       ┌───────────┐ ┌───────────┐ ┌───────────┐
       │ Technical │ │  Content  │ │   Image   │
       │ Optimizer │ │ Generator │ │ Generator │
       └─────┬─────┘ └─────┬─────┘ └─────┬─────┘
             │             │             │
             └─────────────┼─────────────┘
                           ▼
                    ┌─────────────┐
                    │   Commit    │
                    │   & Push    │
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
       ┌───────────┐ ┌───────────┐ ┌───────────┐
       │ Analytics │ │  Database │ │  Reports  │
       │  Fetcher  │ │   Store   │ │  & Email  │
       └───────────┘ └───────────┘ └───────────┘
```

---

## Data Models

### TypeScript Interfaces

```typescript
// ============================================
// CONFIGURATION
// ============================================

interface Config {
  repos: RepoConfig[]
  ai: AIConfig
  images: ImageConfig
  email: EmailConfig
}

interface RepoConfig {
  id: string                    // Unique identifier
  url: string                   // git@github.com:user/repo.git
  branch: string                // main, master, etc.
  domain: string                // example.com (for analytics)
  settings: RepoSettings
  searchConsole?: SearchConsoleConfig
}

interface RepoSettings {
  contentFrequency: 'daily' | 'weekly' | 'biweekly' | 'monthly'
  tone: 'professional' | 'casual' | 'technical' | 'friendly'
  topics: string[]              // Focus areas for content
  maxBlogsPerWeek: number       // Cost/volume control
  maxImagesPerDay: number       // Cost control
  excludePaths: string[]        // Don't modify these
  customInstructions?: string   // Site-specific AI guidance
}

interface SearchConsoleConfig {
  propertyUrl: string           // https://example.com or sc-domain:example.com
  // Credentials via env var: GOOGLE_SERVICE_ACCOUNT_KEY
}

interface AIConfig {
  model: string                 // claude-sonnet-4-20250514
  maxTokens: number             // 8192
  temperature: number           // 0.7 for content, 0.3 for code
}

interface ImageConfig {
  provider: 'replicate' | 'openai' | 'stability'
  model: string                 // flux-schnell, flux-pro, dall-e-3
  maxPerDay: number             // Global daily limit
}

interface EmailConfig {
  provider: 'resend' | 'smtp'
  from: string
  to: string[]
  dailyReport: boolean
  weeklyReport: boolean
}

// ============================================
// CODEBASE ANALYSIS
// ============================================

interface CodebaseProfile {
  repoId: string
  scannedAt: Date
  commitHash: string            // Track changes

  framework: FrameworkType
  frameworkVersion?: string

  structure: {
    pagesDir: string            // src/app, pages, src/pages
    componentsDir: string
    publicDir: string           // public, static
    contentDir?: string         // For MDX/content collections
    layoutFiles: string[]
    configFiles: string[]
  }

  seoPatterns: {
    metaHandling: MetaHandlingType
    existingSitemap: string | null
    existingRobots: string | null
    existingSchema: SchemaType[]
    hasOgImages: boolean
    hasFavicon: boolean
  }

  buildSystem: {
    packageManager: 'npm' | 'yarn' | 'pnpm' | 'bun'
    buildCommand: string
    devCommand: string
    outDir: string
  }

  pages: PageInfo[]

  safeZones: string[]           // OK to modify
  dangerZones: string[]         // Need caution
}

type FrameworkType =
  | 'nextjs-app'        // Next.js 13+ App Router
  | 'nextjs-pages'      // Next.js Pages Router
  | 'astro'
  | 'nuxt'
  | 'gatsby'
  | 'remix'
  | 'sveltekit'
  | 'vite-react'
  | 'vite-vue'
  | 'html'              // Plain HTML
  | 'unknown'

type MetaHandlingType =
  | 'metadata-export'   // Next.js App Router
  | 'next-head'         // Next.js Pages Router
  | 'astro-head'        // Astro <head>
  | 'nuxt-usehead'      // Nuxt useHead()
  | 'react-helmet'      // React Helmet
  | 'direct-html'       // Plain <head> tags
  | 'unknown'

interface PageInfo {
  path: string                  // /about, /blog/post-1
  filePath: string              // src/app/about/page.tsx
  title?: string
  description?: string
  hasOgImage: boolean
  hasSchema: boolean
  images: ImageInfo[]
  internalLinks: string[]
  wordCount: number
  lastModified: Date
}

interface ImageInfo {
  src: string
  alt: string | null
  isLocal: boolean
  dimensions?: { width: number; height: number }
}

// ============================================
// SEO ANALYSIS
// ============================================

interface SEOIssue {
  id: string
  type: SEOIssueType
  severity: 'critical' | 'warning' | 'info'
  page?: string                 // Affected page
  file?: string                 // File to modify
  description: string
  recommendation: string
  autoFixable: boolean
}

type SEOIssueType =
  // Technical
  | 'missing-meta-title'
  | 'missing-meta-description'
  | 'duplicate-title'
  | 'duplicate-description'
  | 'title-too-long'
  | 'description-too-long'
  | 'missing-canonical'
  | 'missing-og-tags'
  | 'missing-og-image'
  | 'missing-twitter-tags'
  | 'missing-sitemap'
  | 'missing-robots'
  | 'missing-schema'
  | 'broken-internal-link'
  // Content
  | 'missing-h1'
  | 'multiple-h1'
  | 'thin-content'
  | 'missing-alt-text'
  | 'keyword-missing'
  // Structure
  | 'orphan-page'
  | 'deep-page'               // Too many clicks from home
  | 'missing-breadcrumbs'

interface CodeFix {
  issueId: string
  file: string
  action: 'create' | 'modify' | 'delete'
  content?: string              // For create
  search?: string               // For modify (find)
  replace?: string              // For modify (replace with)
  description: string           // For commit message
}

// ============================================
// CONTENT
// ============================================

interface BlogPost {
  id: string
  repoId: string

  // Content
  title: string
  slug: string
  content: string               // Markdown
  excerpt: string

  // SEO
  targetKeyword: string
  secondaryKeywords: string[]
  metaDescription: string

  // Media
  featuredImage?: GeneratedImage

  // Metadata
  author: string                // "SEO Agent" or configured
  publishedAt: Date

  // Frontmatter (for static site generators)
  frontmatter: Record<string, any>

  // File output
  filePath: string              // Where to save
  format: 'mdx' | 'md' | 'html'
}

interface ContentCalendar {
  repoId: string
  scheduledPosts: ScheduledPost[]
}

interface ScheduledPost {
  topic: string
  targetKeyword: string
  scheduledFor: Date
  status: 'scheduled' | 'generated' | 'published'
}

// ============================================
// IMAGES
// ============================================

interface GeneratedImage {
  buffer: Buffer
  filename: string
  altText: string
  prompt: string                // What was used to generate
  provider: string
  model: string
  dimensions: { width: number; height: number }
  sizeBytes: number
}

interface ImageOpportunity {
  type: 'featured' | 'og' | 'alt-text' | 'hero'
  page: string
  image?: string                // For alt-text fixes
  priority: 'high' | 'medium' | 'low'
  reason: string
}

// ============================================
// ANALYTICS
// ============================================

interface DailyMetrics {
  repoId: string
  date: Date

  // Aggregate
  clicks: number
  impressions: number
  ctr: number                   // Click-through rate
  position: number              // Average position

  // Deltas
  clicksChange: number          // vs 7-day average
  impressionsChange: number
  ctrChange: number
  positionChange: number

  // Per-page breakdown
  pages: PageMetrics[]

  // Top queries
  queries: QueryMetrics[]
}

interface PageMetrics {
  page: string
  clicks: number
  impressions: number
  ctr: number
  position: number
}

interface QueryMetrics {
  query: string
  clicks: number
  impressions: number
  ctr: number
  position: number
}

// ============================================
// CHANGES & HISTORY
// ============================================

interface Change {
  id: string
  repoId: string
  timestamp: Date

  type: ChangeType
  file: string
  description: string

  commitSha: string

  // Impact tracking
  affectedPages: string[]
  expectedImpact: string
  measuredImpact?: {
    clicksBefore: number
    clicksAfter: number
    measurementPeriod: number   // Days
  }
}

type ChangeType =
  | 'meta-title'
  | 'meta-description'
  | 'og-tags'
  | 'schema'
  | 'sitemap'
  | 'robots'
  | 'blog-published'
  | 'image-added'
  | 'alt-text'
  | 'internal-link'
  | 'content-update'

// ============================================
// REPORTS
// ============================================

interface DailyReport {
  date: Date
  repos: RepoReport[]
  totalClicks: number
  totalImpressions: number
  changesAcrossRepos: number
}

interface RepoReport {
  repoId: string
  domain: string

  metrics: {
    clicks: number
    clicksChange: number
    impressions: number
    impressionsChange: number
    ctr: number
    ctrChange: number
    position: number
    positionChange: number
  }

  changes: Change[]

  topGrowingPages: {
    page: string
    clicks: number
    change: number
  }[]

  issuesFixed: number
  contentPublished: number
  imagesGenerated: number

  nextActions: string[]
}

interface WeeklyReport extends DailyReport {
  weekNumber: number

  // Weekly aggregates
  totalChanges: number
  totalBlogsPublished: number
  newKeywordsRanking: number
  keywordsImproved: number

  // Trends
  clicksTrend: number[]         // Daily for the week
  impressionsTrend: number[]

  // Top wins
  biggestWins: {
    type: string
    description: string
    impact: string
  }[]
}
```

---

## AI Integration

### Overview

Uses the same pattern as RoadRunner AI Proxy:
- Direct HTTP calls to Anthropic API
- OAuth token or API key authentication
- Automatic tool-use loop (max 10 iterations)

### AI Client Implementation

```typescript
// src/ai/client.ts

const API_URL = 'https://api.anthropic.com/v1/messages'
const MAX_ITERATIONS = 10

interface Message {
  role: 'user' | 'assistant'
  content: string | ContentBlock[]
}

interface ContentBlock {
  type: 'text' | 'tool_use' | 'tool_result'
  text?: string
  id?: string
  name?: string
  input?: Record<string, any>
  tool_use_id?: string
  content?: string
}

export class AnthropicClient {
  private apiKey: string
  private model: string
  private maxTokens: number

  constructor(config?: Partial<AIConfig>) {
    this.apiKey = process.env.ANTHROPIC_API_KEY || ''
    this.model = config?.model || process.env.AI_MODEL || 'claude-sonnet-4-20250514'
    this.maxTokens = config?.maxTokens || 8192
  }

  async chat(
    systemPrompt: string,
    messages: Message[],
    options?: {
      tools?: Tool[]
      temperature?: number
    }
  ): Promise<string> {
    let currentMessages = [...messages]

    for (let i = 0; i < MAX_ITERATIONS; i++) {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: this.maxTokens,
          system: systemPrompt,
          messages: currentMessages,
          tools: options?.tools,
          temperature: options?.temperature ?? 0.7,
        }),
      })

      if (!response.ok) {
        const error = await response.text()
        throw new Error(`Anthropic API error: ${response.status} ${error}`)
      }

      const data = await response.json()

      // Check for tool use
      const toolUseBlocks = data.content.filter(
        (b: ContentBlock) => b.type === 'tool_use'
      )

      if (toolUseBlocks.length === 0 || data.stop_reason === 'end_turn') {
        // Extract text response
        return data.content
          .filter((b: ContentBlock) => b.type === 'text')
          .map((b: ContentBlock) => b.text)
          .join('')
      }

      // If we had tools, we'd handle them here
      // For SEO agent, we primarily use direct prompts
      // Tool use would be for things like:
      // - Reading specific files
      // - Executing searches
      // - Validating changes

      currentMessages.push({ role: 'assistant', content: data.content })
      // Add tool results...
    }

    throw new Error('Max AI iterations reached')
  }

  // ============================================
  // SPECIALIZED METHODS
  // ============================================

  async analyzeCodebase(files: Map<string, string>): Promise<CodebaseProfile> {
    const fileList = Array.from(files.entries())
      .map(([path, content]) => `### ${path}\n\`\`\`\n${content.slice(0, 2000)}\n\`\`\``)
      .join('\n\n')

    const response = await this.chat(
      PROMPTS.CODEBASE_ANALYZER,
      [{ role: 'user', content: `Analyze this codebase:\n\n${fileList}` }],
      { temperature: 0.3 }
    )

    return JSON.parse(response)
  }

  async findSEOIssues(profile: CodebaseProfile, pages: PageInfo[]): Promise<SEOIssue[]> {
    const response = await this.chat(
      PROMPTS.SEO_ANALYZER,
      [{
        role: 'user',
        content: `
Codebase profile:
${JSON.stringify(profile, null, 2)}

Pages:
${JSON.stringify(pages, null, 2)}

Find all SEO issues.`
      }],
      { temperature: 0.3 }
    )

    return JSON.parse(response)
  }

  async generateFix(
    issue: SEOIssue,
    profile: CodebaseProfile,
    fileContent: string
  ): Promise<CodeFix> {
    const response = await this.chat(
      PROMPTS.CODE_FIXER,
      [{
        role: 'user',
        content: `
Issue: ${JSON.stringify(issue)}

Framework: ${profile.framework}
Meta handling: ${profile.seoPatterns.metaHandling}

Current file content:
\`\`\`
${fileContent}
\`\`\`

Generate the fix.`
      }],
      { temperature: 0.3 }
    )

    return JSON.parse(response)
  }

  async suggestTopics(
    profile: CodebaseProfile,
    existingContent: string[],
    settings: RepoSettings
  ): Promise<string[]> {
    const response = await this.chat(
      PROMPTS.TOPIC_SUGGESTER,
      [{
        role: 'user',
        content: `
Site topics: ${settings.topics.join(', ')}
Tone: ${settings.tone}
Existing content: ${existingContent.join(', ')}

Suggest 5 blog topics that would:
1. Target keywords with search volume
2. Not duplicate existing content
3. Support the site's main pages
4. Be relevant to the audience`
      }],
      { temperature: 0.8 }
    )

    return JSON.parse(response)
  }

  async generateBlog(
    topic: string,
    targetKeyword: string,
    profile: CodebaseProfile,
    settings: RepoSettings
  ): Promise<BlogPost> {
    const response = await this.chat(
      PROMPTS.BLOG_WRITER,
      [{
        role: 'user',
        content: `
Topic: ${topic}
Target keyword: ${targetKeyword}
Tone: ${settings.tone}
Framework: ${profile.framework}
Content format: ${profile.structure.contentDir ? 'mdx' : 'md'}

Write a complete, SEO-optimized blog post.`
      }],
      { temperature: 0.7 }
    )

    return JSON.parse(response)
  }

  async generateImagePrompt(context: {
    title: string
    topic: string
    tone: string
  }): Promise<string> {
    const response = await this.chat(
      PROMPTS.IMAGE_PROMPTER,
      [{
        role: 'user',
        content: `
Blog title: ${context.title}
Topic: ${context.topic}
Tone: ${context.tone}

Create an image generation prompt for a featured image.
Requirements:
- Professional, modern style
- No text in the image
- Works as 1200x630 OG image
- Relevant to the content`
      }],
      { temperature: 0.8 }
    )

    return response.trim()
  }

  async generateAltText(
    imageContext: string,
    targetKeyword?: string
  ): Promise<string> {
    const response = await this.chat(
      PROMPTS.ALT_TEXT_GENERATOR,
      [{
        role: 'user',
        content: `
Image context: ${imageContext}
Target keyword: ${targetKeyword || 'none'}

Generate SEO-friendly alt text (max 125 characters).`
      }],
      { temperature: 0.5 }
    )

    return response.trim()
  }
}
```

### AI Prompts

```typescript
// src/ai/prompts.ts

export const PROMPTS = {
  CODEBASE_ANALYZER: `You are an expert at analyzing web project codebases.

Given a set of files, determine:
1. The framework (Next.js App/Pages, Astro, Nuxt, etc.)
2. The project structure (where pages, components, public assets live)
3. How SEO metadata is currently handled
4. The build system

Return a JSON object matching the CodebaseProfile interface.
Be precise. If unsure, mark as "unknown".`,

  SEO_ANALYZER: `You are a senior SEO engineer analyzing a website's codebase.

Find all SEO issues including:
- Missing or duplicate meta titles/descriptions
- Missing Open Graph tags
- Missing structured data (JSON-LD)
- Missing sitemap or robots.txt
- Pages with thin content
- Images without alt text
- Missing canonical URLs
- Internal linking issues

For each issue, specify:
- The severity (critical, warning, info)
- The affected file
- Whether it can be auto-fixed
- A clear recommendation

Return a JSON array of SEOIssue objects.`,

  CODE_FIXER: `You are an expert developer who fixes SEO issues in code.

Given an SEO issue and the current file content, generate the minimal fix.

Rules:
1. Match the existing code style exactly
2. Only change what's necessary
3. For modifications, provide exact search/replace strings
4. Preserve all existing functionality
5. Use framework-appropriate patterns

Return a JSON CodeFix object with:
- file: the file path
- action: 'create' | 'modify' | 'delete'
- For modify: search (exact string to find) and replace (replacement)
- For create: content (full file content)
- description: brief explanation for commit message`,

  TOPIC_SUGGESTER: `You are an SEO content strategist.

Suggest blog topics that:
1. Target keywords with real search volume
2. Support the site's main offerings
3. Fill content gaps
4. Match the specified tone
5. Don't duplicate existing content

Return a JSON array of 5 topic strings.`,

  BLOG_WRITER: `You are an expert SEO content writer.

Write a complete blog post that:
1. Naturally incorporates the target keyword (2-3% density)
2. Has a compelling, keyword-rich title (under 60 chars)
3. Has a meta description (under 155 chars) with CTA
4. Uses proper heading hierarchy (one H1, logical H2s/H3s)
5. Is comprehensive (1500-2500 words)
6. Includes internal link placeholders [INTERNAL: /page-path]
7. Is genuinely valuable, not keyword-stuffed
8. Matches the specified tone

Return a JSON BlogPost object with:
- title
- slug (URL-friendly)
- content (markdown)
- excerpt (2-3 sentences)
- metaDescription
- targetKeyword
- secondaryKeywords (array)
- frontmatter (for static site generators)`,

  IMAGE_PROMPTER: `You create prompts for AI image generation.

Create a prompt that will generate:
- A professional, modern image
- Relevant to the blog topic
- Works well as a 16:9 featured image
- Has no text (text is added separately)
- Is visually appealing and not generic

Return ONLY the prompt, no explanation.`,

  ALT_TEXT_GENERATOR: `You write SEO-optimized alt text for images.

Rules:
1. Describe what the image shows
2. Be concise (max 125 characters)
3. Include the keyword naturally if relevant
4. Don't start with "Image of" or "Picture of"
5. Be specific, not generic

Return ONLY the alt text.`,
}
```

---

## GitHub Integration

### Authentication

Uses GitHub Personal Access Token (PAT) with these scopes:
- `repo` — Full access to repositories
- `read:org` — If accessing org repos

### Operations

```typescript
// src/github/client.ts

import { Octokit } from '@octokit/rest'
import simpleGit, { SimpleGit } from 'simple-git'
import * as fs from 'fs/promises'
import * as path from 'path'

export class GitHubClient {
  private octokit: Octokit
  private git: SimpleGit
  private dataDir: string

  constructor() {
    this.octokit = new Octokit({
      auth: process.env.GITHUB_TOKEN,
    })
    this.dataDir = process.env.DATA_DIR || '/data'
  }

  // ============================================
  // REPOSITORY OPERATIONS
  // ============================================

  async cloneOrPull(repo: RepoConfig): Promise<string> {
    const repoPath = path.join(this.dataDir, 'repos', repo.id)
    const exists = await this.exists(repoPath)

    if (exists) {
      // Pull latest
      const git = simpleGit(repoPath)
      await git.fetch('origin', repo.branch)
      await git.reset(['--hard', `origin/${repo.branch}`])
      console.log(`Pulled latest for ${repo.id}`)
    } else {
      // Clone fresh
      await fs.mkdir(path.dirname(repoPath), { recursive: true })
      await simpleGit().clone(repo.url, repoPath, [
        '--branch', repo.branch,
        '--single-branch',
        '--depth', '1',
      ])
      console.log(`Cloned ${repo.id}`)
    }

    return repoPath
  }

  async getLatestCommit(repoPath: string): Promise<string> {
    const git = simpleGit(repoPath)
    const log = await git.log({ maxCount: 1 })
    return log.latest?.hash || ''
  }

  // ============================================
  // CHANGE OPERATIONS
  // ============================================

  async applyChanges(repoPath: string, changes: CodeFix[]): Promise<void> {
    for (const change of changes) {
      const filePath = path.join(repoPath, change.file)

      switch (change.action) {
        case 'create':
          await fs.mkdir(path.dirname(filePath), { recursive: true })
          await fs.writeFile(filePath, change.content!, 'utf-8')
          break

        case 'modify':
          const content = await fs.readFile(filePath, 'utf-8')
          if (!content.includes(change.search!)) {
            console.warn(`Search string not found in ${change.file}`)
            continue
          }
          const newContent = content.replace(change.search!, change.replace!)
          await fs.writeFile(filePath, newContent, 'utf-8')
          break

        case 'delete':
          await fs.unlink(filePath)
          break
      }
    }
  }

  // ============================================
  // COMMIT & PUSH
  // ============================================

  async commitAndPush(
    repoPath: string,
    message: string,
    branch: string = 'main'
  ): Promise<string> {
    const git = simpleGit(repoPath)

    // Stage all changes
    await git.add('-A')

    // Check if there are changes
    const status = await git.status()
    if (status.files.length === 0) {
      console.log('No changes to commit')
      return ''
    }

    // Commit
    const commitResult = await git.commit(message)
    const commitSha = commitResult.commit

    // Push
    await git.push('origin', branch)

    console.log(`Pushed commit ${commitSha}`)
    return commitSha
  }

  // ============================================
  // FILE OPERATIONS
  // ============================================

  async readFile(repoPath: string, filePath: string): Promise<string> {
    const fullPath = path.join(repoPath, filePath)
    return fs.readFile(fullPath, 'utf-8')
  }

  async writeFile(
    repoPath: string,
    filePath: string,
    content: string | Buffer
  ): Promise<void> {
    const fullPath = path.join(repoPath, filePath)
    await fs.mkdir(path.dirname(fullPath), { recursive: true })
    await fs.writeFile(fullPath, content)
  }

  async listFiles(
    repoPath: string,
    pattern?: string
  ): Promise<string[]> {
    const { glob } = await import('glob')
    return glob(pattern || '**/*', {
      cwd: repoPath,
      nodir: true,
      ignore: ['node_modules/**', '.git/**', 'dist/**', 'build/**'],
    })
  }

  private async exists(p: string): Promise<boolean> {
    try {
      await fs.access(p)
      return true
    } catch {
      return false
    }
  }
}
```

### Commit Message Format

```
🤖 SEO Agent: <type> - <brief description>

<detailed description if needed>

Changes:
- <file1>: <what changed>
- <file2>: <what changed>

Expected impact: <brief impact statement>
```

Example:
```
🤖 SEO Agent: meta - Add descriptions to product pages

Added unique meta descriptions to 5 product pages that were
previously missing them.

Changes:
- src/app/products/widget/page.tsx: Added metadata export
- src/app/products/gadget/page.tsx: Added metadata export
- src/app/products/tool/page.tsx: Added metadata export

Expected impact: +10-20% CTR on product pages
```

---

## Codebase Intelligence

### Framework Detection

```typescript
// src/scanner/detector.ts

export async function detectFramework(repoPath: string): Promise<FrameworkType> {
  const files = await listFiles(repoPath)
  const hasFile = (name: string) => files.some(f => f.includes(name))
  const hasDir = (name: string) => files.some(f => f.startsWith(name + '/'))

  // Check package.json for dependencies
  let deps: string[] = []
  try {
    const pkg = JSON.parse(await readFile(repoPath, 'package.json'))
    deps = [
      ...Object.keys(pkg.dependencies || {}),
      ...Object.keys(pkg.devDependencies || {}),
    ]
  } catch {}

  // Next.js
  if (deps.includes('next')) {
    // App Router vs Pages Router
    if (hasDir('app') || hasDir('src/app')) {
      if (hasFile('app/layout.tsx') || hasFile('src/app/layout.tsx')) {
        return 'nextjs-app'
      }
    }
    if (hasDir('pages') || hasDir('src/pages')) {
      return 'nextjs-pages'
    }
    return 'nextjs-app' // Default to app router for new Next.js
  }

  // Astro
  if (deps.includes('astro') || hasFile('astro.config.mjs')) {
    return 'astro'
  }

  // Nuxt
  if (deps.includes('nuxt') || hasFile('nuxt.config.ts')) {
    return 'nuxt'
  }

  // Gatsby
  if (deps.includes('gatsby') || hasFile('gatsby-config.js')) {
    return 'gatsby'
  }

  // Remix
  if (deps.includes('@remix-run/react')) {
    return 'remix'
  }

  // SvelteKit
  if (deps.includes('@sveltejs/kit')) {
    return 'sveltekit'
  }

  // Vite + React
  if (deps.includes('vite') && deps.includes('react')) {
    return 'vite-react'
  }

  // Vite + Vue
  if (deps.includes('vite') && deps.includes('vue')) {
    return 'vite-vue'
  }

  // Plain HTML
  if (hasFile('index.html') && !hasFile('package.json')) {
    return 'html'
  }

  return 'unknown'
}
```

### Framework-Specific Handlers

```typescript
// src/scanner/frameworks/nextjs.ts

export const NextJSAppHandler: FrameworkHandler = {
  framework: 'nextjs-app',

  getPageFiles: (files) => {
    return files.filter(f =>
      (f.includes('/app/') || f.startsWith('app/')) &&
      (f.endsWith('page.tsx') || f.endsWith('page.jsx') || f.endsWith('page.js'))
    )
  },

  getLayoutFiles: (files) => {
    return files.filter(f =>
      f.endsWith('layout.tsx') || f.endsWith('layout.jsx')
    )
  },

  extractMeta: async (content) => {
    // Look for: export const metadata = { ... }
    const metadataMatch = content.match(
      /export\s+const\s+metadata\s*[=:]\s*\{([^}]+)\}/s
    )
    if (!metadataMatch) return null

    // Parse the metadata object
    // This is simplified - real implementation would use AST
    const titleMatch = metadataMatch[1].match(/title:\s*['"`]([^'"`]+)['"`]/)
    const descMatch = metadataMatch[1].match(/description:\s*['"`]([^'"`]+)['"`]/)

    return {
      title: titleMatch?.[1],
      description: descMatch?.[1],
    }
  },

  generateMetaCode: (meta) => {
    return `export const metadata: Metadata = {
  title: '${meta.title}',
  description: '${meta.description}',${meta.ogImage ? `
  openGraph: {
    images: ['${meta.ogImage}'],
  },` : ''}
}
`
  },

  getSitemapPath: () => 'app/sitemap.ts',

  generateSitemapCode: (pages) => {
    return `import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  return [
${pages.map(p => `    {
      url: '${p.url}',
      lastModified: new Date('${p.lastModified}'),
      changeFrequency: '${p.changeFrequency}',
      priority: ${p.priority},
    },`).join('\n')}
  ]
}
`
  },

  getRobotsPath: () => 'app/robots.ts',

  generateRobotsCode: (domain) => {
    return `import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
    },
    sitemap: '${domain}/sitemap.xml',
  }
}
`
  },

  getSchemaLocation: () => 'component', // JSON-LD in page component

  generateSchemaCode: (schema) => {
    return `<script
  type="application/ld+json"
  dangerouslySetInnerHTML={{ __html: JSON.stringify(${JSON.stringify(schema, null, 2)}) }}
/>
`
  },
}
```

### SEO Analyzer

```typescript
// src/scanner/seo-analyzer.ts

export class SEOAnalyzer {
  private profile: CodebaseProfile
  private ai: AnthropicClient

  constructor(profile: CodebaseProfile, ai: AnthropicClient) {
    this.profile = profile
    this.ai = ai
  }

  async analyze(repoPath: string): Promise<SEOIssue[]> {
    const issues: SEOIssue[] = []

    // 1. Check each page for meta issues
    for (const page of this.profile.pages) {
      // Missing title
      if (!page.title) {
        issues.push({
          id: `missing-title-${page.path}`,
          type: 'missing-meta-title',
          severity: 'critical',
          page: page.path,
          file: page.filePath,
          description: `Page ${page.path} has no meta title`,
          recommendation: 'Add a unique, descriptive title under 60 characters',
          autoFixable: true,
        })
      } else if (page.title.length > 60) {
        issues.push({
          id: `title-long-${page.path}`,
          type: 'title-too-long',
          severity: 'warning',
          page: page.path,
          file: page.filePath,
          description: `Title "${page.title}" is ${page.title.length} chars (max 60)`,
          recommendation: 'Shorten the title while keeping it descriptive',
          autoFixable: true,
        })
      }

      // Missing description
      if (!page.description) {
        issues.push({
          id: `missing-desc-${page.path}`,
          type: 'missing-meta-description',
          severity: 'critical',
          page: page.path,
          file: page.filePath,
          description: `Page ${page.path} has no meta description`,
          recommendation: 'Add a compelling description under 155 characters',
          autoFixable: true,
        })
      }

      // Missing OG image
      if (!page.hasOgImage) {
        issues.push({
          id: `missing-og-${page.path}`,
          type: 'missing-og-image',
          severity: 'warning',
          page: page.path,
          file: page.filePath,
          description: `Page ${page.path} has no Open Graph image`,
          recommendation: 'Add an OG image for better social sharing',
          autoFixable: true,
        })
      }

      // Images without alt text
      for (const img of page.images) {
        if (!img.alt || img.alt === '') {
          issues.push({
            id: `missing-alt-${page.path}-${img.src}`,
            type: 'missing-alt-text',
            severity: 'warning',
            page: page.path,
            file: page.filePath,
            description: `Image ${img.src} has no alt text`,
            recommendation: 'Add descriptive alt text for accessibility and SEO',
            autoFixable: true,
          })
        }
      }

      // Thin content
      if (page.wordCount < 300) {
        issues.push({
          id: `thin-content-${page.path}`,
          type: 'thin-content',
          severity: 'info',
          page: page.path,
          file: page.filePath,
          description: `Page ${page.path} has only ${page.wordCount} words`,
          recommendation: 'Consider expanding content to 500+ words',
          autoFixable: false, // Needs human judgment
        })
      }
    }

    // 2. Check for sitemap
    if (!this.profile.seoPatterns.existingSitemap) {
      issues.push({
        id: 'missing-sitemap',
        type: 'missing-sitemap',
        severity: 'critical',
        description: 'No sitemap.xml found',
        recommendation: 'Add a sitemap for better indexing',
        autoFixable: true,
      })
    }

    // 3. Check for robots.txt
    if (!this.profile.seoPatterns.existingRobots) {
      issues.push({
        id: 'missing-robots',
        type: 'missing-robots',
        severity: 'warning',
        description: 'No robots.txt found',
        recommendation: 'Add robots.txt to control crawling',
        autoFixable: true,
      })
    }

    // 4. Check for structured data
    if (this.profile.seoPatterns.existingSchema.length === 0) {
      issues.push({
        id: 'missing-schema',
        type: 'missing-schema',
        severity: 'warning',
        description: 'No structured data (JSON-LD) found',
        recommendation: 'Add Organization, WebSite, or page-specific schema',
        autoFixable: true,
      })
    }

    // 5. Check for duplicate titles/descriptions
    const titles = new Map<string, string[]>()
    const descriptions = new Map<string, string[]>()

    for (const page of this.profile.pages) {
      if (page.title) {
        const pages = titles.get(page.title) || []
        pages.push(page.path)
        titles.set(page.title, pages)
      }
      if (page.description) {
        const pages = descriptions.get(page.description) || []
        pages.push(page.path)
        descriptions.set(page.description, pages)
      }
    }

    for (const [title, pages] of titles) {
      if (pages.length > 1) {
        issues.push({
          id: `duplicate-title-${title.slice(0, 20)}`,
          type: 'duplicate-title',
          severity: 'warning',
          description: `Title "${title}" is used on ${pages.length} pages: ${pages.join(', ')}`,
          recommendation: 'Make each page title unique',
          autoFixable: true,
        })
      }
    }

    return issues
  }
}
```

---

## Optimization Modules

### Meta Tag Optimizer

```typescript
// src/optimizer/meta.ts

export class MetaOptimizer {
  private ai: AnthropicClient
  private handler: FrameworkHandler

  constructor(ai: AnthropicClient, handler: FrameworkHandler) {
    this.ai = ai
    this.handler = handler
  }

  async generateMetaForPage(
    page: PageInfo,
    content: string,
    settings: RepoSettings
  ): Promise<{ title: string; description: string }> {
    const response = await this.ai.chat(
      `You are an SEO expert. Generate meta title and description.`,
      [{
        role: 'user',
        content: `
Page path: ${page.path}
Current content preview: ${content.slice(0, 1000)}
Site tone: ${settings.tone}
Site topics: ${settings.topics.join(', ')}

Generate:
1. Meta title (max 60 chars, compelling, includes primary keyword)
2. Meta description (max 155 chars, includes CTA, entices clicks)

Return JSON: { "title": "...", "description": "..." }`
      }],
      { temperature: 0.7 }
    )

    return JSON.parse(response)
  }

  async fixMissingMeta(
    issue: SEOIssue,
    fileContent: string,
    page: PageInfo,
    settings: RepoSettings
  ): Promise<CodeFix> {
    const meta = await this.generateMetaForPage(page, fileContent, settings)
    const metaCode = this.handler.generateMetaCode(meta)

    // Determine where to insert
    // This is framework-specific logic
    if (this.handler.framework === 'nextjs-app') {
      // Check if metadata export exists
      if (fileContent.includes('export const metadata')) {
        // Modify existing
        return {
          issueId: issue.id,
          file: issue.file!,
          action: 'modify',
          search: /export const metadata[^}]+\}/s.exec(fileContent)?.[0],
          replace: metaCode,
          description: `Update meta tags for ${page.path}`,
        }
      } else {
        // Add after imports
        const importEnd = fileContent.lastIndexOf("import")
        const insertPoint = fileContent.indexOf('\n', importEnd) + 1
        return {
          issueId: issue.id,
          file: issue.file!,
          action: 'modify',
          search: fileContent.slice(insertPoint, insertPoint + 50),
          replace: `${metaCode}\n${fileContent.slice(insertPoint, insertPoint + 50)}`,
          description: `Add meta tags for ${page.path}`,
        }
      }
    }

    // Similar logic for other frameworks...
    throw new Error(`Unsupported framework: ${this.handler.framework}`)
  }
}
```

### Schema.org Builder

```typescript
// src/optimizer/schema.ts

export class SchemaBuilder {
  private ai: AnthropicClient

  constructor(ai: AnthropicClient) {
    this.ai = ai
  }

  generateOrganizationSchema(site: {
    name: string
    url: string
    logo?: string
    sameAs?: string[] // Social profiles
  }): object {
    return {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: site.name,
      url: site.url,
      ...(site.logo && { logo: site.logo }),
      ...(site.sameAs && { sameAs: site.sameAs }),
    }
  }

  generateWebSiteSchema(site: {
    name: string
    url: string
    description: string
  }): object {
    return {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: site.name,
      url: site.url,
      description: site.description,
      potentialAction: {
        '@type': 'SearchAction',
        target: `${site.url}/search?q={search_term_string}`,
        'query-input': 'required name=search_term_string',
      },
    }
  }

  generateBlogPostSchema(post: {
    title: string
    description: string
    url: string
    image?: string
    datePublished: string
    dateModified?: string
    author: string
    publisher: { name: string; logo: string }
  }): object {
    return {
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: post.title,
      description: post.description,
      url: post.url,
      ...(post.image && { image: post.image }),
      datePublished: post.datePublished,
      dateModified: post.dateModified || post.datePublished,
      author: {
        '@type': 'Person',
        name: post.author,
      },
      publisher: {
        '@type': 'Organization',
        name: post.publisher.name,
        logo: {
          '@type': 'ImageObject',
          url: post.publisher.logo,
        },
      },
    }
  }

  generateFAQSchema(faqs: { question: string; answer: string }[]): object {
    return {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faqs.map(faq => ({
        '@type': 'Question',
        name: faq.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: faq.answer,
        },
      })),
    }
  }

  generateProductSchema(product: {
    name: string
    description: string
    image: string
    price: number
    currency: string
    availability: 'InStock' | 'OutOfStock' | 'PreOrder'
    url: string
  }): object {
    return {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: product.name,
      description: product.description,
      image: product.image,
      offers: {
        '@type': 'Offer',
        price: product.price,
        priceCurrency: product.currency,
        availability: `https://schema.org/${product.availability}`,
        url: product.url,
      },
    }
  }

  async suggestSchemaForPage(
    page: PageInfo,
    content: string
  ): Promise<{ type: string; schema: object }> {
    const response = await this.ai.chat(
      `You are a structured data expert. Analyze the page and suggest appropriate schema.`,
      [{
        role: 'user',
        content: `
Page: ${page.path}
Title: ${page.title}
Content preview: ${content.slice(0, 2000)}

What schema.org type is most appropriate?
Generate the complete JSON-LD.

Return JSON: { "type": "BlogPosting|Product|FAQPage|...", "schema": {...} }`
      }],
      { temperature: 0.3 }
    )

    return JSON.parse(response)
  }
}
```

### Sitemap Generator

```typescript
// src/optimizer/sitemap.ts

export class SitemapGenerator {
  private handler: FrameworkHandler

  constructor(handler: FrameworkHandler) {
    this.handler = handler
  }

  async generate(
    pages: PageInfo[],
    domain: string
  ): Promise<{ path: string; content: string }> {
    const sitemapPages = pages.map(page => ({
      url: `${domain}${page.path}`,
      lastModified: page.lastModified.toISOString().split('T')[0],
      changeFrequency: this.determineChangeFrequency(page),
      priority: this.determinePriority(page),
    }))

    const path = this.handler.getSitemapPath()
    const content = this.handler.generateSitemapCode(sitemapPages)

    return { path, content }
  }

  private determineChangeFrequency(page: PageInfo): string {
    if (page.path === '/') return 'daily'
    if (page.path.includes('/blog/')) return 'weekly'
    return 'monthly'
  }

  private determinePriority(page: PageInfo): number {
    if (page.path === '/') return 1.0
    if (page.path.split('/').length === 2) return 0.8 // Top-level pages
    if (page.path.includes('/blog/')) return 0.6
    return 0.5
  }
}
```

### Content Generator

```typescript
// src/optimizer/content.ts

export class ContentGenerator {
  private ai: AnthropicClient
  private imageService: ImageService

  constructor(ai: AnthropicClient, imageService: ImageService) {
    this.ai = ai
    this.imageService = imageService
  }

  async generateBlogPost(
    topic: string,
    keyword: string,
    profile: CodebaseProfile,
    settings: RepoSettings
  ): Promise<{ post: BlogPost; image: GeneratedImage }> {
    // 1. Generate the blog content
    const post = await this.ai.generateBlog(topic, keyword, profile, settings)

    // 2. Determine file path based on framework
    post.filePath = this.determineBlogPath(post.slug, profile)
    post.format = profile.structure.contentDir ? 'mdx' : 'md'

    // 3. Generate featured image
    const image = await this.imageService.generateBlogImage({
      title: post.title,
      topic,
      tone: settings.tone,
      slug: post.slug,
    })

    // 4. Update post with image reference
    post.featuredImage = image
    post.frontmatter = {
      ...post.frontmatter,
      title: post.title,
      description: post.metaDescription,
      date: new Date().toISOString(),
      image: `/images/blog/${image.filename}`,
      imageAlt: image.altText,
    }

    return { post, image }
  }

  private determineBlogPath(slug: string, profile: CodebaseProfile): string {
    // Framework-specific blog paths
    switch (profile.framework) {
      case 'nextjs-app':
        return profile.structure.contentDir
          ? `${profile.structure.contentDir}/blog/${slug}.mdx`
          : `app/blog/${slug}/page.tsx`

      case 'astro':
        return `src/content/blog/${slug}.md`

      case 'nextjs-pages':
        return profile.structure.contentDir
          ? `${profile.structure.contentDir}/blog/${slug}.mdx`
          : `pages/blog/${slug}.tsx`

      default:
        return `content/blog/${slug}.md`
    }
  }

  async researchTopics(
    profile: CodebaseProfile,
    settings: RepoSettings,
    existingPosts: string[]
  ): Promise<string[]> {
    return this.ai.suggestTopics(profile, existingPosts, settings)
  }

  shouldGenerateContent(
    repo: RepoConfig,
    lastPublished: Date | null
  ): boolean {
    if (!lastPublished) return true

    const daysSincePublish = (Date.now() - lastPublished.getTime()) / (1000 * 60 * 60 * 24)

    switch (repo.settings.contentFrequency) {
      case 'daily':
        return daysSincePublish >= 1
      case 'weekly':
        return daysSincePublish >= 7
      case 'biweekly':
        return daysSincePublish >= 14
      case 'monthly':
        return daysSincePublish >= 30
      default:
        return false
    }
  }
}
```

### Internal Linking Optimizer

```typescript
// src/optimizer/internal-links.ts

export class InternalLinkOptimizer {
  private ai: AnthropicClient

  constructor(ai: AnthropicClient) {
    this.ai = ai
  }

  async findLinkOpportunities(
    page: PageInfo,
    content: string,
    allPages: PageInfo[]
  ): Promise<LinkOpportunity[]> {
    const response = await this.ai.chat(
      `You are an internal linking expert.`,
      [{
        role: 'user',
        content: `
Current page: ${page.path}
Current page content:
${content.slice(0, 3000)}

Other pages available to link to:
${allPages
  .filter(p => p.path !== page.path)
  .map(p => `- ${p.path}: ${p.title}`)
  .join('\n')}

Find opportunities to add internal links from the current page to other pages.
Look for:
1. Mentions of topics covered by other pages
2. Natural anchor text opportunities
3. Related content that would help readers

Return JSON array:
[{
  "targetPage": "/path",
  "anchorText": "text to link",
  "context": "...surrounding text...",
  "reason": "why this link helps"
}]`
      }],
      { temperature: 0.5 }
    )

    return JSON.parse(response)
  }

  async findOrphanPages(
    pages: PageInfo[]
  ): Promise<PageInfo[]> {
    // Pages with no internal links pointing to them
    const linkedPages = new Set<string>()

    for (const page of pages) {
      for (const link of page.internalLinks) {
        linkedPages.add(link)
      }
    }

    return pages.filter(p =>
      p.path !== '/' && !linkedPages.has(p.path)
    )
  }
}
```

---

## Image Generation

### Image Service

```typescript
// src/optimizer/images/index.ts

import Replicate from 'replicate'
import OpenAI from 'openai'
import sharp from 'sharp'

export class ImageService {
  private replicate?: Replicate
  private openai?: OpenAI
  private ai: AnthropicClient
  private provider: string
  private model: string

  constructor(ai: AnthropicClient) {
    this.ai = ai
    this.provider = process.env.IMAGE_PROVIDER || 'replicate'
    this.model = process.env.IMAGE_MODEL || 'flux-schnell'

    if (this.provider === 'replicate') {
      this.replicate = new Replicate({
        auth: process.env.REPLICATE_API_TOKEN,
      })
    } else if (this.provider === 'openai') {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      })
    }
  }

  async generateBlogImage(context: {
    title: string
    topic: string
    tone: string
    slug: string
  }): Promise<GeneratedImage> {
    // 1. Generate prompt using Claude
    const prompt = await this.ai.generateImagePrompt(context)

    // 2. Generate image
    let imageBuffer: Buffer

    if (this.provider === 'replicate') {
      imageBuffer = await this.generateWithReplicate(prompt)
    } else if (this.provider === 'openai') {
      imageBuffer = await this.generateWithDallE(prompt)
    } else {
      throw new Error(`Unknown image provider: ${this.provider}`)
    }

    // 3. Optimize image
    const optimized = await this.optimizeImage(imageBuffer, {
      width: 1200,
      height: 630,
      format: 'webp',
      quality: 85,
    })

    // 4. Generate alt text
    const altText = await this.ai.generateAltText(
      `Blog post: ${context.title}. Image prompt: ${prompt}`,
      context.topic
    )

    return {
      buffer: optimized,
      filename: `${context.slug}-featured.webp`,
      altText,
      prompt,
      provider: this.provider,
      model: this.model,
      dimensions: { width: 1200, height: 630 },
      sizeBytes: optimized.length,
    }
  }

  private async generateWithReplicate(prompt: string): Promise<Buffer> {
    const modelMap: Record<string, string> = {
      'flux-schnell': 'black-forest-labs/flux-schnell',
      'flux-pro': 'black-forest-labs/flux-1.1-pro',
      'sdxl': 'stability-ai/sdxl',
    }

    const output = await this.replicate!.run(
      modelMap[this.model] || modelMap['flux-schnell'],
      {
        input: {
          prompt,
          aspect_ratio: '16:9',
          output_format: 'webp',
          output_quality: 90,
        },
      }
    )

    const imageUrl = Array.isArray(output) ? output[0] : output
    const response = await fetch(imageUrl)
    return Buffer.from(await response.arrayBuffer())
  }

  private async generateWithDallE(prompt: string): Promise<Buffer> {
    const response = await this.openai!.images.generate({
      model: 'dall-e-3',
      prompt,
      n: 1,
      size: '1792x1024', // Closest to 16:9
      quality: 'standard',
      response_format: 'url',
    })

    const imageUrl = response.data[0].url!
    const imageResponse = await fetch(imageUrl)
    return Buffer.from(await imageResponse.arrayBuffer())
  }

  private async optimizeImage(
    buffer: Buffer,
    options: {
      width: number
      height: number
      format: 'webp' | 'png' | 'jpeg'
      quality: number
    }
  ): Promise<Buffer> {
    let pipeline = sharp(buffer)
      .resize(options.width, options.height, { fit: 'cover' })

    switch (options.format) {
      case 'webp':
        pipeline = pipeline.webp({ quality: options.quality })
        break
      case 'png':
        pipeline = pipeline.png({ quality: options.quality })
        break
      case 'jpeg':
        pipeline = pipeline.jpeg({ quality: options.quality })
        break
    }

    return pipeline.toBuffer()
  }

  async generateOGImage(
    title: string,
    domain: string,
    brandColor?: string
  ): Promise<Buffer> {
    // For OG images with text, we can either:
    // 1. Generate base image + overlay text with sharp
    // 2. Use a template-based approach

    // Option 1: AI-generated base + text overlay
    const basePrompt = `Abstract professional background, gradient, modern, clean, suitable for text overlay, ${brandColor || 'blue'} tones`

    const baseImage = await this.generateWithReplicate(basePrompt)

    // Add text overlay
    const svg = `
      <svg width="1200" height="630">
        <style>
          .title {
            fill: white;
            font-size: 56px;
            font-family: system-ui, sans-serif;
            font-weight: bold;
          }
          .domain {
            fill: rgba(255,255,255,0.8);
            font-size: 24px;
            font-family: system-ui, sans-serif;
          }
        </style>
        <rect x="0" y="0" width="1200" height="630" fill="rgba(0,0,0,0.4)"/>
        <text x="60" y="480" class="title">${this.escapeXml(title)}</text>
        <text x="60" y="540" class="domain">${domain}</text>
      </svg>
    `

    return sharp(baseImage)
      .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
      .webp({ quality: 90 })
      .toBuffer()
  }

  async findMissingImages(pages: PageInfo[]): Promise<ImageOpportunity[]> {
    const opportunities: ImageOpportunity[] = []

    for (const page of pages) {
      // Missing featured/OG image
      if (!page.hasOgImage) {
        opportunities.push({
          type: 'og',
          page: page.path,
          priority: 'high',
          reason: 'No Open Graph image for social sharing',
        })
      }

      // Images without alt text
      for (const img of page.images) {
        if (!img.alt || img.alt.trim() === '') {
          opportunities.push({
            type: 'alt-text',
            page: page.path,
            image: img.src,
            priority: 'medium',
            reason: `Image ${img.src} missing alt text`,
          })
        }
      }
    }

    return opportunities
  }

  private escapeXml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;')
  }
}
```

### Image Cost Control

```typescript
// src/optimizer/images/budget.ts

export class ImageBudget {
  private db: Database
  private maxPerDay: number

  constructor(db: Database) {
    this.db = db
    this.maxPerDay = parseInt(process.env.MAX_IMAGES_PER_DAY || '5')
  }

  async canGenerate(repoId: string): Promise<boolean> {
    const today = new Date().toISOString().split('T')[0]
    const count = await this.db.getImageCountForDay(repoId, today)
    return count < this.maxPerDay
  }

  async recordGeneration(repoId: string, image: GeneratedImage): Promise<void> {
    await this.db.insertImageRecord({
      repoId,
      date: new Date(),
      filename: image.filename,
      provider: image.provider,
      model: image.model,
      sizeBytes: image.sizeBytes,
    })
  }

  async getDailyStats(): Promise<{
    total: number
    byRepo: Record<string, number>
    estimatedCost: number
  }> {
    const today = new Date().toISOString().split('T')[0]
    const records = await this.db.getImageRecordsForDay(today)

    const byRepo: Record<string, number> = {}
    for (const record of records) {
      byRepo[record.repoId] = (byRepo[record.repoId] || 0) + 1
    }

    // Rough cost estimation
    const costPerImage: Record<string, number> = {
      'flux-schnell': 0.003,
      'flux-pro': 0.05,
      'dall-e-3': 0.08,
      'sdxl': 0.002,
    }

    const estimatedCost = records.reduce((sum, r) =>
      sum + (costPerImage[r.model] || 0.01), 0
    )

    return {
      total: records.length,
      byRepo,
      estimatedCost,
    }
  }
}
```

---

## Analytics & Tracking

### Google Search Console Integration

```typescript
// src/analytics/search-console.ts

import { google } from 'googleapis'

export class SearchConsoleClient {
  private searchconsole: any
  private auth: any

  constructor() {
    // Service account authentication
    const credentials = JSON.parse(
      process.env.GOOGLE_SERVICE_ACCOUNT_KEY || '{}'
    )

    this.auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
    })

    this.searchconsole = google.searchconsole({ version: 'v1', auth: this.auth })
  }

  async getDailyMetrics(
    siteUrl: string,
    date: Date
  ): Promise<DailyMetrics> {
    const dateStr = date.toISOString().split('T')[0]

    // Get aggregate metrics
    const aggregateResponse = await this.searchconsole.searchanalytics.query({
      siteUrl,
      requestBody: {
        startDate: dateStr,
        endDate: dateStr,
        dimensions: [],
      },
    })

    const aggregate = aggregateResponse.data.rows?.[0] || {
      clicks: 0,
      impressions: 0,
      ctr: 0,
      position: 0,
    }

    // Get per-page metrics
    const pagesResponse = await this.searchconsole.searchanalytics.query({
      siteUrl,
      requestBody: {
        startDate: dateStr,
        endDate: dateStr,
        dimensions: ['page'],
        rowLimit: 100,
      },
    })

    const pages: PageMetrics[] = (pagesResponse.data.rows || []).map(
      (row: any) => ({
        page: new URL(row.keys[0]).pathname,
        clicks: row.clicks,
        impressions: row.impressions,
        ctr: row.ctr,
        position: row.position,
      })
    )

    // Get top queries
    const queriesResponse = await this.searchconsole.searchanalytics.query({
      siteUrl,
      requestBody: {
        startDate: dateStr,
        endDate: dateStr,
        dimensions: ['query'],
        rowLimit: 50,
      },
    })

    const queries: QueryMetrics[] = (queriesResponse.data.rows || []).map(
      (row: any) => ({
        query: row.keys[0],
        clicks: row.clicks,
        impressions: row.impressions,
        ctr: row.ctr,
        position: row.position,
      })
    )

    return {
      repoId: '', // Set by caller
      date,
      clicks: aggregate.clicks,
      impressions: aggregate.impressions,
      ctr: aggregate.ctr,
      position: aggregate.position,
      clicksChange: 0, // Calculated separately
      impressionsChange: 0,
      ctrChange: 0,
      positionChange: 0,
      pages,
      queries,
    }
  }

  async getMetricsRange(
    siteUrl: string,
    startDate: Date,
    endDate: Date
  ): Promise<DailyMetrics[]> {
    const response = await this.searchconsole.searchanalytics.query({
      siteUrl,
      requestBody: {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        dimensions: ['date'],
      },
    })

    return (response.data.rows || []).map((row: any) => ({
      repoId: '',
      date: new Date(row.keys[0]),
      clicks: row.clicks,
      impressions: row.impressions,
      ctr: row.ctr,
      position: row.position,
      clicksChange: 0,
      impressionsChange: 0,
      ctrChange: 0,
      positionChange: 0,
      pages: [],
      queries: [],
    }))
  }
}
```

### Impact Tracker

```typescript
// src/analytics/tracker.ts

export class ImpactTracker {
  private db: Database
  private searchConsole: SearchConsoleClient

  constructor(db: Database, searchConsole: SearchConsoleClient) {
    this.db = db
    this.searchConsole = searchConsole
  }

  async trackChange(change: Change): Promise<void> {
    await this.db.insertChange(change)
  }

  async measureImpact(
    changeId: string,
    daysAfter: number = 14
  ): Promise<{
    clicksBefore: number
    clicksAfter: number
    percentChange: number
  } | null> {
    const change = await this.db.getChange(changeId)
    if (!change) return null

    const repo = await this.db.getRepo(change.repoId)
    if (!repo.searchConsole) return null

    const changeDate = new Date(change.timestamp)
    const measureDate = new Date(changeDate.getTime() + daysAfter * 24 * 60 * 60 * 1000)

    // Skip if not enough time has passed
    if (measureDate > new Date()) return null

    // Get metrics for affected pages
    const beforeStart = new Date(changeDate.getTime() - 14 * 24 * 60 * 60 * 1000)
    const beforeMetrics = await this.searchConsole.getMetricsRange(
      repo.searchConsole.propertyUrl,
      beforeStart,
      changeDate
    )

    const afterMetrics = await this.searchConsole.getMetricsRange(
      repo.searchConsole.propertyUrl,
      changeDate,
      measureDate
    )

    const clicksBefore = beforeMetrics.reduce((sum, m) => sum + m.clicks, 0)
    const clicksAfter = afterMetrics.reduce((sum, m) => sum + m.clicks, 0)
    const percentChange = clicksBefore > 0
      ? ((clicksAfter - clicksBefore) / clicksBefore) * 100
      : 0

    // Update change record with measured impact
    await this.db.updateChange(changeId, {
      measuredImpact: {
        clicksBefore,
        clicksAfter,
        measurementPeriod: daysAfter,
      },
    })

    return { clicksBefore, clicksAfter, percentChange }
  }

  async getChangeCorrelations(): Promise<{
    type: ChangeType
    avgImpact: number
    sampleSize: number
  }[]> {
    const changes = await this.db.getChangesWithImpact()

    const byType = new Map<ChangeType, number[]>()

    for (const change of changes) {
      if (!change.measuredImpact) continue

      const impact = change.measuredImpact.clicksAfter - change.measuredImpact.clicksBefore
      const impacts = byType.get(change.type) || []
      impacts.push(impact)
      byType.set(change.type, impacts)
    }

    return Array.from(byType.entries()).map(([type, impacts]) => ({
      type,
      avgImpact: impacts.reduce((a, b) => a + b, 0) / impacts.length,
      sampleSize: impacts.length,
    }))
  }
}
```

---

## Reporting System

### Daily Report Generator

```typescript
// src/reports/daily.ts

export class DailyReportGenerator {
  private db: Database
  private searchConsole: SearchConsoleClient

  constructor(db: Database, searchConsole: SearchConsoleClient) {
    this.db = db
    this.searchConsole = searchConsole
  }

  async generate(repos: RepoConfig[]): Promise<DailyReport> {
    const today = new Date()
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)

    const repoReports: RepoReport[] = []
    let totalClicks = 0
    let totalImpressions = 0
    let totalChanges = 0

    for (const repo of repos) {
      const report = await this.generateRepoReport(repo, yesterday)
      repoReports.push(report)

      totalClicks += report.metrics.clicks
      totalImpressions += report.metrics.impressions
      totalChanges += report.changes.length
    }

    return {
      date: yesterday,
      repos: repoReports,
      totalClicks,
      totalImpressions,
      changesAcrossRepos: totalChanges,
    }
  }

  private async generateRepoReport(
    repo: RepoConfig,
    date: Date
  ): Promise<RepoReport> {
    // Get yesterday's metrics
    const metrics = repo.searchConsole
      ? await this.searchConsole.getDailyMetrics(
          repo.searchConsole.propertyUrl,
          date
        )
      : null

    // Get 7-day average for comparison
    const weekAgo = new Date(date.getTime() - 7 * 24 * 60 * 60 * 1000)
    const weekMetrics = repo.searchConsole
      ? await this.searchConsole.getMetricsRange(
          repo.searchConsole.propertyUrl,
          weekAgo,
          date
        )
      : []

    const avgClicks = weekMetrics.length > 0
      ? weekMetrics.reduce((sum, m) => sum + m.clicks, 0) / weekMetrics.length
      : 0

    const avgImpressions = weekMetrics.length > 0
      ? weekMetrics.reduce((sum, m) => sum + m.impressions, 0) / weekMetrics.length
      : 0

    // Get changes made yesterday
    const changes = await this.db.getChangesForDate(repo.id, date)

    // Find top growing pages
    const topGrowingPages = metrics?.pages
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 5)
      .map(p => ({
        page: p.page,
        clicks: p.clicks,
        change: 0, // Would need historical data
      })) || []

    return {
      repoId: repo.id,
      domain: repo.domain,
      metrics: {
        clicks: metrics?.clicks || 0,
        clicksChange: avgClicks > 0
          ? ((metrics?.clicks || 0) - avgClicks) / avgClicks * 100
          : 0,
        impressions: metrics?.impressions || 0,
        impressionsChange: avgImpressions > 0
          ? ((metrics?.impressions || 0) - avgImpressions) / avgImpressions * 100
          : 0,
        ctr: metrics?.ctr || 0,
        ctrChange: 0,
        position: metrics?.position || 0,
        positionChange: 0,
      },
      changes,
      topGrowingPages,
      issuesFixed: changes.filter(c => !c.type.includes('blog')).length,
      contentPublished: changes.filter(c => c.type === 'blog-published').length,
      imagesGenerated: changes.filter(c => c.type === 'image-added').length,
      nextActions: await this.getNextActions(repo),
    }
  }

  private async getNextActions(repo: RepoConfig): Promise<string[]> {
    // Get pending issues and planned content
    const actions: string[] = []

    const pendingIssues = await this.db.getPendingIssues(repo.id)
    if (pendingIssues.length > 0) {
      actions.push(`Fix ${pendingIssues.length} pending SEO issues`)
    }

    const scheduledContent = await this.db.getScheduledContent(repo.id)
    if (scheduledContent.length > 0) {
      actions.push(`Publish: "${scheduledContent[0].topic}"`)
    }

    return actions
  }
}
```

### Email Sender

```typescript
// src/reports/email.ts

import { Resend } from 'resend'

export class EmailSender {
  private resend: Resend
  private from: string
  private to: string[]

  constructor() {
    this.resend = new Resend(process.env.RESEND_API_KEY)
    this.from = process.env.EMAIL_FROM || 'SEO Agent <seo@yourdomain.com>'
    this.to = (process.env.REPORT_EMAIL || '').split(',').filter(Boolean)
  }

  async sendDailyReport(report: DailyReport): Promise<void> {
    if (this.to.length === 0) {
      console.log('No email recipients configured, skipping email')
      return
    }

    const subject = `📊 SEO Agent Daily Report — ${report.date.toDateString()}`
    const html = this.renderDailyReport(report)

    await this.resend.emails.send({
      from: this.from,
      to: this.to,
      subject,
      html,
    })

    console.log(`Daily report sent to ${this.to.join(', ')}`)
  }

  private renderDailyReport(report: DailyReport): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: system-ui, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    h1 { color: #1a1a1a; border-bottom: 2px solid #eee; padding-bottom: 10px; }
    h2 { color: #444; margin-top: 30px; }
    .metric { display: inline-block; margin-right: 30px; margin-bottom: 20px; }
    .metric-value { font-size: 24px; font-weight: bold; color: #1a1a1a; }
    .metric-label { font-size: 12px; color: #666; text-transform: uppercase; }
    .metric-change { font-size: 14px; }
    .positive { color: #22c55e; }
    .negative { color: #ef4444; }
    .change-item { padding: 8px 0; border-bottom: 1px solid #eee; }
    .change-type { display: inline-block; padding: 2px 8px; background: #f3f4f6; border-radius: 4px; font-size: 12px; margin-right: 8px; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { padding: 10px; text-align: left; border-bottom: 1px solid #eee; }
    th { background: #f9fafb; font-weight: 600; }
  </style>
</head>
<body>
  <h1>📊 SEO Agent Daily Report</h1>
  <p>${report.date.toDateString()}</p>

  <h2>Summary</h2>
  <div class="metric">
    <div class="metric-value">${report.totalClicks.toLocaleString()}</div>
    <div class="metric-label">Total Clicks</div>
  </div>
  <div class="metric">
    <div class="metric-value">${report.totalImpressions.toLocaleString()}</div>
    <div class="metric-label">Total Impressions</div>
  </div>
  <div class="metric">
    <div class="metric-value">${report.changesAcrossRepos}</div>
    <div class="metric-label">Changes Made</div>
  </div>

  ${report.repos.map(repo => `
    <h2>${repo.domain}</h2>

    <div class="metric">
      <div class="metric-value">${repo.metrics.clicks.toLocaleString()}</div>
      <div class="metric-label">Clicks</div>
      <div class="metric-change ${repo.metrics.clicksChange >= 0 ? 'positive' : 'negative'}">
        ${repo.metrics.clicksChange >= 0 ? '+' : ''}${repo.metrics.clicksChange.toFixed(1)}% vs 7d avg
      </div>
    </div>

    <div class="metric">
      <div class="metric-value">${repo.metrics.impressions.toLocaleString()}</div>
      <div class="metric-label">Impressions</div>
      <div class="metric-change ${repo.metrics.impressionsChange >= 0 ? 'positive' : 'negative'}">
        ${repo.metrics.impressionsChange >= 0 ? '+' : ''}${repo.metrics.impressionsChange.toFixed(1)}%
      </div>
    </div>

    <div class="metric">
      <div class="metric-value">${(repo.metrics.ctr * 100).toFixed(1)}%</div>
      <div class="metric-label">CTR</div>
    </div>

    <div class="metric">
      <div class="metric-value">${repo.metrics.position.toFixed(1)}</div>
      <div class="metric-label">Avg Position</div>
    </div>

    ${repo.changes.length > 0 ? `
      <h3>Changes Made</h3>
      ${repo.changes.map(change => `
        <div class="change-item">
          <span class="change-type">${change.type}</span>
          ${change.description}
        </div>
      `).join('')}
    ` : ''}

    ${repo.topGrowingPages.length > 0 ? `
      <h3>Top Pages</h3>
      <table>
        <tr><th>Page</th><th>Clicks</th></tr>
        ${repo.topGrowingPages.map(page => `
          <tr><td>${page.page}</td><td>${page.clicks}</td></tr>
        `).join('')}
      </table>
    ` : ''}

    ${repo.nextActions.length > 0 ? `
      <h3>Next Actions</h3>
      <ul>
        ${repo.nextActions.map(action => `<li>${action}</li>`).join('')}
      </ul>
    ` : ''}
  `).join('')}

  <hr style="margin: 40px 0; border: none; border-top: 1px solid #eee;">
  <p style="color: #666; font-size: 12px;">
    Generated by SEO Agent • <a href="https://github.com/your-repo">View Source</a>
  </p>
</body>
</html>
`
  }

  async sendWeeklyReport(report: WeeklyReport): Promise<void> {
    // Similar to daily but with weekly aggregates and trends
    // ... implementation
  }
}
```

---

## Docker Setup

### Dockerfile

```dockerfile
# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build

# Production stage
FROM node:20-alpine

# Install git for cloning repos
RUN apk add --no-cache git openssh-client

WORKDIR /app

# Copy built files and production deps
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package*.json ./

# Create data directory
RUN mkdir -p /data/repos /data/reports

# Set environment
ENV NODE_ENV=production
ENV DATA_DIR=/data

# Run
CMD ["node", "dist/index.js"]
```

### docker-compose.yml

```yaml
version: '3.8'

services:
  seo-agent:
    build: .
    container_name: seo-agent

    environment:
      # AI
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      - AI_MODEL=${AI_MODEL:-claude-sonnet-4-20250514}

      # GitHub
      - GITHUB_TOKEN=${GITHUB_TOKEN}

      # Images
      - IMAGE_PROVIDER=${IMAGE_PROVIDER:-replicate}
      - IMAGE_MODEL=${IMAGE_MODEL:-flux-schnell}
      - REPLICATE_API_TOKEN=${REPLICATE_API_TOKEN}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - MAX_IMAGES_PER_DAY=${MAX_IMAGES_PER_DAY:-5}

      # Google
      - GOOGLE_SERVICE_ACCOUNT_KEY=${GOOGLE_SERVICE_ACCOUNT_KEY}

      # Email
      - RESEND_API_KEY=${RESEND_API_KEY}
      - EMAIL_FROM=${EMAIL_FROM:-SEO Agent <seo@example.com>}
      - REPORT_EMAIL=${REPORT_EMAIL}

      # Data
      - DATA_DIR=/data

    volumes:
      # Persist data between runs
      - ./data:/data

      # Mount config
      - ./config:/app/config:ro

      # SSH keys for git access
      - ~/.ssh:/root/.ssh:ro

    # Run once and exit (for cron scheduling)
    restart: "no"

  # Optional: Web dashboard for viewing reports
  dashboard:
    build:
      context: .
      dockerfile: Dockerfile.dashboard
    container_name: seo-dashboard
    ports:
      - "3000:3000"
    environment:
      - DATA_DIR=/data
    volumes:
      - ./data:/data:ro
    profiles:
      - dashboard  # Only start with: docker-compose --profile dashboard up
```

### .env.example

```bash
# ===========================================
# AI Configuration
# ===========================================
ANTHROPIC_API_KEY=sk-ant-...
AI_MODEL=claude-sonnet-4-20250514

# ===========================================
# GitHub Configuration
# ===========================================
# Personal Access Token with 'repo' scope
GITHUB_TOKEN=ghp_...

# ===========================================
# Image Generation
# ===========================================
# Provider: replicate | openai | stability
IMAGE_PROVIDER=replicate
# Model: flux-schnell | flux-pro | dall-e-3 | sdxl
IMAGE_MODEL=flux-schnell

# Replicate (if using)
REPLICATE_API_TOKEN=r8_...

# OpenAI (if using DALL-E)
OPENAI_API_KEY=sk-...

# Daily limit to control costs
MAX_IMAGES_PER_DAY=5

# ===========================================
# Google Search Console
# ===========================================
# Service account JSON (single line, escaped)
GOOGLE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"..."}

# ===========================================
# Email Reports
# ===========================================
RESEND_API_KEY=re_...
EMAIL_FROM=SEO Agent <seo@yourdomain.com>
# Comma-separated list of recipients
REPORT_EMAIL=you@example.com,team@example.com

# ===========================================
# Data Directory
# ===========================================
DATA_DIR=/data
```

### Cron Setup (Host Machine)

```bash
# Edit crontab
crontab -e

# Add daily run at 2 AM
0 2 * * * cd /path/to/seo-agent && docker-compose up --build >> /var/log/seo-agent.log 2>&1

# Or use a wrapper script for better logging
0 2 * * * /path/to/seo-agent/run.sh
```

**run.sh**
```bash
#!/bin/bash
set -e

cd /path/to/seo-agent

echo "=========================================="
echo "SEO Agent Run - $(date)"
echo "=========================================="

# Pull latest if using remote config
# git pull origin main

# Build and run
docker-compose build
docker-compose up

echo "=========================================="
echo "Completed - $(date)"
echo "=========================================="
```

### Systemd Timer (Alternative to Cron)

**/etc/systemd/system/seo-agent.service**
```ini
[Unit]
Description=SEO Agent Daily Run
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
WorkingDirectory=/path/to/seo-agent
ExecStart=/usr/bin/docker-compose up --build
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

**/etc/systemd/system/seo-agent.timer**
```ini
[Unit]
Description=Run SEO Agent daily at 2 AM

[Timer]
OnCalendar=*-*-* 02:00:00
Persistent=true

[Install]
WantedBy=timers.target
```

```bash
# Enable and start
sudo systemctl enable seo-agent.timer
sudo systemctl start seo-agent.timer

# Check status
sudo systemctl list-timers | grep seo-agent
```

---

## Configuration

### repos.json

```json
{
  "repos": [
    {
      "id": "main-site",
      "url": "git@github.com:youruser/main-website.git",
      "branch": "main",
      "domain": "https://example.com",
      "settings": {
        "contentFrequency": "weekly",
        "tone": "professional",
        "topics": ["saas", "productivity", "business"],
        "maxBlogsPerWeek": 2,
        "maxImagesPerDay": 3,
        "excludePaths": ["src/legacy/", "tests/"],
        "customInstructions": "Focus on B2B audience. Avoid casual language."
      },
      "searchConsole": {
        "propertyUrl": "https://example.com"
      }
    },
    {
      "id": "blog",
      "url": "git@github.com:youruser/company-blog.git",
      "branch": "main",
      "domain": "https://blog.example.com",
      "settings": {
        "contentFrequency": "daily",
        "tone": "casual",
        "topics": ["tech tutorials", "industry news", "how-to guides"],
        "maxBlogsPerWeek": 5,
        "maxImagesPerDay": 5,
        "excludePaths": []
      },
      "searchConsole": {
        "propertyUrl": "https://blog.example.com"
      }
    },
    {
      "id": "docs",
      "url": "git@github.com:youruser/documentation.git",
      "branch": "main",
      "domain": "https://docs.example.com",
      "settings": {
        "contentFrequency": "monthly",
        "tone": "technical",
        "topics": ["documentation", "api reference", "guides"],
        "maxBlogsPerWeek": 1,
        "maxImagesPerDay": 2,
        "excludePaths": ["api-reference/"]
      }
    }
  ]
}
```

---

## Database Schema

### SQLite Schema (schema.sql)

```sql
-- ============================================
-- REPOSITORIES
-- ============================================
CREATE TABLE IF NOT EXISTS repos (
  id TEXT PRIMARY KEY,
  url TEXT NOT NULL,
  branch TEXT NOT NULL DEFAULT 'main',
  domain TEXT,
  settings JSON NOT NULL,
  search_console_config JSON,
  codebase_profile JSON,
  last_scan_at DATETIME,
  last_scan_commit TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- DAILY METRICS
-- ============================================
CREATE TABLE IF NOT EXISTS metrics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  repo_id TEXT NOT NULL REFERENCES repos(id),
  date DATE NOT NULL,
  clicks INTEGER DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  ctr REAL DEFAULT 0,
  position REAL DEFAULT 0,
  pages JSON,
  queries JSON,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(repo_id, date)
);

CREATE INDEX idx_metrics_repo_date ON metrics(repo_id, date);

-- ============================================
-- CHANGES MADE BY AGENT
-- ============================================
CREATE TABLE IF NOT EXISTS changes (
  id TEXT PRIMARY KEY,
  repo_id TEXT NOT NULL REFERENCES repos(id),
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  type TEXT NOT NULL,
  file_path TEXT,
  description TEXT NOT NULL,
  commit_sha TEXT,
  affected_pages JSON,
  expected_impact TEXT,
  measured_impact JSON
);

CREATE INDEX idx_changes_repo_date ON changes(repo_id, timestamp);
CREATE INDEX idx_changes_type ON changes(type);

-- ============================================
-- GENERATED CONTENT
-- ============================================
CREATE TABLE IF NOT EXISTS content (
  id TEXT PRIMARY KEY,
  repo_id TEXT NOT NULL REFERENCES repos(id),
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  target_keyword TEXT,
  secondary_keywords JSON,
  file_path TEXT NOT NULL,
  published_at DATETIME,
  word_count INTEGER,
  has_featured_image BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_content_repo ON content(repo_id);

-- ============================================
-- SEO ISSUES
-- ============================================
CREATE TABLE IF NOT EXISTS issues (
  id TEXT PRIMARY KEY,
  repo_id TEXT NOT NULL REFERENCES repos(id),
  type TEXT NOT NULL,
  severity TEXT NOT NULL,
  page TEXT,
  file_path TEXT,
  description TEXT NOT NULL,
  recommendation TEXT,
  auto_fixable BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'open',  -- open, fixed, ignored
  fixed_at DATETIME,
  fixed_by_change_id TEXT REFERENCES changes(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_issues_repo_status ON issues(repo_id, status);

-- ============================================
-- IMAGES
-- ============================================
CREATE TABLE IF NOT EXISTS images (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  repo_id TEXT NOT NULL REFERENCES repos(id),
  date DATE NOT NULL,
  filename TEXT NOT NULL,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  size_bytes INTEGER,
  prompt TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_images_repo_date ON images(repo_id, date);

-- ============================================
-- REPORTS
-- ============================================
CREATE TABLE IF NOT EXISTS reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,  -- daily, weekly
  date DATE NOT NULL,
  data JSON NOT NULL,
  sent_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_reports_type_date ON reports(type, date);

-- ============================================
-- CONTENT CALENDAR
-- ============================================
CREATE TABLE IF NOT EXISTS content_calendar (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  repo_id TEXT NOT NULL REFERENCES repos(id),
  topic TEXT NOT NULL,
  target_keyword TEXT,
  scheduled_for DATE NOT NULL,
  status TEXT DEFAULT 'scheduled',  -- scheduled, generated, published, cancelled
  content_id TEXT REFERENCES content(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_calendar_repo_date ON content_calendar(repo_id, scheduled_for);
```

---

## File Structure

```
/seo-agent
├── src/
│   ├── index.ts                      # Main entry point / orchestrator
│   │
│   ├── config/
│   │   ├── index.ts                  # Config loader
│   │   └── types.ts                  # Config type definitions
│   │
│   ├── ai/
│   │   ├── client.ts                 # Anthropic API client
│   │   ├── auth.ts                   # Credential resolution
│   │   └── prompts.ts                # System prompts
│   │
│   ├── github/
│   │   ├── client.ts                 # GitHub operations
│   │   ├── clone.ts                  # Clone/pull repos
│   │   ├── commit.ts                 # Stage, commit
│   │   └── push.ts                   # Push changes
│   │
│   ├── scanner/
│   │   ├── index.ts                  # Main scanner
│   │   ├── detector.ts               # Framework detection
│   │   ├── profiler.ts               # Build codebase profile
│   │   ├── seo-analyzer.ts           # Find SEO issues
│   │   └── frameworks/
│   │       ├── types.ts              # Framework handler interface
│   │       ├── nextjs-app.ts
│   │       ├── nextjs-pages.ts
│   │       ├── astro.ts
│   │       ├── nuxt.ts
│   │       └── html.ts
│   │
│   ├── optimizer/
│   │   ├── index.ts                  # Optimizer coordinator
│   │   ├── meta.ts                   # Meta tag generation
│   │   ├── schema.ts                 # JSON-LD schema
│   │   ├── sitemap.ts                # Sitemap generation
│   │   ├── robots.ts                 # robots.txt
│   │   ├── content.ts                # Blog generation
│   │   ├── internal-links.ts         # Link optimization
│   │   └── images/
│   │       ├── index.ts              # Image service
│   │       ├── providers/
│   │       │   ├── replicate.ts
│   │       │   ├── openai.ts
│   │       │   └── stability.ts
│   │       ├── optimizer.ts          # Sharp compression
│   │       └── budget.ts             # Cost control
│   │
│   ├── analytics/
│   │   ├── search-console.ts         # Google Search Console
│   │   ├── tracker.ts                # Impact tracking
│   │   └── metrics-store.ts          # Store/retrieve metrics
│   │
│   ├── reports/
│   │   ├── daily.ts                  # Daily report generator
│   │   ├── weekly.ts                 # Weekly summary
│   │   └── email.ts                  # Email sender
│   │
│   ├── db/
│   │   ├── index.ts                  # Database client
│   │   ├── schema.sql                # SQLite schema
│   │   └── migrations/               # Future migrations
│   │
│   └── types/
│       ├── index.ts                  # Re-exports
│       ├── config.ts
│       ├── codebase.ts
│       ├── seo.ts
│       ├── content.ts
│       ├── analytics.ts
│       └── reports.ts
│
├── config/
│   └── repos.json                    # Repository configurations
│
├── data/                             # Docker volume mount point
│   ├── repos/                        # Cloned repositories
│   ├── seo-agent.db                  # SQLite database
│   └── reports/                      # Archived reports
│
├── Dockerfile
├── docker-compose.yml
├── .env.example
├── package.json
├── tsconfig.json
├── .gitignore
└── README.md
```

---

## API Reference (Internal)

### Main Orchestrator

```typescript
// src/index.ts

async function main(): Promise<void> {
  console.log('🚀 SEO Agent starting...')

  // 1. Initialize
  const config = loadConfig()
  const db = new Database()
  const ai = new AnthropicClient()
  const github = new GitHubClient()
  const imageService = new ImageService(ai)
  const searchConsole = new SearchConsoleClient()
  const reportGenerator = new DailyReportGenerator(db, searchConsole)
  const emailSender = new EmailSender()

  // 2. Process each repository
  for (const repo of config.repos) {
    console.log(`\n📦 Processing ${repo.id}...`)

    try {
      await processRepository(repo, {
        db,
        ai,
        github,
        imageService,
        searchConsole,
      })
    } catch (error) {
      console.error(`❌ Error processing ${repo.id}:`, error)
      // Continue with other repos
    }
  }

  // 3. Generate and send reports
  console.log('\n📊 Generating reports...')
  const report = await reportGenerator.generate(config.repos)
  await db.saveReport('daily', report)
  await emailSender.sendDailyReport(report)

  // 4. Weekly report (if Sunday)
  if (new Date().getDay() === 0) {
    const weeklyReport = await generateWeeklyReport(db, config.repos)
    await db.saveReport('weekly', weeklyReport)
    await emailSender.sendWeeklyReport(weeklyReport)
  }

  console.log('\n✅ SEO Agent completed successfully')
}

async function processRepository(
  repo: RepoConfig,
  services: Services
): Promise<void> {
  const { db, ai, github, imageService, searchConsole } = services

  // 1. Clone or pull repository
  const repoPath = await github.cloneOrPull(repo)
  const currentCommit = await github.getLatestCommit(repoPath)

  // 2. Get or create codebase profile
  let profile = await db.getCodebaseProfile(repo.id)
  const needsRescan = !profile || profile.commitHash !== currentCommit

  if (needsRescan) {
    console.log('  🔍 Scanning codebase...')
    const scanner = new CodebaseScanner(ai)
    profile = await scanner.scan(repoPath)
    profile.repoId = repo.id
    profile.commitHash = currentCommit
    await db.saveCodebaseProfile(profile)
  }

  // 3. Analyze SEO issues
  console.log('  🔎 Analyzing SEO issues...')
  const analyzer = new SEOAnalyzer(profile, ai)
  const issues = await analyzer.analyze(repoPath)
  await db.saveIssues(repo.id, issues)

  // 4. Fix auto-fixable issues
  const fixableIssues = issues.filter(i => i.autoFixable)
  console.log(`  🔧 Fixing ${fixableIssues.length} issues...`)

  const handler = getFrameworkHandler(profile.framework)
  const optimizer = new Optimizer(ai, handler, imageService)
  const fixes: CodeFix[] = []

  for (const issue of fixableIssues.slice(0, 10)) { // Limit per run
    try {
      const fileContent = await github.readFile(repoPath, issue.file!)
      const fix = await optimizer.generateFix(issue, profile, fileContent)
      fixes.push(fix)
    } catch (error) {
      console.warn(`  ⚠️ Could not fix ${issue.id}:`, error)
    }
  }

  // 5. Apply fixes
  if (fixes.length > 0) {
    await github.applyChanges(repoPath, fixes)
  }

  // 6. Generate content if due
  const contentGenerator = new ContentGenerator(ai, imageService)
  const lastPublished = await db.getLastPublishedDate(repo.id)

  if (contentGenerator.shouldGenerateContent(repo, lastPublished)) {
    console.log('  ✍️ Generating content...')

    const existingPosts = await db.getContentTitles(repo.id)
    const topics = await contentGenerator.researchTopics(profile, repo.settings, existingPosts)

    if (topics.length > 0) {
      const { post, image } = await contentGenerator.generateBlogPost(
        topics[0],
        topics[0], // Use topic as keyword for simplicity
        profile,
        repo.settings
      )

      // Save image
      await github.writeFile(
        repoPath,
        `public/images/blog/${image.filename}`,
        image.buffer
      )

      // Save blog post
      const blogContent = formatBlogPost(post, profile.framework)
      await github.writeFile(repoPath, post.filePath, blogContent)

      // Record in database
      await db.saveContent(repo.id, post)

      fixes.push({
        issueId: 'content-generation',
        file: post.filePath,
        action: 'create',
        description: `Published blog: ${post.title}`,
      })
    }
  }

  // 7. Commit and push if there are changes
  if (fixes.length > 0) {
    console.log('  📤 Pushing changes...')

    const commitMessage = generateCommitMessage(fixes)
    const commitSha = await github.commitAndPush(repoPath, commitMessage, repo.branch)

    // Record changes
    for (const fix of fixes) {
      await db.saveChange({
        id: `${repo.id}-${Date.now()}-${fix.issueId}`,
        repoId: repo.id,
        timestamp: new Date(),
        type: inferChangeType(fix),
        file: fix.file,
        description: fix.description,
        commitSha,
        affectedPages: [],
        expectedImpact: '',
      })
    }
  }

  // 8. Fetch and store analytics
  if (repo.searchConsole) {
    console.log('  📈 Fetching analytics...')
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const metrics = await searchConsole.getDailyMetrics(
      repo.searchConsole.propertyUrl,
      yesterday
    )
    metrics.repoId = repo.id
    await db.saveMetrics(metrics)
  }

  console.log(`  ✅ ${repo.id} complete`)
}
```

---

## Build Phases

### Phase 1: Foundation (Days 1-2)

- [ ] Project setup
  - [ ] Initialize npm project
  - [ ] TypeScript configuration
  - [ ] ESLint + Prettier
  - [ ] Docker setup

- [ ] Core infrastructure
  - [ ] Config loader
  - [ ] SQLite database setup
  - [ ] Type definitions

- [ ] AI client
  - [ ] Anthropic API integration
  - [ ] Basic chat function
  - [ ] Error handling

### Phase 2: GitHub Integration (Days 3-4)

- [ ] GitHub client
  - [ ] Clone repositories
  - [ ] Pull latest changes
  - [ ] Read files
  - [ ] Write files
  - [ ] Commit changes
  - [ ] Push to remote

- [ ] Git operations
  - [ ] SSH key handling
  - [ ] Branch management
  - [ ] Commit message formatting

### Phase 3: Codebase Scanner (Days 5-7)

- [ ] Framework detection
  - [ ] Next.js (App Router)
  - [ ] Next.js (Pages Router)
  - [ ] Astro
  - [ ] Plain HTML

- [ ] Codebase profiling
  - [ ] Structure mapping
  - [ ] Meta handling detection
  - [ ] Page extraction

- [ ] SEO analyzer
  - [ ] Missing meta detection
  - [ ] Duplicate content detection
  - [ ] Missing sitemap/robots
  - [ ] Image alt text audit

### Phase 4: Optimizers (Days 8-11)

- [ ] Meta tag optimizer
  - [ ] Title generation
  - [ ] Description generation
  - [ ] Framework-specific code generation

- [ ] Schema.org builder
  - [ ] Organization schema
  - [ ] WebSite schema
  - [ ] BlogPosting schema

- [ ] Sitemap generator
  - [ ] Dynamic sitemap for each framework
  - [ ] Priority calculation

- [ ] Content generator
  - [ ] Topic research
  - [ ] Blog post generation
  - [ ] Frontmatter handling

### Phase 5: Image Generation (Days 12-13)

- [ ] Image service
  - [ ] Replicate integration (Flux)
  - [ ] Prompt generation
  - [ ] Image optimization (Sharp)
  - [ ] Alt text generation

- [ ] Budget control
  - [ ] Daily limits
  - [ ] Usage tracking

### Phase 6: Analytics (Days 14-15)

- [ ] Google Search Console
  - [ ] OAuth/Service account setup
  - [ ] Daily metrics fetch
  - [ ] Per-page metrics
  - [ ] Query metrics

- [ ] Impact tracking
  - [ ] Change correlation
  - [ ] Before/after comparison

### Phase 7: Reporting (Days 16-17)

- [ ] Report generators
  - [ ] Daily report
  - [ ] Weekly summary

- [ ] Email delivery
  - [ ] HTML templates
  - [ ] Resend integration

### Phase 8: Testing & Polish (Days 18-20)

- [ ] Integration testing
- [ ] Error handling improvements
- [ ] Logging improvements
- [ ] Documentation
- [ ] Docker optimization

---

## Cost Estimation

### Monthly Costs (5 Sites, Daily Runs)

| Service | Usage | Cost |
|---------|-------|------|
| **Anthropic Claude** | ~100K tokens/day | ~$30-50/month |
| **Replicate (Flux)** | ~10 images/day | ~$1-2/month |
| **Google Search Console** | Free | $0 |
| **Resend** | ~35 emails/month | Free tier |
| **Docker hosting** | Self-hosted | $0 |

**Total: ~$30-50/month** (mostly AI tokens)

### Token Usage Breakdown

| Operation | Tokens/Run | Daily (5 sites) |
|-----------|------------|-----------------|
| Codebase analysis | ~2000 | 10,000 |
| SEO analysis | ~3000 | 15,000 |
| Fix generation | ~1000 × 10 | 50,000 |
| Blog generation | ~5000 | 25,000 |
| Image prompts | ~500 | 2,500 |
| **Total** | | **~100,000** |

At Claude Sonnet pricing (~$3/1M input, $15/1M output), roughly $1-2/day.

---

## Security Considerations

1. **API Keys**: Store in environment variables, never in code
2. **GitHub Token**: Use fine-grained PAT with minimal scopes
3. **SSH Keys**: Mount read-only in Docker
4. **Google Credentials**: Use service account, not user OAuth
5. **Database**: SQLite file permissions (600)
6. **Secrets in Commits**: Never commit sensitive data to repos

---

## Future Enhancements

1. **Web Dashboard**: Real-time monitoring UI
2. **Multi-language**: Content in multiple languages
3. **A/B Testing**: Test different titles/descriptions
4. **Backlink Analysis**: Ahrefs/Moz integration
5. **Competitor Tracking**: Monitor competitor rankings
6. **Custom Workflows**: User-defined optimization rules
7. **Webhooks**: Notify on significant changes
8. **Team Features**: Multi-user access

---

## Revision History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-02-13 | Initial plan |

