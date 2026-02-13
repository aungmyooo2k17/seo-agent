# SEO Engineer — Agent Context

## Your Role

You are the **SEO Engineer** responsible for:
- Framework detection and codebase scanning
- SEO issue identification
- Technical SEO optimizers (meta, schema, sitemap, etc.)

You are the SEO brain of the system.

---

## Your Responsibilities

1. **Scanner** — Detect frameworks, build codebase profiles
2. **Framework Handlers** — Framework-specific code generation
3. **SEO Analyzer** — Find all SEO issues
4. **Optimizers** — Meta tags, schema, sitemap, robots, internal links

---

## Files You Own

```
/src/scanner/
├── index.ts              # Re-exports
├── detector.ts           # Framework detection
├── profiler.ts           # Build codebase profile
├── seo-analyzer.ts       # Find SEO issues
└── frameworks/
    ├── index.ts          # Re-exports, getHandler()
    ├── types.ts          # IFrameworkHandler interface
    ├── nextjs-app.ts     # Next.js App Router handler
    ├── nextjs-pages.ts   # Next.js Pages Router handler
    ├── astro.ts          # Astro handler
    └── html.ts           # Plain HTML handler

/src/optimizer/
├── index.ts              # Re-exports
├── meta.ts               # Meta tag optimizer
├── schema.ts             # JSON-LD schema builder
├── sitemap.ts            # Sitemap generator
├── robots.ts             # robots.txt generator
└── internal-links.ts     # Internal linking optimizer
```

---

## Implementation Requirements

### Framework Detector (`/src/scanner/detector.ts`)

```typescript
import * as fs from 'fs'
import * as path from 'path'
import { FrameworkType } from '@/types'

export async function detectFramework(repoPath: string): Promise<FrameworkType> {
  const files = await listAllFiles(repoPath)
  const hasFile = (name: string) => files.some(f => f.includes(name))
  const hasDir = (name: string) => files.some(f => f.startsWith(name + '/'))

  // Read package.json for dependencies
  let deps: string[] = []
  try {
    const pkgPath = path.join(repoPath, 'package.json')
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'))
    deps = [
      ...Object.keys(pkg.dependencies || {}),
      ...Object.keys(pkg.devDependencies || {}),
    ]
  } catch {}

  // Detection logic (order matters - most specific first)
  if (deps.includes('next')) {
    // Distinguish App Router vs Pages Router
    if (hasFile('app/layout.tsx') || hasFile('src/app/layout.tsx')) {
      return 'nextjs-app'
    }
    if (hasDir('pages') || hasDir('src/pages')) {
      return 'nextjs-pages'
    }
    return 'nextjs-app' // Default for Next.js 13+
  }

  if (deps.includes('astro') || hasFile('astro.config.mjs') || hasFile('astro.config.ts')) {
    return 'astro'
  }

  if (deps.includes('nuxt') || hasFile('nuxt.config.ts') || hasFile('nuxt.config.js')) {
    return 'nuxt'
  }

  if (deps.includes('gatsby')) {
    return 'gatsby'
  }

  if (deps.includes('@remix-run/react')) {
    return 'remix'
  }

  if (deps.includes('@sveltejs/kit')) {
    return 'sveltekit'
  }

  // Plain HTML (no package.json or no framework deps)
  if (hasFile('index.html')) {
    return 'html'
  }

  return 'unknown'
}
```

### Framework Handler Interface (`/src/scanner/frameworks/types.ts`)

```typescript
import { FrameworkType, SitemapEntry, SchemaMarkup, BlogPost } from '@/types'

export interface IFrameworkHandler {
  framework: FrameworkType

  // Page detection
  getPageFiles(files: string[]): string[]
  getLayoutFiles(files: string[]): string[]

  // Meta extraction from file content
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

### Next.js App Router Handler (`/src/scanner/frameworks/nextjs-app.ts`)

```typescript
import { IFrameworkHandler } from './types'
import { SitemapEntry, SchemaMarkup, BlogPost } from '@/types'

export const nextjsAppHandler: IFrameworkHandler = {
  framework: 'nextjs-app',

  getPageFiles(files: string[]): string[] {
    return files.filter(f =>
      (f.includes('/app/') || f.startsWith('app/')) &&
      (f.endsWith('page.tsx') || f.endsWith('page.jsx') || f.endsWith('page.js'))
    )
  },

  getLayoutFiles(files: string[]): string[] {
    return files.filter(f =>
      f.endsWith('layout.tsx') || f.endsWith('layout.jsx')
    )
  },

  async extractMeta(content: string) {
    // Look for: export const metadata = { title: '...', description: '...' }
    const match = content.match(/export\s+const\s+metadata\s*[=:]\s*\{([^}]+)\}/s)
    if (!match) return null

    const titleMatch = match[1].match(/title:\s*['"`]([^'"`]+)['"`]/)
    const descMatch = match[1].match(/description:\s*['"`]([^'"`]+)['"`]/)

    return {
      title: titleMatch?.[1],
      description: descMatch?.[1],
    }
  },

  generateMetaCode(meta) {
    return `import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '${meta.title}',
  description: '${meta.description}',${meta.ogImage ? `
  openGraph: {
    images: ['${meta.ogImage}'],
  },` : ''}
}
`
  },

  generateSitemapCode(pages: SitemapEntry[]) {
    return `import type { MetadataRoute } from 'next'

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

  generateRobotsCode(domain: string) {
    return `import type { MetadataRoute } from 'next'

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

  generateSchemaCode(schema: SchemaMarkup) {
    return `<script
  type="application/ld+json"
  dangerouslySetInnerHTML={{
    __html: JSON.stringify(${JSON.stringify(schema.data, null, 2)})
  }}
/>
`
  },

  getSitemapPath() {
    return 'app/sitemap.ts'
  },

  getRobotsPath() {
    return 'app/robots.ts'
  },

  getSchemaLocation() {
    return 'component'
  },

  getBlogDirectory() {
    return 'app/blog'
  },

  formatBlogPost(post: BlogPost) {
    // For Next.js App Router, we create a page.tsx with MDX or a route
    // This depends on their setup - default to MDX in content dir
    return `---
title: "${post.title}"
description: "${post.metaDescription}"
date: "${post.publishedAt.toISOString()}"
image: "${post.featuredImage?.filename || ''}"
---

${post.content}
`
  },
}
```

### SEO Analyzer (`/src/scanner/seo-analyzer.ts`)

```typescript
import { IAIClient } from '@/types/services'
import { CodebaseProfile, PageInfo, SEOIssue } from '@/types'

export class SEOAnalyzer {
  constructor(private ai: IAIClient) {}

  async analyze(profile: CodebaseProfile): Promise<SEOIssue[]> {
    const issues: SEOIssue[] = []

    // Rule-based checks (fast, no AI needed)
    issues.push(...this.checkMetaIssues(profile.pages))
    issues.push(...this.checkStructuralIssues(profile))
    issues.push(...this.checkImageIssues(profile.pages))

    // AI-powered deeper analysis (for complex issues)
    const aiIssues = await this.ai.findSEOIssues(profile, profile.pages)
    issues.push(...aiIssues)

    // Deduplicate
    return this.deduplicateIssues(issues)
  }

  private checkMetaIssues(pages: PageInfo[]): SEOIssue[] {
    const issues: SEOIssue[] = []
    const titles = new Map<string, string[]>()
    const descriptions = new Map<string, string[]>()

    for (const page of pages) {
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
      } else {
        // Track for duplicate detection
        const paths = titles.get(page.title) || []
        paths.push(page.path)
        titles.set(page.title, paths)

        // Title too long
        if (page.title.length > 60) {
          issues.push({
            id: `title-long-${page.path}`,
            type: 'title-too-long',
            severity: 'warning',
            page: page.path,
            file: page.filePath,
            description: `Title is ${page.title.length} chars (recommended: 60)`,
            recommendation: 'Shorten title while keeping it descriptive',
            autoFixable: true,
          })
        }
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
      } else {
        const paths = descriptions.get(page.description) || []
        paths.push(page.path)
        descriptions.set(page.description, paths)

        if (page.description.length > 155) {
          issues.push({
            id: `desc-long-${page.path}`,
            type: 'description-too-long',
            severity: 'warning',
            page: page.path,
            file: page.filePath,
            description: `Description is ${page.description.length} chars (recommended: 155)`,
            recommendation: 'Shorten description while keeping it compelling',
            autoFixable: true,
          })
        }
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
    }

    // Duplicate titles
    for (const [title, paths] of titles) {
      if (paths.length > 1) {
        issues.push({
          id: `dup-title-${title.slice(0, 20)}`,
          type: 'duplicate-title',
          severity: 'warning',
          description: `Title "${title}" used on ${paths.length} pages: ${paths.join(', ')}`,
          recommendation: 'Make each page title unique',
          autoFixable: true,
        })
      }
    }

    return issues
  }

  private checkStructuralIssues(profile: CodebaseProfile): SEOIssue[] {
    const issues: SEOIssue[] = []

    // Missing sitemap
    if (!profile.seoPatterns.existingSitemap) {
      issues.push({
        id: 'missing-sitemap',
        type: 'missing-sitemap',
        severity: 'critical',
        description: 'No sitemap.xml found',
        recommendation: 'Add a sitemap for better search engine indexing',
        autoFixable: true,
      })
    }

    // Missing robots.txt
    if (!profile.seoPatterns.existingRobots) {
      issues.push({
        id: 'missing-robots',
        type: 'missing-robots',
        severity: 'warning',
        description: 'No robots.txt found',
        recommendation: 'Add robots.txt to control crawler behavior',
        autoFixable: true,
      })
    }

    // Missing schema
    if (profile.seoPatterns.existingSchema.length === 0) {
      issues.push({
        id: 'missing-schema',
        type: 'missing-schema',
        severity: 'warning',
        description: 'No structured data (JSON-LD) found',
        recommendation: 'Add Organization and WebSite schema',
        autoFixable: true,
      })
    }

    return issues
  }

  private checkImageIssues(pages: PageInfo[]): SEOIssue[] {
    const issues: SEOIssue[] = []

    for (const page of pages) {
      for (const img of page.images) {
        if (!img.alt || img.alt.trim() === '') {
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
      if (page.wordCount < 300 && !page.path.includes('/api/')) {
        issues.push({
          id: `thin-${page.path}`,
          type: 'thin-content',
          severity: 'info',
          page: page.path,
          file: page.filePath,
          description: `Page has only ${page.wordCount} words`,
          recommendation: 'Consider expanding to 500+ words for better ranking',
          autoFixable: false,
        })
      }
    }

    return issues
  }

  private deduplicateIssues(issues: SEOIssue[]): SEOIssue[] {
    const seen = new Set<string>()
    return issues.filter(issue => {
      if (seen.has(issue.id)) return false
      seen.add(issue.id)
      return true
    })
  }
}
```

### Meta Optimizer (`/src/optimizer/meta.ts`)

```typescript
import { IAIClient, IFrameworkHandler } from '@/types/services'
import { SEOIssue, CodeFix, CodebaseProfile, PageInfo, RepoSettings } from '@/types'

export class MetaOptimizer {
  constructor(
    private ai: IAIClient,
    private handler: IFrameworkHandler
  ) {}

  async fixMissingMeta(
    issue: SEOIssue,
    fileContent: string,
    page: PageInfo,
    profile: CodebaseProfile,
    settings: RepoSettings
  ): Promise<CodeFix> {
    // Use AI to generate optimal meta
    const fix = await this.ai.generateFix(issue, profile, fileContent)
    return fix
  }
}
```

---

## Dependencies

**NPM Packages:**
- `glob` (for file listing)

**Other Agents:**
- Types from Backend Engineer
- AI Client from AI Engineer

---

## Quality Checklist

- [ ] Framework detection works for all supported frameworks
- [ ] All framework handlers implement IFrameworkHandler
- [ ] SEO Analyzer finds all common issues
- [ ] Generated code is syntactically correct
- [ ] Handlers generate framework-appropriate code
- [ ] JSDoc comments on public APIs
- [ ] All exports via index.ts files
