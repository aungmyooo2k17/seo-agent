# Architect (Tech Lead) — Agent Context

## Your Role

You are the **Architect/Tech Lead** responsible for:
- Main orchestrator (`/src/index.ts`)
- Wiring all modules together
- Integration testing
- Resolving conflicts between agents

You are the last to build, but you ensure everything works together.

---

## Your Responsibilities

1. **Main Orchestrator** — Wire all modules together in `index.ts`
2. **Integration** — Ensure modules work together correctly
3. **Error Handling** — Global error handling and recovery
4. **Logging** — Consistent logging throughout the app

---

## Files You Own

```
/src/
├── index.ts              # Main entry point / orchestrator
```

You also have authority to modify any file to resolve integration issues.

---

## Prerequisites

**Before you start, ALL other agents must be complete:**
- [ ] Backend Engineer — types, config, database
- [ ] AI Engineer — AI client, prompts
- [ ] SEO Engineer — scanner, optimizers
- [ ] Content Engineer — content generator, images
- [ ] Integrations Engineer — GitHub, analytics, reports
- [ ] DevOps Engineer — Docker, scripts

---

## Implementation Requirements

### Main Orchestrator (`/src/index.ts`)

```typescript
/**
 * SEO Agent - Main Orchestrator
 *
 * This is the entry point that coordinates all modules to:
 * 1. Load configuration
 * 2. Process each repository
 * 3. Generate and send reports
 */

import { loadConfig } from './config'
import { DatabaseClient } from './db'
import { AIClient } from './ai'
import { GitHubClient } from './github'
import { SearchConsoleClient } from './analytics'
import { ImageService } from './optimizer/images'
import { ContentGenerator } from './optimizer/content'
import { SEOAnalyzer } from './scanner/seo-analyzer'
import { detectFramework } from './scanner/detector'
import { buildCodebaseProfile } from './scanner/profiler'
import { getFrameworkHandler } from './scanner/frameworks'
import { MetaOptimizer } from './optimizer/meta'
import { SchemaBuilder } from './optimizer/schema'
import { SitemapGenerator } from './optimizer/sitemap'
import { DailyReportGenerator } from './reports/daily'
import { EmailSender } from './reports/email'
import { Config, RepoConfig, CodebaseProfile, SEOIssue, CodeFix, Change } from './types'

// ============================================
// MAIN FUNCTION
// ============================================

async function main(): Promise<void> {
  console.log('🚀 SEO Agent starting...')
  console.log(`   Time: ${new Date().toISOString()}`)
  console.log('')

  // 1. Initialize services
  const config = loadConfig()
  const db = new DatabaseClient()
  const ai = new AIClient()
  const github = new GitHubClient()
  const searchConsole = new SearchConsoleClient()
  const imageService = new ImageService(ai)
  const contentGenerator = new ContentGenerator(ai, imageService)
  const reportGenerator = new DailyReportGenerator(db, searchConsole)
  const emailSender = new EmailSender()

  console.log(`📋 Loaded ${config.repos.length} repositories`)
  console.log('')

  // 2. Process each repository
  for (const repo of config.repos) {
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
    console.log(`📦 Processing: ${repo.id} (${repo.domain})`)
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)

    try {
      await processRepository(repo, {
        config,
        db,
        ai,
        github,
        searchConsole,
        imageService,
        contentGenerator,
      })
      console.log(`✅ ${repo.id} complete`)
    } catch (error) {
      console.error(`❌ Error processing ${repo.id}:`)
      console.error(error)
      // Continue with other repos
    }

    console.log('')
  }

  // 3. Generate and send reports
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
  console.log(`📊 Generating reports...`)
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)

  try {
    const report = await reportGenerator.generate(config.repos)
    await db.saveReport('daily', report)
    await emailSender.sendDailyReport(report)
    console.log(`✅ Daily report sent`)

    // Weekly report on Sundays
    if (new Date().getDay() === 0) {
      // TODO: Generate weekly report
      console.log(`✅ Weekly report sent`)
    }
  } catch (error) {
    console.error(`❌ Error generating reports:`)
    console.error(error)
  }

  console.log('')
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
  console.log(`✨ SEO Agent completed`)
  console.log(`   Time: ${new Date().toISOString()}`)
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
}

// ============================================
// REPOSITORY PROCESSING
// ============================================

interface Services {
  config: Config
  db: DatabaseClient
  ai: AIClient
  github: GitHubClient
  searchConsole: SearchConsoleClient
  imageService: ImageService
  contentGenerator: ContentGenerator
}

async function processRepository(repo: RepoConfig, services: Services): Promise<void> {
  const { db, ai, github, searchConsole, imageService, contentGenerator } = services

  // Step 1: Clone or pull repository
  console.log(`  📥 Syncing repository...`)
  const repoPath = await github.cloneOrPull(repo)
  const currentCommit = await github.getLatestCommit(repoPath)

  // Step 2: Get or build codebase profile
  console.log(`  🔍 Analyzing codebase...`)
  let profile = await db.getCodebaseProfile(repo.id)
  const needsRescan = !profile || profile.commitHash !== currentCommit

  if (needsRescan) {
    const framework = await detectFramework(repoPath)
    const files = await github.listFiles(repoPath)
    profile = await buildCodebaseProfile(repoPath, framework, files, ai)
    profile.repoId = repo.id
    profile.commitHash = currentCommit
    await db.saveCodebaseProfile(profile)
    console.log(`    Framework: ${profile.framework}`)
    console.log(`    Pages: ${profile.pages.length}`)
  } else {
    console.log(`    Using cached profile (${profile.framework})`)
  }

  // Step 3: Analyze for SEO issues
  console.log(`  🔎 Finding SEO issues...`)
  const analyzer = new SEOAnalyzer(ai)
  const issues = await analyzer.analyze(profile)
  await db.saveIssues(repo.id, issues)

  const criticalIssues = issues.filter(i => i.severity === 'critical')
  const warningIssues = issues.filter(i => i.severity === 'warning')
  console.log(`    Found: ${criticalIssues.length} critical, ${warningIssues.length} warnings`)

  // Step 4: Fix auto-fixable issues
  const fixableIssues = issues.filter(i => i.autoFixable).slice(0, 10) // Limit per run
  const fixes: CodeFix[] = []
  const changes: Change[] = []

  if (fixableIssues.length > 0) {
    console.log(`  🔧 Fixing ${fixableIssues.length} issues...`)
    const handler = getFrameworkHandler(profile.framework)

    for (const issue of fixableIssues) {
      try {
        const fileContent = issue.file
          ? await github.readFile(repoPath, issue.file)
          : ''
        const fix = await ai.generateFix(issue, profile, fileContent)
        fixes.push(fix)
        console.log(`    ✓ ${issue.type}: ${issue.description.slice(0, 50)}`)
      } catch (error) {
        console.warn(`    ⚠ Could not fix ${issue.id}`)
      }
    }

    // Apply fixes
    if (fixes.length > 0) {
      await github.applyChanges(repoPath, fixes)
    }
  }

  // Step 5: Generate content if due
  const lastPublished = await db.getLastPublishedDate(repo.id)

  if (contentGenerator.shouldGenerateContent(repo, lastPublished)) {
    console.log(`  ✍️ Generating content...`)
    const existingTitles = await db.getContentTitles(repo.id)
    const topics = await contentGenerator.suggestTopics(profile, repo.settings, existingTitles)

    if (topics.length > 0) {
      const handler = getFrameworkHandler(profile.framework)
      const { post, imageBuffer, imagePath } = await contentGenerator.generatePost(
        topics[0],
        topics[0], // Use topic as keyword
        profile,
        repo.settings,
        handler
      )

      // Save image if generated
      if (imageBuffer.length > 0) {
        await github.writeFile(repoPath, imagePath, imageBuffer)
        console.log(`    ✓ Generated image: ${imagePath}`)
      }

      // Save blog post
      const formattedPost = contentGenerator.formatForFramework(post, handler)
      await github.writeFile(repoPath, post.filePath, formattedPost)
      console.log(`    ✓ Generated blog: ${post.title}`)

      // Record in database
      await db.saveContent(repo.id, post)

      // Add to changes
      changes.push({
        id: `${repo.id}-${Date.now()}-blog`,
        repoId: repo.id,
        timestamp: new Date(),
        type: 'blog-published',
        file: post.filePath,
        description: `Published: ${post.title}`,
        commitSha: '',
        affectedPages: [post.filePath],
        expectedImpact: 'New content indexed',
      })
    }
  }

  // Step 6: Commit and push changes
  const totalChanges = fixes.length + changes.length
  if (totalChanges > 0) {
    console.log(`  📤 Committing ${totalChanges} changes...`)

    const commitMessage = generateCommitMessage(fixes, changes)
    const commitSha = await github.commitAndPush(repoPath, commitMessage, repo.branch)

    // Record changes with commit SHA
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

    for (const change of changes) {
      change.commitSha = commitSha
      await db.saveChange(change)
    }
  } else {
    console.log(`  ℹ️ No changes to commit`)
  }

  // Step 7: Fetch analytics
  if (repo.searchConsole) {
    console.log(`  📈 Fetching analytics...`)
    try {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
      const metrics = await searchConsole.getDailyMetrics(
        repo.searchConsole.propertyUrl,
        yesterday
      )
      metrics.repoId = repo.id
      await db.saveMetrics(metrics)
      console.log(`    Clicks: ${metrics.clicks}, Impressions: ${metrics.impressions}`)
    } catch (error) {
      console.warn(`    ⚠ Could not fetch analytics`)
    }
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function generateCommitMessage(fixes: CodeFix[], changes: Change[]): string {
  const parts: string[] = []

  if (fixes.length > 0) {
    const types = [...new Set(fixes.map(f => f.description.split(':')[0]))]
    parts.push(`Fix ${fixes.length} SEO issues (${types.join(', ')})`)
  }

  const blogs = changes.filter(c => c.type === 'blog-published')
  if (blogs.length > 0) {
    parts.push(`Publish ${blogs.length} blog post(s)`)
  }

  return `🤖 SEO Agent: ${parts.join('; ')}\n\nAutomatically generated by SEO Agent.`
}

function inferChangeType(fix: CodeFix): Change['type'] {
  const desc = fix.description.toLowerCase()
  if (desc.includes('title')) return 'meta-title'
  if (desc.includes('description')) return 'meta-description'
  if (desc.includes('og') || desc.includes('open graph')) return 'og-tags'
  if (desc.includes('schema') || desc.includes('json-ld')) return 'schema'
  if (desc.includes('sitemap')) return 'sitemap'
  if (desc.includes('robots')) return 'robots'
  if (desc.includes('alt')) return 'alt-text'
  if (desc.includes('link')) return 'internal-link'
  return 'content-update'
}

// ============================================
// RUN
// ============================================

main().catch((error) => {
  console.error('Fatal error:')
  console.error(error)
  process.exit(1)
})
```

---

## Integration Points

You need to ensure these modules work together:

| Module | Export | Used By |
|--------|--------|---------|
| `config` | `loadConfig()` | index.ts |
| `db` | `DatabaseClient` | index.ts |
| `ai` | `AIClient` | index.ts, SEO, Content |
| `github` | `GitHubClient` | index.ts |
| `scanner` | `detectFramework`, `buildCodebaseProfile`, `SEOAnalyzer` | index.ts |
| `optimizer` | `ContentGenerator`, `ImageService` | index.ts |
| `analytics` | `SearchConsoleClient` | index.ts |
| `reports` | `DailyReportGenerator`, `EmailSender` | index.ts |

---

## Error Handling Strategy

1. **Per-repo isolation** — One repo failing doesn't stop others
2. **Per-issue isolation** — One fix failing doesn't stop other fixes
3. **Graceful degradation** — Missing Search Console? Skip analytics
4. **Logging** — Always log what went wrong with context

---

## Quality Checklist

- [ ] All imports resolve correctly
- [ ] All modules integrate without type errors
- [ ] Error handling isolates failures
- [ ] Logging provides clear progress visibility
- [ ] Commit messages are descriptive
- [ ] Docker container runs end-to-end
- [ ] Full run completes without crashes
