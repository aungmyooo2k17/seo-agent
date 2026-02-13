# Integrations Engineer — Agent Context

## Your Role

You are the **Integrations Engineer** responsible for:
- GitHub operations (clone, commit, push)
- Google Search Console integration
- Email delivery (Resend)
- Report generation

You connect the system to the outside world.

---

## Your Responsibilities

1. **GitHub Client** — Clone repos, apply changes, commit, push
2. **Search Console** — Fetch metrics from Google
3. **Reports** — Generate daily/weekly reports
4. **Email** — Send reports via Resend

---

## Files You Own

```
/src/github/
├── index.ts              # Re-exports
├── client.ts             # Main GitHubClient class
├── clone.ts              # Clone/pull logic
├── commit.ts             # Commit operations
└── push.ts               # Push operations

/src/analytics/
├── index.ts              # Re-exports
├── search-console.ts     # Google Search Console client
└── tracker.ts            # Impact tracking

/src/reports/
├── index.ts              # Re-exports
├── daily.ts              # Daily report generator
├── weekly.ts             # Weekly report generator
└── email.ts              # Email sender (Resend)
```

---

## Implementation Requirements

### GitHub Client (`/src/github/client.ts`)

```typescript
import simpleGit, { SimpleGit } from 'simple-git'
import * as fs from 'fs'
import * as path from 'path'
import { glob } from 'glob'
import { IGitHubClient } from '@/types/services'
import { RepoConfig, CodeFix } from '@/types'

export class GitHubClient implements IGitHubClient {
  private dataDir: string

  constructor() {
    this.dataDir = process.env.DATA_DIR || './data'
  }

  async cloneOrPull(repo: RepoConfig): Promise<string> {
    const repoPath = path.join(this.dataDir, 'repos', repo.id)

    if (fs.existsSync(repoPath)) {
      // Pull latest
      const git = simpleGit(repoPath)
      await git.fetch('origin', repo.branch)
      await git.reset(['--hard', `origin/${repo.branch}`])
      console.log(`  ✓ Pulled latest for ${repo.id}`)
    } else {
      // Clone
      fs.mkdirSync(path.dirname(repoPath), { recursive: true })
      await simpleGit().clone(repo.url, repoPath, [
        '--branch', repo.branch,
        '--single-branch',
        '--depth', '1',
      ])
      console.log(`  ✓ Cloned ${repo.id}`)
    }

    return repoPath
  }

  async getLatestCommit(repoPath: string): Promise<string> {
    const git = simpleGit(repoPath)
    const log = await git.log({ maxCount: 1 })
    return log.latest?.hash || ''
  }

  async readFile(repoPath: string, filePath: string): Promise<string> {
    const fullPath = path.join(repoPath, filePath)
    return fs.readFileSync(fullPath, 'utf-8')
  }

  async writeFile(repoPath: string, filePath: string, content: string | Buffer): Promise<void> {
    const fullPath = path.join(repoPath, filePath)
    fs.mkdirSync(path.dirname(fullPath), { recursive: true })
    fs.writeFileSync(fullPath, content)
  }

  async listFiles(repoPath: string, pattern?: string): Promise<string[]> {
    return glob(pattern || '**/*', {
      cwd: repoPath,
      nodir: true,
      ignore: ['node_modules/**', '.git/**', 'dist/**', 'build/**', '.next/**'],
    })
  }

  async applyChanges(repoPath: string, changes: CodeFix[]): Promise<void> {
    for (const change of changes) {
      const filePath = path.join(repoPath, change.file)

      switch (change.action) {
        case 'create':
          fs.mkdirSync(path.dirname(filePath), { recursive: true })
          fs.writeFileSync(filePath, change.content!, 'utf-8')
          console.log(`  ✓ Created ${change.file}`)
          break

        case 'modify':
          if (!fs.existsSync(filePath)) {
            console.warn(`  ⚠ File not found: ${change.file}`)
            continue
          }
          const content = fs.readFileSync(filePath, 'utf-8')
          if (!content.includes(change.search!)) {
            console.warn(`  ⚠ Search string not found in ${change.file}`)
            continue
          }
          const newContent = content.replace(change.search!, change.replace!)
          fs.writeFileSync(filePath, newContent, 'utf-8')
          console.log(`  ✓ Modified ${change.file}`)
          break

        case 'delete':
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath)
            console.log(`  ✓ Deleted ${change.file}`)
          }
          break
      }
    }
  }

  async commitAndPush(repoPath: string, message: string, branch: string = 'main'): Promise<string> {
    const git = simpleGit(repoPath)

    // Stage all changes
    await git.add('-A')

    // Check if there are changes
    const status = await git.status()
    if (status.files.length === 0) {
      console.log('  No changes to commit')
      return ''
    }

    // Commit
    const result = await git.commit(message)
    const sha = result.commit

    // Push
    await git.push('origin', branch)

    console.log(`  ✓ Pushed ${sha.slice(0, 7)}`)
    return sha
  }
}
```

### Search Console Client (`/src/analytics/search-console.ts`)

```typescript
import { google } from 'googleapis'
import { ISearchConsoleClient } from '@/types/services'
import { DailyMetrics, PageMetrics, QueryMetrics } from '@/types'

export class SearchConsoleClient implements ISearchConsoleClient {
  private searchconsole: any

  constructor() {
    const credentials = process.env.GOOGLE_SERVICE_ACCOUNT_KEY
    if (!credentials) {
      console.warn('GOOGLE_SERVICE_ACCOUNT_KEY not set, Search Console disabled')
      return
    }

    const auth = new google.auth.GoogleAuth({
      credentials: JSON.parse(credentials),
      scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
    })

    this.searchconsole = google.searchconsole({ version: 'v1', auth })
  }

  async getDailyMetrics(siteUrl: string, date: Date): Promise<DailyMetrics> {
    if (!this.searchconsole) {
      return this.emptyMetrics(date)
    }

    const dateStr = date.toISOString().split('T')[0]

    try {
      // Get aggregate metrics
      const aggResponse = await this.searchconsole.searchanalytics.query({
        siteUrl,
        requestBody: {
          startDate: dateStr,
          endDate: dateStr,
          dimensions: [],
        },
      })

      const agg = aggResponse.data.rows?.[0] || { clicks: 0, impressions: 0, ctr: 0, position: 0 }

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

      const pages: PageMetrics[] = (pagesResponse.data.rows || []).map((row: any) => ({
        page: new URL(row.keys[0]).pathname,
        clicks: row.clicks,
        impressions: row.impressions,
        ctr: row.ctr,
        position: row.position,
      }))

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

      const queries: QueryMetrics[] = (queriesResponse.data.rows || []).map((row: any) => ({
        query: row.keys[0],
        clicks: row.clicks,
        impressions: row.impressions,
        ctr: row.ctr,
        position: row.position,
      }))

      return {
        repoId: '',
        date,
        clicks: agg.clicks,
        impressions: agg.impressions,
        ctr: agg.ctr,
        position: agg.position,
        clicksChange: 0,
        impressionsChange: 0,
        ctrChange: 0,
        positionChange: 0,
        pages,
        queries,
      }
    } catch (error) {
      console.error('Search Console error:', error)
      return this.emptyMetrics(date)
    }
  }

  async getMetricsRange(siteUrl: string, startDate: Date, endDate: Date): Promise<DailyMetrics[]> {
    if (!this.searchconsole) {
      return []
    }

    try {
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
    } catch (error) {
      console.error('Search Console error:', error)
      return []
    }
  }

  private emptyMetrics(date: Date): DailyMetrics {
    return {
      repoId: '',
      date,
      clicks: 0,
      impressions: 0,
      ctr: 0,
      position: 0,
      clicksChange: 0,
      impressionsChange: 0,
      ctrChange: 0,
      positionChange: 0,
      pages: [],
      queries: [],
    }
  }
}
```

### Daily Report Generator (`/src/reports/daily.ts`)

```typescript
import { IDatabase, ISearchConsoleClient } from '@/types/services'
import { DailyReport, RepoReport, RepoConfig, Change } from '@/types'

export class DailyReportGenerator {
  constructor(
    private db: IDatabase,
    private searchConsole: ISearchConsoleClient
  ) {}

  async generate(repos: RepoConfig[]): Promise<DailyReport> {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
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

  private async generateRepoReport(repo: RepoConfig, date: Date): Promise<RepoReport> {
    // Get metrics
    let metrics = { clicks: 0, impressions: 0, ctr: 0, position: 0 }
    if (repo.searchConsole) {
      const m = await this.searchConsole.getDailyMetrics(repo.searchConsole.propertyUrl, date)
      metrics = m
    }

    // Get 7-day average for comparison
    const weekAgo = new Date(date.getTime() - 7 * 24 * 60 * 60 * 1000)
    const weekMetrics = repo.searchConsole
      ? await this.searchConsole.getMetricsRange(repo.searchConsole.propertyUrl, weekAgo, date)
      : []

    const avgClicks = weekMetrics.length > 0
      ? weekMetrics.reduce((sum, m) => sum + m.clicks, 0) / weekMetrics.length
      : 0

    const avgImpressions = weekMetrics.length > 0
      ? weekMetrics.reduce((sum, m) => sum + m.impressions, 0) / weekMetrics.length
      : 0

    // Get changes made
    const changes = await this.db.getChangesForDate(repo.id, date)

    return {
      repoId: repo.id,
      domain: repo.domain,
      metrics: {
        clicks: metrics.clicks,
        clicksChange: avgClicks > 0 ? ((metrics.clicks - avgClicks) / avgClicks) * 100 : 0,
        impressions: metrics.impressions,
        impressionsChange: avgImpressions > 0 ? ((metrics.impressions - avgImpressions) / avgImpressions) * 100 : 0,
        ctr: metrics.ctr,
        ctrChange: 0,
        position: metrics.position,
        positionChange: 0,
      },
      changes,
      topGrowingPages: [],
      issuesFixed: changes.filter(c => !c.type.includes('blog')).length,
      contentPublished: changes.filter(c => c.type === 'blog-published').length,
      imagesGenerated: changes.filter(c => c.type === 'image-added').length,
      nextActions: [],
    }
  }
}
```

### Email Sender (`/src/reports/email.ts`)

```typescript
import { Resend } from 'resend'
import { DailyReport, WeeklyReport } from '@/types'

export class EmailSender {
  private resend: Resend | null
  private from: string
  private to: string[]

  constructor() {
    const apiKey = process.env.RESEND_API_KEY
    this.resend = apiKey ? new Resend(apiKey) : null
    this.from = process.env.EMAIL_FROM || 'SEO Agent <seo@example.com>'
    this.to = (process.env.REPORT_EMAIL || '').split(',').filter(Boolean)
  }

  async sendDailyReport(report: DailyReport): Promise<void> {
    if (!this.resend || this.to.length === 0) {
      console.log('Email not configured, skipping')
      return
    }

    await this.resend.emails.send({
      from: this.from,
      to: this.to,
      subject: `📊 SEO Agent Daily Report — ${report.date.toDateString()}`,
      html: this.renderDailyReport(report),
    })

    console.log(`✓ Daily report sent to ${this.to.join(', ')}`)
  }

  async sendWeeklyReport(report: WeeklyReport): Promise<void> {
    if (!this.resend || this.to.length === 0) return

    await this.resend.emails.send({
      from: this.from,
      to: this.to,
      subject: `📈 SEO Agent Weekly Summary — Week ${report.weekNumber}`,
      html: this.renderWeeklyReport(report),
    })
  }

  private renderDailyReport(report: DailyReport): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    h1 { color: #1a1a1a; }
    .metric { display: inline-block; margin-right: 24px; margin-bottom: 16px; }
    .metric-value { font-size: 28px; font-weight: 700; color: #111; }
    .metric-label { font-size: 12px; color: #666; text-transform: uppercase; }
    .change { font-size: 14px; }
    .positive { color: #16a34a; }
    .negative { color: #dc2626; }
    .section { margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e5e5; }
  </style>
</head>
<body>
  <h1>📊 SEO Agent Daily Report</h1>
  <p style="color: #666;">${report.date.toDateString()}</p>

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
    <div class="section">
      <h2>${repo.domain}</h2>
      <div class="metric">
        <div class="metric-value">${repo.metrics.clicks.toLocaleString()}</div>
        <div class="metric-label">Clicks</div>
        <div class="change ${repo.metrics.clicksChange >= 0 ? 'positive' : 'negative'}">
          ${repo.metrics.clicksChange >= 0 ? '+' : ''}${repo.metrics.clicksChange.toFixed(1)}%
        </div>
      </div>
      ${repo.changes.length > 0 ? `
        <h3>Changes Made</h3>
        <ul>
          ${repo.changes.map(c => `<li>${c.description}</li>`).join('')}
        </ul>
      ` : '<p>No changes made</p>'}
    </div>
  `).join('')}

  <hr style="margin: 40px 0; border: none; border-top: 1px solid #e5e5e5;">
  <p style="color: #999; font-size: 12px;">Generated by SEO Agent</p>
</body>
</html>
`
  }

  private renderWeeklyReport(report: WeeklyReport): string {
    // Similar to daily but with weekly aggregates
    return this.renderDailyReport(report)
  }
}
```

---

## Dependencies

**NPM Packages:**
- `simple-git` — Git operations
- `googleapis` — Google APIs
- `resend` — Email delivery
- `glob` — File pattern matching

**Other Agents:**
- Types from Backend Engineer
- Database client from Backend Engineer

**Environment Variables:**
- `GITHUB_TOKEN`
- `GOOGLE_SERVICE_ACCOUNT_KEY`
- `RESEND_API_KEY`
- `EMAIL_FROM`
- `REPORT_EMAIL`
- `DATA_DIR`

---

## Quality Checklist

- [ ] GitHub client handles clone, pull, commit, push
- [ ] Search Console fetches metrics correctly
- [ ] Reports generate valid HTML
- [ ] Email delivery works with Resend
- [ ] Graceful handling when APIs are not configured
- [ ] JSDoc comments on public APIs
- [ ] Exports via index.ts
