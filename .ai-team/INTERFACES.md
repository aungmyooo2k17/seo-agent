# Shared Interfaces — Type Contracts

> All agents must use these interfaces. This ensures compatibility between modules.

---

## Configuration Types

```typescript
// /src/types/config.ts

export interface Config {
  repos: RepoConfig[]
  ai: AIConfig
  images: ImageConfig
  email: EmailConfig
}

export interface RepoConfig {
  id: string
  url: string                    // git@github.com:user/repo.git
  branch: string                 // main
  domain: string                 // https://example.com
  settings: RepoSettings
  searchConsole?: SearchConsoleConfig
}

export interface RepoSettings {
  contentFrequency: 'daily' | 'weekly' | 'biweekly' | 'monthly'
  tone: 'professional' | 'casual' | 'technical' | 'friendly'
  topics: string[]
  maxBlogsPerWeek: number
  maxImagesPerDay: number
  excludePaths: string[]
  customInstructions?: string
}

export interface SearchConsoleConfig {
  propertyUrl: string            // https://example.com or sc-domain:example.com
}

export interface AIConfig {
  model: string                  // claude-sonnet-4-20250514
  maxTokens: number              // 8192
  temperature: number            // 0.7
}

export interface ImageConfig {
  provider: 'replicate' | 'openai'
  model: string                  // flux-schnell
  maxPerDay: number
}

export interface EmailConfig {
  provider: 'resend' | 'smtp'
  from: string
  to: string[]
  dailyReport: boolean
  weeklyReport: boolean
}
```

---

## Codebase Types

```typescript
// /src/types/codebase.ts

export type FrameworkType =
  | 'nextjs-app'
  | 'nextjs-pages'
  | 'astro'
  | 'nuxt'
  | 'gatsby'
  | 'remix'
  | 'sveltekit'
  | 'vite-react'
  | 'vite-vue'
  | 'html'
  | 'unknown'

export type MetaHandlingType =
  | 'metadata-export'     // Next.js App Router
  | 'next-head'           // Next.js Pages Router
  | 'astro-head'          // Astro
  | 'nuxt-usehead'        // Nuxt
  | 'react-helmet'        // React Helmet
  | 'direct-html'         // Plain HTML
  | 'unknown'

export interface CodebaseProfile {
  repoId: string
  scannedAt: Date
  commitHash: string

  framework: FrameworkType
  frameworkVersion?: string

  structure: CodebaseStructure
  seoPatterns: SEOPatterns
  buildSystem: BuildSystem
  pages: PageInfo[]

  safeZones: string[]
  dangerZones: string[]
}

export interface CodebaseStructure {
  pagesDir: string              // src/app, pages, src/pages
  componentsDir: string
  publicDir: string             // public, static
  contentDir?: string           // For MDX/content collections
  layoutFiles: string[]
  configFiles: string[]
}

export interface SEOPatterns {
  metaHandling: MetaHandlingType
  existingSitemap: string | null
  existingRobots: string | null
  existingSchema: string[]      // Types found: Organization, WebSite, etc.
  hasOgImages: boolean
  hasFavicon: boolean
}

export interface BuildSystem {
  packageManager: 'npm' | 'yarn' | 'pnpm' | 'bun'
  buildCommand: string
  devCommand: string
  outDir: string
}

export interface PageInfo {
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

export interface ImageInfo {
  src: string
  alt: string | null
  isLocal: boolean
  dimensions?: { width: number; height: number }
}
```

---

## SEO Types

```typescript
// /src/types/seo.ts

export type SEOIssueType =
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
  | 'deep-page'
  | 'missing-breadcrumbs'

export interface SEOIssue {
  id: string
  type: SEOIssueType
  severity: 'critical' | 'warning' | 'info'
  page?: string
  file?: string
  description: string
  recommendation: string
  autoFixable: boolean
}

export interface CodeFix {
  issueId: string
  file: string
  action: 'create' | 'modify' | 'delete'
  content?: string              // For create
  search?: string               // For modify (find this)
  replace?: string              // For modify (replace with)
  description: string           // For commit message
}

export interface SitemapEntry {
  url: string
  lastModified: string
  changeFrequency: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never'
  priority: number
}

export interface SchemaMarkup {
  type: string                  // Organization, WebSite, BlogPosting, etc.
  data: Record<string, unknown>
}
```

---

## Content Types

```typescript
// /src/types/content.ts

export interface BlogPost {
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
  author: string
  publishedAt: Date

  // Frontmatter
  frontmatter: Record<string, unknown>

  // File
  filePath: string
  format: 'mdx' | 'md' | 'html'
}

export interface GeneratedImage {
  buffer: Buffer
  filename: string
  altText: string
  prompt: string
  provider: string
  model: string
  dimensions: { width: number; height: number }
  sizeBytes: number
}

export interface ImageOpportunity {
  type: 'featured' | 'og' | 'alt-text' | 'hero'
  page: string
  image?: string
  priority: 'high' | 'medium' | 'low'
  reason: string
}

export interface ContentCalendarEntry {
  id: string
  repoId: string
  topic: string
  targetKeyword: string
  scheduledFor: Date
  status: 'scheduled' | 'generated' | 'published' | 'cancelled'
  contentId?: string
}
```

---

## Analytics Types

```typescript
// /src/types/analytics.ts

export interface DailyMetrics {
  repoId: string
  date: Date

  // Aggregate
  clicks: number
  impressions: number
  ctr: number
  position: number

  // Deltas (vs 7-day average)
  clicksChange: number
  impressionsChange: number
  ctrChange: number
  positionChange: number

  // Breakdown
  pages: PageMetrics[]
  queries: QueryMetrics[]
}

export interface PageMetrics {
  page: string
  clicks: number
  impressions: number
  ctr: number
  position: number
}

export interface QueryMetrics {
  query: string
  clicks: number
  impressions: number
  ctr: number
  position: number
}

export interface Change {
  id: string
  repoId: string
  timestamp: Date
  type: ChangeType
  file: string
  description: string
  commitSha: string
  affectedPages: string[]
  expectedImpact: string
  measuredImpact?: MeasuredImpact
}

export type ChangeType =
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

export interface MeasuredImpact {
  clicksBefore: number
  clicksAfter: number
  measurementPeriod: number     // Days
}
```

---

## Report Types

```typescript
// /src/types/reports.ts

export interface DailyReport {
  date: Date
  repos: RepoReport[]
  totalClicks: number
  totalImpressions: number
  changesAcrossRepos: number
}

export interface RepoReport {
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

export interface WeeklyReport extends DailyReport {
  weekNumber: number
  totalChanges: number
  totalBlogsPublished: number
  newKeywordsRanking: number
  keywordsImproved: number
  clicksTrend: number[]
  impressionsTrend: number[]
  biggestWins: {
    type: string
    description: string
    impact: string
  }[]
}
```

---

## Service Interfaces

```typescript
// /src/types/services.ts

/**
 * AI Client Interface
 * Implemented by: AI Engineer
 * Used by: SEO Engineer, Content Engineer
 */
export interface IAIClient {
  chat(systemPrompt: string, messages: Message[], options?: ChatOptions): Promise<string>
  analyzeCodebase(files: Map<string, string>): Promise<CodebaseProfile>
  findSEOIssues(profile: CodebaseProfile, pages: PageInfo[]): Promise<SEOIssue[]>
  generateFix(issue: SEOIssue, profile: CodebaseProfile, fileContent: string): Promise<CodeFix>
  generateBlog(topic: string, keyword: string, profile: CodebaseProfile, settings: RepoSettings): Promise<BlogPost>
  generateImagePrompt(context: ImagePromptContext): Promise<string>
  generateAltText(imageContext: string, keyword?: string): Promise<string>
}

export interface Message {
  role: 'user' | 'assistant'
  content: string
}

export interface ChatOptions {
  temperature?: number
  maxTokens?: number
}

export interface ImagePromptContext {
  title: string
  topic: string
  tone: string
}

/**
 * GitHub Client Interface
 * Implemented by: Integrations Engineer
 * Used by: Orchestrator
 */
export interface IGitHubClient {
  cloneOrPull(repo: RepoConfig): Promise<string>  // Returns repo path
  getLatestCommit(repoPath: string): Promise<string>
  readFile(repoPath: string, filePath: string): Promise<string>
  writeFile(repoPath: string, filePath: string, content: string | Buffer): Promise<void>
  listFiles(repoPath: string, pattern?: string): Promise<string[]>
  applyChanges(repoPath: string, changes: CodeFix[]): Promise<void>
  commitAndPush(repoPath: string, message: string, branch: string): Promise<string>
}

/**
 * Image Service Interface
 * Implemented by: Content Engineer
 * Used by: Orchestrator, Content generation
 */
export interface IImageService {
  generateBlogImage(context: BlogImageContext): Promise<GeneratedImage>
  generateOGImage(title: string, domain: string): Promise<Buffer>
  findMissingImages(pages: PageInfo[]): Promise<ImageOpportunity[]>
  canGenerate(repoId: string): Promise<boolean>
}

export interface BlogImageContext {
  title: string
  topic: string
  tone: string
  slug: string
}

/**
 * Search Console Client Interface
 * Implemented by: Integrations Engineer
 * Used by: Analytics, Reports
 */
export interface ISearchConsoleClient {
  getDailyMetrics(siteUrl: string, date: Date): Promise<DailyMetrics>
  getMetricsRange(siteUrl: string, startDate: Date, endDate: Date): Promise<DailyMetrics[]>
}

/**
 * Database Client Interface
 * Implemented by: Backend Engineer
 * Used by: All modules
 */
export interface IDatabase {
  // Repos
  getRepo(id: string): Promise<RepoConfig | null>
  saveRepo(repo: RepoConfig): Promise<void>

  // Codebase profiles
  getCodebaseProfile(repoId: string): Promise<CodebaseProfile | null>
  saveCodebaseProfile(profile: CodebaseProfile): Promise<void>

  // Metrics
  getMetrics(repoId: string, date: Date): Promise<DailyMetrics | null>
  saveMetrics(metrics: DailyMetrics): Promise<void>
  getMetricsRange(repoId: string, startDate: Date, endDate: Date): Promise<DailyMetrics[]>

  // Changes
  getChange(id: string): Promise<Change | null>
  saveChange(change: Change): Promise<void>
  getChangesForDate(repoId: string, date: Date): Promise<Change[]>
  updateChange(id: string, updates: Partial<Change>): Promise<void>

  // Content
  getContent(id: string): Promise<BlogPost | null>
  saveContent(repoId: string, post: BlogPost): Promise<void>
  getContentTitles(repoId: string): Promise<string[]>
  getLastPublishedDate(repoId: string): Promise<Date | null>

  // Issues
  saveIssues(repoId: string, issues: SEOIssue[]): Promise<void>
  getPendingIssues(repoId: string): Promise<SEOIssue[]>

  // Images
  getImageCountForDay(repoId: string, date: string): Promise<number>
  saveImageRecord(record: ImageRecord): Promise<void>

  // Reports
  saveReport(type: 'daily' | 'weekly', report: DailyReport | WeeklyReport): Promise<void>
}

export interface ImageRecord {
  repoId: string
  date: Date
  filename: string
  provider: string
  model: string
  sizeBytes: number
}
```

---

## Framework Handler Interface

```typescript
// /src/scanner/frameworks/types.ts

/**
 * Framework Handler Interface
 * Implemented by: SEO Engineer (one per framework)
 * Used by: Scanner, Optimizers
 */
export interface IFrameworkHandler {
  framework: FrameworkType

  // Page detection
  getPageFiles(files: string[]): string[]
  getLayoutFiles(files: string[]): string[]

  // Meta extraction
  extractMeta(content: string): Promise<{ title?: string; description?: string } | null>

  // Code generation
  generateMetaCode(meta: { title: string; description: string; ogImage?: string }): string
  generateSitemapCode(pages: SitemapEntry[]): string
  generateRobotsCode(domain: string): string
  generateSchemaCode(schema: SchemaMarkup): string

  // Paths
  getSitemapPath(): string
  getRobotsPath(): string
  getSchemaLocation(): 'head' | 'component' | 'layout'

  // Content
  getBlogDirectory(): string
  formatBlogPost(post: BlogPost): string
}
```

---

## Usage Example

```typescript
// How modules interact:

import { IAIClient } from '@/types/services'
import { CodebaseProfile, SEOIssue } from '@/types'

class SEOAnalyzer {
  constructor(private ai: IAIClient) {}

  async analyze(profile: CodebaseProfile): Promise<SEOIssue[]> {
    // Use the AI client to find issues
    return this.ai.findSEOIssues(profile, profile.pages)
  }
}
```

---

## Notes for Agents

1. **Import from types**: Always import types from `/src/types/`
2. **Implement interfaces**: Services should implement the `I*` interfaces
3. **No circular deps**: Types module has no dependencies
4. **Export from index**: Each module exports via `index.ts`
5. **Strict typing**: No `any`, use `unknown` if needed
