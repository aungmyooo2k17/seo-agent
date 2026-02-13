/**
 * Test utilities and mock factories
 * Provides consistent test data creation across test suites
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import type {
  PageInfo,
  CodebaseProfile,
  SEOIssue,
  IAIClient,
  IDatabase,
  RepoConfig,
  RepoSettings,
  DailyMetrics,
  Change,
  BlogPost,
  CodeFix,
  Message,
  ChatOptions,
  ImagePromptContext,
  DailyReport,
  WeeklyReport,
  ImageRecord,
} from '../src/types';

/**
 * Create a mock PageInfo object with sensible defaults
 */
export function createMockPageInfo(overrides?: Partial<PageInfo>): PageInfo {
  return {
    path: '/about',
    filePath: 'app/about/page.tsx',
    title: 'About Us',
    description: 'Learn more about our company and mission',
    hasOgImage: false,
    hasSchema: false,
    images: [],
    internalLinks: ['/'],
    wordCount: 500,
    lastModified: new Date('2024-01-15'),
    ...overrides,
  };
}

/**
 * Create a mock CodebaseProfile with sensible defaults
 */
export function createMockCodebaseProfile(overrides?: Partial<CodebaseProfile>): CodebaseProfile {
  return {
    repoId: 'test-repo',
    scannedAt: new Date('2024-01-20'),
    commitHash: 'abc123def456',
    framework: 'nextjs-app',
    frameworkVersion: '14.0.0',
    structure: {
      pagesDir: 'app',
      componentsDir: 'components',
      publicDir: 'public',
      contentDir: 'content',
      layoutFiles: ['app/layout.tsx'],
      configFiles: ['next.config.js'],
    },
    seoPatterns: {
      metaHandling: 'metadata-export',
      existingSitemap: null,
      existingRobots: null,
      existingSchema: [],
      hasOgImages: false,
      hasFavicon: true,
    },
    buildSystem: {
      packageManager: 'npm',
      buildCommand: 'npm run build',
      devCommand: 'npm run dev',
      outDir: '.next',
    },
    pages: [createMockPageInfo()],
    safeZones: ['app/', 'public/'],
    dangerZones: ['node_modules/', '.git/'],
    ...overrides,
  };
}

/**
 * Create a mock SEOIssue with sensible defaults
 */
export function createMockSEOIssue(overrides?: Partial<SEOIssue>): SEOIssue {
  return {
    id: 'missing-meta-title:/about',
    type: 'missing-meta-title',
    severity: 'critical',
    page: '/about',
    file: 'app/about/page.tsx',
    description: 'Page "/about" is missing a title tag',
    recommendation: 'Add a descriptive title tag that includes relevant keywords',
    autoFixable: true,
    ...overrides,
  };
}

/**
 * Create a mock RepoConfig with sensible defaults
 */
export function createMockRepoConfig(overrides?: Partial<RepoConfig>): RepoConfig {
  return {
    id: 'test-repo',
    url: 'git@github.com:test/repo.git',
    branch: 'main',
    domain: 'https://example.com',
    settings: createMockRepoSettings(),
    ...overrides,
  };
}

/**
 * Create a mock RepoSettings with sensible defaults
 */
export function createMockRepoSettings(overrides?: Partial<RepoSettings>): RepoSettings {
  return {
    contentFrequency: 'weekly',
    tone: 'professional',
    topics: ['technology', 'programming'],
    maxBlogsPerWeek: 2,
    maxImagesPerDay: 5,
    excludePaths: ['node_modules', '.git'],
    ...overrides,
  };
}

/**
 * Create a mock DailyMetrics with sensible defaults
 */
export function createMockDailyMetrics(overrides?: Partial<DailyMetrics>): DailyMetrics {
  return {
    repoId: 'test-repo',
    date: new Date('2024-01-20'),
    clicks: 150,
    impressions: 5000,
    ctr: 0.03,
    position: 8.5,
    clicksChange: 10,
    impressionsChange: 5,
    ctrChange: 2,
    positionChange: -1,
    pages: [
      { page: '/about', clicks: 50, impressions: 1000, ctr: 0.05, position: 5 },
      { page: '/blog', clicks: 100, impressions: 4000, ctr: 0.025, position: 10 },
    ],
    queries: [
      { query: 'test company', clicks: 30, impressions: 500, ctr: 0.06, position: 3 },
    ],
    ...overrides,
  };
}

/**
 * Create a mock Change with sensible defaults
 */
export function createMockChange(overrides?: Partial<Change>): Change {
  return {
    id: 'change-123',
    repoId: 'test-repo',
    timestamp: new Date('2024-01-20T10:30:00Z'),
    type: 'meta-title',
    file: 'app/about/page.tsx',
    description: 'Added meta title to about page',
    commitSha: 'abc123',
    affectedPages: ['/about'],
    expectedImpact: 'Improved search visibility for about page',
    ...overrides,
  };
}

/**
 * Create a mock BlogPost with sensible defaults
 */
export function createMockBlogPost(overrides?: Partial<BlogPost>): BlogPost {
  return {
    id: 'post-123',
    repoId: 'test-repo',
    title: 'Understanding SEO Best Practices',
    slug: 'understanding-seo-best-practices',
    content: '# Understanding SEO\n\nSEO is important for visibility...',
    excerpt: 'Learn the fundamentals of SEO optimization',
    targetKeyword: 'seo best practices',
    secondaryKeywords: ['seo tips', 'search optimization'],
    metaDescription: 'Comprehensive guide to SEO best practices for modern websites',
    author: 'SEO Agent',
    publishedAt: new Date('2024-01-20'),
    frontmatter: { category: 'SEO' },
    filePath: 'content/blog/understanding-seo-best-practices.mdx',
    format: 'mdx',
    ...overrides,
  };
}

/**
 * Create a mock CodeFix with sensible defaults
 */
export function createMockCodeFix(overrides?: Partial<CodeFix>): CodeFix {
  return {
    issueId: 'missing-meta-title:/about',
    file: 'app/about/page.tsx',
    action: 'modify',
    search: 'export default function About()',
    replace: `import type { Metadata } from 'next'\n\nexport const metadata: Metadata = {\n  title: 'About Us',\n  description: 'Learn about our company',\n}\n\nexport default function About()`,
    description: 'Added metadata export for title and description',
    ...overrides,
  };
}

/**
 * Create a mock IAIClient with all methods mocked
 */
export function createMockAIClient(): jest.Mocked<IAIClient> {
  return {
    chat: jest.fn().mockResolvedValue('{"result": "test"}'),
    analyzeCodebase: jest.fn().mockResolvedValue(createMockCodebaseProfile()),
    findSEOIssues: jest.fn().mockResolvedValue([createMockSEOIssue()]),
    generateFix: jest.fn().mockResolvedValue(createMockCodeFix()),
    generateBlog: jest.fn().mockResolvedValue(createMockBlogPost()),
    generateImagePrompt: jest.fn().mockResolvedValue('A professional office scene with modern aesthetics'),
    generateAltText: jest.fn().mockResolvedValue('Team members collaborating in a modern office'),
  };
}

/**
 * Create a mock IDatabase with all methods mocked
 */
export function createMockDatabase(): jest.Mocked<IDatabase> {
  return {
    getRepo: jest.fn().mockResolvedValue(createMockRepoConfig()),
    saveRepo: jest.fn().mockResolvedValue(undefined),
    getCodebaseProfile: jest.fn().mockResolvedValue(createMockCodebaseProfile()),
    saveCodebaseProfile: jest.fn().mockResolvedValue(undefined),
    getMetrics: jest.fn().mockResolvedValue(createMockDailyMetrics()),
    saveMetrics: jest.fn().mockResolvedValue(undefined),
    getMetricsRange: jest.fn().mockResolvedValue([createMockDailyMetrics()]),
    getChange: jest.fn().mockResolvedValue(createMockChange()),
    saveChange: jest.fn().mockResolvedValue(undefined),
    getChangesForDate: jest.fn().mockResolvedValue([createMockChange()]),
    updateChange: jest.fn().mockResolvedValue(undefined),
    getContent: jest.fn().mockResolvedValue(createMockBlogPost()),
    saveContent: jest.fn().mockResolvedValue(undefined),
    getContentTitles: jest.fn().mockResolvedValue(['Existing Post Title']),
    getLastPublishedDate: jest.fn().mockResolvedValue(new Date('2024-01-10')),
    saveIssues: jest.fn().mockResolvedValue(undefined),
    getPendingIssues: jest.fn().mockResolvedValue([createMockSEOIssue()]),
    getImageCountForDay: jest.fn().mockResolvedValue(0),
    saveImageRecord: jest.fn().mockResolvedValue(undefined),
    saveReport: jest.fn().mockResolvedValue(undefined),
  };
}

/**
 * Create a temporary directory for test files
 * @returns Path to the temporary directory
 */
export function createTempDir(): string {
  const prefix = path.join(os.tmpdir(), 'seo-test-');
  const tmpDir = fs.mkdtempSync(prefix);
  return tmpDir;
}

/**
 * Clean up a temporary directory
 * @param dir - Path to the directory to remove
 */
export function cleanupTempDir(dir: string): void {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

/**
 * Create a test fixture directory with files
 * @param baseDir - Base directory to create fixtures in
 * @param files - Map of relative paths to file contents
 */
export function createFixtureFiles(baseDir: string, files: Record<string, string>): void {
  for (const [filePath, content] of Object.entries(files)) {
    const fullPath = path.join(baseDir, filePath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content, 'utf-8');
  }
}

/**
 * Wait for a specified number of milliseconds
 */
export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Create a mock fetch response
 */
export function createMockFetchResponse(data: unknown, options?: { status?: number; ok?: boolean }) {
  return {
    ok: options?.ok ?? true,
    status: options?.status ?? 200,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
  };
}

/**
 * Create a mock Anthropic API response
 */
export function createMockAnthropicResponse(content: string) {
  return createMockFetchResponse({
    content: [{ type: 'text', text: content }],
    usage: { input_tokens: 100, output_tokens: 50 },
  });
}

/**
 * Assert that a function throws with a specific message
 */
export async function expectAsyncThrow(
  fn: () => Promise<unknown>,
  messageMatch: string | RegExp
): Promise<void> {
  let thrown = false;
  try {
    await fn();
  } catch (e) {
    thrown = true;
    const message = (e as Error).message;
    if (typeof messageMatch === 'string') {
      expect(message).toContain(messageMatch);
    } else {
      expect(message).toMatch(messageMatch);
    }
  }
  expect(thrown).toBe(true);
}
