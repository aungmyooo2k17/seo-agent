# QA Engineer — Agent Context

## Your Role

You are the **QA Engineer** responsible for:
- Testing all modules
- Validating AI outputs
- Finding edge cases
- Ensuring production readiness

You are the last line of defense before deployment.

---

## Your Responsibilities

1. **Unit Tests** — Test individual functions and classes
2. **Integration Tests** — Test module interactions
3. **End-to-End Tests** — Test full workflow with real repos
4. **AI Output Validation** — Ensure AI generates valid responses

---

## Files You Own

```
/tests/
├── unit/
│   ├── config.test.ts
│   ├── ai-client.test.ts
│   ├── github-client.test.ts
│   ├── seo-analyzer.test.ts
│   └── content-generator.test.ts
├── integration/
│   ├── scanner.test.ts
│   ├── optimizer.test.ts
│   └── reports.test.ts
├── e2e/
│   └── full-run.test.ts
├── fixtures/
│   ├── repos/                  # Sample repo structures
│   │   ├── nextjs-app/
│   │   ├── astro/
│   │   └── html/
│   └── responses/              # Mock AI responses
├── setup.ts                    # Test setup
└── helpers.ts                  # Test utilities
```

---

## Prerequisites

**Before you start, ALL other agents must be complete:**
- [ ] All source code implemented
- [ ] Docker build succeeds
- [ ] Architect has integrated everything

---

## Test Categories

### 1. Configuration Tests

```typescript
// tests/unit/config.test.ts

import { loadConfig } from '@/config'
import * as fs from 'fs'

describe('Config Loader', () => {
  beforeEach(() => {
    // Set required env vars
    process.env.ANTHROPIC_API_KEY = 'test-key'
    process.env.GITHUB_TOKEN = 'test-token'
  })

  it('loads repos from config file', () => {
    const config = loadConfig()
    expect(config.repos).toBeDefined()
    expect(Array.isArray(config.repos)).toBe(true)
  })

  it('throws if ANTHROPIC_API_KEY is missing', () => {
    delete process.env.ANTHROPIC_API_KEY
    expect(() => loadConfig()).toThrow('ANTHROPIC_API_KEY')
  })

  it('uses default AI model if not specified', () => {
    delete process.env.AI_MODEL
    const config = loadConfig()
    expect(config.ai.model).toBe('claude-sonnet-4-20250514')
  })

  it('parses image config correctly', () => {
    process.env.IMAGE_PROVIDER = 'openai'
    process.env.MAX_IMAGES_PER_DAY = '10'
    const config = loadConfig()
    expect(config.images.provider).toBe('openai')
    expect(config.images.maxPerDay).toBe(10)
  })
})
```

### 2. AI Client Tests

```typescript
// tests/unit/ai-client.test.ts

import { AIClient } from '@/ai'

describe('AI Client', () => {
  let client: AIClient

  beforeEach(() => {
    process.env.ANTHROPIC_API_KEY = 'test-key'
    client = new AIClient()
  })

  it('throws if API key is missing', () => {
    delete process.env.ANTHROPIC_API_KEY
    expect(() => new AIClient()).toThrow('ANTHROPIC_API_KEY')
  })

  // Note: Integration tests with real API should be separate
  // and only run manually with valid API key

  describe('response parsing', () => {
    it('parses JSON from AI response', () => {
      const response = '{"title": "Test", "description": "Test desc"}'
      const parsed = JSON.parse(response)
      expect(parsed.title).toBe('Test')
    })

    it('handles malformed JSON gracefully', () => {
      const response = 'not valid json'
      expect(() => JSON.parse(response)).toThrow()
    })
  })
})
```

### 3. Framework Detection Tests

```typescript
// tests/unit/scanner.test.ts

import { detectFramework } from '@/scanner/detector'
import * as path from 'path'

describe('Framework Detection', () => {
  const fixturesPath = path.join(__dirname, '../fixtures/repos')

  it('detects Next.js App Router', async () => {
    const result = await detectFramework(path.join(fixturesPath, 'nextjs-app'))
    expect(result).toBe('nextjs-app')
  })

  it('detects Astro', async () => {
    const result = await detectFramework(path.join(fixturesPath, 'astro'))
    expect(result).toBe('astro')
  })

  it('detects plain HTML', async () => {
    const result = await detectFramework(path.join(fixturesPath, 'html'))
    expect(result).toBe('html')
  })

  it('returns unknown for empty directory', async () => {
    const result = await detectFramework(path.join(fixturesPath, 'empty'))
    expect(result).toBe('unknown')
  })
})
```

### 4. SEO Analyzer Tests

```typescript
// tests/unit/seo-analyzer.test.ts

import { SEOAnalyzer } from '@/scanner/seo-analyzer'
import { CodebaseProfile, PageInfo } from '@/types'

describe('SEO Analyzer', () => {
  const mockAI = {
    findSEOIssues: jest.fn().mockResolvedValue([]),
    // ... other methods
  }

  let analyzer: SEOAnalyzer

  beforeEach(() => {
    analyzer = new SEOAnalyzer(mockAI as any)
  })

  describe('Meta Issues', () => {
    it('detects missing title', async () => {
      const profile: CodebaseProfile = {
        // ... minimal profile
        pages: [{
          path: '/about',
          filePath: 'app/about/page.tsx',
          title: undefined,
          description: 'About us',
          hasOgImage: false,
          hasSchema: false,
          images: [],
          internalLinks: [],
          wordCount: 500,
          lastModified: new Date(),
        }],
      } as any

      const issues = await analyzer.analyze(profile)
      const titleIssue = issues.find(i => i.type === 'missing-meta-title')
      expect(titleIssue).toBeDefined()
      expect(titleIssue?.page).toBe('/about')
    })

    it('detects title too long', async () => {
      const profile: CodebaseProfile = {
        pages: [{
          path: '/',
          filePath: 'app/page.tsx',
          title: 'A'.repeat(70), // > 60 chars
          description: 'Test',
          hasOgImage: true,
          hasSchema: false,
          images: [],
          internalLinks: [],
          wordCount: 500,
          lastModified: new Date(),
        }],
      } as any

      const issues = await analyzer.analyze(profile)
      const longTitle = issues.find(i => i.type === 'title-too-long')
      expect(longTitle).toBeDefined()
    })

    it('detects duplicate titles', async () => {
      const profile: CodebaseProfile = {
        pages: [
          { path: '/a', title: 'Same Title', ...defaultPage },
          { path: '/b', title: 'Same Title', ...defaultPage },
        ],
      } as any

      const issues = await analyzer.analyze(profile)
      const dupTitle = issues.find(i => i.type === 'duplicate-title')
      expect(dupTitle).toBeDefined()
    })
  })

  describe('Structural Issues', () => {
    it('detects missing sitemap', async () => {
      const profile: CodebaseProfile = {
        seoPatterns: { existingSitemap: null },
        pages: [],
      } as any

      const issues = await analyzer.analyze(profile)
      const sitemapIssue = issues.find(i => i.type === 'missing-sitemap')
      expect(sitemapIssue).toBeDefined()
      expect(sitemapIssue?.autoFixable).toBe(true)
    })
  })

  describe('Image Issues', () => {
    it('detects missing alt text', async () => {
      const profile: CodebaseProfile = {
        pages: [{
          path: '/',
          images: [{ src: '/img.png', alt: '', isLocal: true }],
          ...defaultPage,
        }],
      } as any

      const issues = await analyzer.analyze(profile)
      const altIssue = issues.find(i => i.type === 'missing-alt-text')
      expect(altIssue).toBeDefined()
    })
  })
})
```

### 5. GitHub Client Tests

```typescript
// tests/unit/github-client.test.ts

import { GitHubClient } from '@/github'
import * as fs from 'fs'
import * as path from 'path'

describe('GitHub Client', () => {
  let client: GitHubClient
  const testDir = path.join(__dirname, '../tmp/github-test')

  beforeEach(() => {
    process.env.DATA_DIR = testDir
    client = new GitHubClient()
    fs.mkdirSync(testDir, { recursive: true })
  })

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true })
  })

  describe('File Operations', () => {
    it('writes and reads files', async () => {
      const repoPath = path.join(testDir, 'test-repo')
      fs.mkdirSync(repoPath, { recursive: true })

      await client.writeFile(repoPath, 'test.txt', 'Hello World')
      const content = await client.readFile(repoPath, 'test.txt')
      expect(content).toBe('Hello World')
    })

    it('creates nested directories', async () => {
      const repoPath = path.join(testDir, 'test-repo')
      fs.mkdirSync(repoPath, { recursive: true })

      await client.writeFile(repoPath, 'a/b/c/test.txt', 'Nested')
      const content = await client.readFile(repoPath, 'a/b/c/test.txt')
      expect(content).toBe('Nested')
    })

    it('lists files excluding node_modules', async () => {
      const repoPath = path.join(testDir, 'test-repo')
      fs.mkdirSync(path.join(repoPath, 'src'), { recursive: true })
      fs.mkdirSync(path.join(repoPath, 'node_modules/pkg'), { recursive: true })
      fs.writeFileSync(path.join(repoPath, 'src/index.ts'), '')
      fs.writeFileSync(path.join(repoPath, 'node_modules/pkg/index.js'), '')

      const files = await client.listFiles(repoPath)
      expect(files).toContain('src/index.ts')
      expect(files).not.toContain('node_modules/pkg/index.js')
    })
  })

  describe('Change Application', () => {
    it('applies create action', async () => {
      const repoPath = path.join(testDir, 'test-repo')
      fs.mkdirSync(repoPath, { recursive: true })

      await client.applyChanges(repoPath, [{
        issueId: 'test',
        file: 'new-file.ts',
        action: 'create',
        content: 'export const x = 1',
        description: 'Test',
      }])

      const content = await client.readFile(repoPath, 'new-file.ts')
      expect(content).toBe('export const x = 1')
    })

    it('applies modify action', async () => {
      const repoPath = path.join(testDir, 'test-repo')
      fs.mkdirSync(repoPath, { recursive: true })
      fs.writeFileSync(path.join(repoPath, 'file.ts'), 'const a = 1')

      await client.applyChanges(repoPath, [{
        issueId: 'test',
        file: 'file.ts',
        action: 'modify',
        search: 'const a = 1',
        replace: 'const a = 2',
        description: 'Test',
      }])

      const content = await client.readFile(repoPath, 'file.ts')
      expect(content).toBe('const a = 2')
    })
  })
})
```

### 6. Content Generator Tests

```typescript
// tests/unit/content-generator.test.ts

import { ContentGenerator } from '@/optimizer/content'

describe('Content Generator', () => {
  describe('shouldGenerateContent', () => {
    const generator = new ContentGenerator({} as any, {} as any)

    it('returns true if never published', () => {
      const repo = { settings: { contentFrequency: 'daily' } } as any
      expect(generator.shouldGenerateContent(repo, null)).toBe(true)
    })

    it('returns true for daily after 1 day', () => {
      const repo = { settings: { contentFrequency: 'daily' } } as any
      const yesterday = new Date(Date.now() - 25 * 60 * 60 * 1000)
      expect(generator.shouldGenerateContent(repo, yesterday)).toBe(true)
    })

    it('returns false for daily within same day', () => {
      const repo = { settings: { contentFrequency: 'daily' } } as any
      const today = new Date(Date.now() - 12 * 60 * 60 * 1000)
      expect(generator.shouldGenerateContent(repo, today)).toBe(false)
    })

    it('returns true for weekly after 7 days', () => {
      const repo = { settings: { contentFrequency: 'weekly' } } as any
      const lastWeek = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000)
      expect(generator.shouldGenerateContent(repo, lastWeek)).toBe(true)
    })
  })
})
```

### 7. Integration Tests

```typescript
// tests/integration/scanner.test.ts

import { detectFramework } from '@/scanner/detector'
import { buildCodebaseProfile } from '@/scanner/profiler'
import { AIClient } from '@/ai'

describe('Scanner Integration', () => {
  // Only run with real API key
  const shouldRun = process.env.ANTHROPIC_API_KEY?.startsWith('sk-ant')

  it.skipIf(!shouldRun)('scans a Next.js app router project', async () => {
    const repoPath = './tests/fixtures/repos/nextjs-app'

    const framework = await detectFramework(repoPath)
    expect(framework).toBe('nextjs-app')

    const ai = new AIClient()
    const files = await listFiles(repoPath)
    const profile = await buildCodebaseProfile(repoPath, framework, files, ai)

    expect(profile.framework).toBe('nextjs-app')
    expect(profile.pages.length).toBeGreaterThan(0)
  }, 60000) // Longer timeout for AI
})
```

### 8. End-to-End Test

```typescript
// tests/e2e/full-run.test.ts

/**
 * End-to-end test that runs the full SEO Agent workflow
 * against a test repository.
 *
 * WARNING: This test makes real API calls and modifies repos.
 * Only run manually with proper test environment.
 */

describe('Full Run E2E', () => {
  const shouldRun = process.env.E2E_TEST === 'true'

  it.skipIf(!shouldRun)('processes a test repository end-to-end', async () => {
    // 1. Set up test config
    process.env.CONFIG_PATH = './tests/fixtures/test-config.json'

    // 2. Run main
    const { main } = await import('@/index')
    await main()

    // 3. Verify changes were made
    // ... assertions about commits, database entries, etc.
  }, 300000) // 5 minute timeout
})
```

---

## Test Fixtures

### Sample Next.js App (`tests/fixtures/repos/nextjs-app/`)

```
nextjs-app/
├── package.json          # { "dependencies": { "next": "14.0.0" } }
├── app/
│   ├── layout.tsx
│   ├── page.tsx          # Missing meta!
│   └── about/
│       └── page.tsx      # Has meta
└── public/
    └── favicon.ico
```

### Sample Astro Project (`tests/fixtures/repos/astro/`)

```
astro/
├── package.json          # { "dependencies": { "astro": "4.0.0" } }
├── astro.config.mjs
└── src/
    └── pages/
        ├── index.astro
        └── about.astro
```

### Sample HTML Site (`tests/fixtures/repos/html/`)

```
html/
├── index.html            # Missing meta
├── about.html            # Has meta
└── styles.css
```

---

## AI Output Validation

Test that AI returns valid, parseable responses:

```typescript
describe('AI Output Validation', () => {
  it('generateBlog returns valid BlogPost', async () => {
    const ai = new AIClient()
    const post = await ai.generateBlog('Test Topic', 'test keyword', mockProfile, mockSettings)

    // Required fields
    expect(typeof post.title).toBe('string')
    expect(post.title.length).toBeLessThanOrEqual(60)
    expect(typeof post.slug).toBe('string')
    expect(post.slug).toMatch(/^[a-z0-9-]+$/)
    expect(typeof post.content).toBe('string')
    expect(post.content.length).toBeGreaterThan(500)
    expect(typeof post.metaDescription).toBe('string')
    expect(post.metaDescription.length).toBeLessThanOrEqual(155)
  })

  it('generateFix returns valid CodeFix', async () => {
    const ai = new AIClient()
    const fix = await ai.generateFix(mockIssue, mockProfile, mockFileContent)

    expect(['create', 'modify', 'delete']).toContain(fix.action)
    expect(typeof fix.file).toBe('string')
    expect(typeof fix.description).toBe('string')

    if (fix.action === 'modify') {
      expect(typeof fix.search).toBe('string')
      expect(typeof fix.replace).toBe('string')
    }
  })
})
```

---

## Test Setup

```typescript
// tests/setup.ts

import * as dotenv from 'dotenv'

// Load test environment
dotenv.config({ path: '.env.test' })

// Global mocks
jest.mock('@/ai/client', () => ({
  AIClient: jest.fn().mockImplementation(() => ({
    chat: jest.fn(),
    generateBlog: jest.fn(),
    generateFix: jest.fn(),
    // ... etc
  })),
}))
```

---

## Quality Checklist

- [ ] All unit tests pass
- [ ] All integration tests pass (with real API)
- [ ] E2E test runs successfully
- [ ] AI outputs are validated
- [ ] Edge cases are covered:
  - [ ] Empty repos
  - [ ] Repos with no pages
  - [ ] Repos with 100+ pages
  - [ ] Unknown frameworks
  - [ ] Missing env vars
  - [ ] API failures
  - [ ] Network timeouts
- [ ] Test coverage > 80%
- [ ] No flaky tests

---

## Running Tests

```bash
# Unit tests (fast, no API)
npm run test:unit

# Integration tests (requires API keys)
npm run test:integration

# E2E test (requires full setup)
E2E_TEST=true npm run test:e2e

# All tests
npm test

# With coverage
npm run test:coverage
```
