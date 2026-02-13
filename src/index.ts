/**
 * SEO Agent Main Orchestrator
 *
 * Coordinates the entire SEO automation workflow:
 * 1. Loads configuration and initializes services
 * 2. Processes each repository (analyze, fix, generate content)
 * 3. Generates and sends daily/weekly reports
 *
 * Designed for autonomous operation with robust error isolation.
 */

// Configuration & Database
import { loadConfig } from './config';
import { DatabaseClient } from './db';

// AI
import { AIClient } from './ai';

// GitHub
import { GitHubClient } from './github';

// Scanner
import {
  CodebaseProfiler,
  SEOAnalyzer,
  getHandler,
  type IFileReader,
} from './scanner';

// Optimizer
import { ContentGenerator } from './optimizer/content';
import { ImageService } from './optimizer/images';

// Analytics & Reports
import { SearchConsoleClient, ChangeTracker } from './analytics';
import { DailyReportGenerator, WeeklyReportGenerator, EmailSender } from './reports';

// Types
import type {
  Config,
  RepoConfig,
  CodebaseProfile,
  CodeFix,
  Change,
  ChangeType,
} from './types';

// =============================================================================
// Service Container
// =============================================================================

/**
 * Container for all initialized services
 * Passed to repository processing for dependency injection
 */
interface Services {
  config: Config;
  db: DatabaseClient;
  ai: AIClient;
  github: GitHubClient;
  searchConsole: SearchConsoleClient;
  imageService: ImageService;
  contentGenerator: ContentGenerator;
  changeTracker: ChangeTracker;
}

// =============================================================================
// Repository Processing
// =============================================================================

/**
 * Process a single repository through the SEO optimization pipeline
 *
 * Steps:
 * 1. Clone/pull repository
 * 2. Analyze codebase (detect framework, profile, find SEO issues)
 * 3. Auto-fix eligible issues
 * 4. Generate content if due
 * 5. Commit and push changes
 * 6. Fetch analytics
 *
 * @param repo - Repository configuration
 * @param services - Initialized service container
 */
async function processRepository(repo: RepoConfig, services: Services): Promise<void> {
  const { db, ai, github, searchConsole, contentGenerator, changeTracker } = services;

  // Step 1: Clone or pull repository
  console.log(`  [sync] Syncing repository...`);
  const repoPath = await github.cloneOrPull(repo);
  const currentCommit = await github.getLatestCommit(repoPath);

  // Step 2: Build or use cached codebase profile
  console.log(`  [scan] Analyzing codebase...`);
  let profile = await db.getCodebaseProfile(repo.id);
  const needsRescan = !profile || profile.commitHash !== currentCommit;

  if (needsRescan) {
    // Create file reader adapter for the profiler
    const fileReader: IFileReader = {
      readFile: (path: string) => github.readFile(repoPath, path),
      listFiles: (pattern?: string) => github.listFiles(repoPath, pattern),
    };

    const profiler = new CodebaseProfiler(fileReader, {
      repoId: repo.id,
      commitHash: currentCommit,
      excludePaths: repo.settings.excludePaths,
    });

    profile = await profiler.profile();
    await db.saveCodebaseProfile(profile);
    console.log(`  [scan] Framework: ${profile.framework}, ${profile.pages.length} pages indexed`);
  } else {
    console.log(`  [scan] Using cached profile (commit unchanged)`);
  }

  // At this point profile is guaranteed to exist
  if (!profile) {
    throw new Error('Failed to load or create codebase profile');
  }

  // Step 3: Analyze for SEO issues
  console.log(`  [analyze] Finding SEO issues...`);
  const analyzer = new SEOAnalyzer(ai);
  const issues = await analyzer.analyze(profile);
  await db.saveIssues(repo.id, issues);

  const criticalCount = issues.filter((i) => i.severity === 'critical').length;
  const warningCount = issues.filter((i) => i.severity === 'warning').length;
  console.log(`  [analyze] Found ${issues.length} issues (${criticalCount} critical, ${warningCount} warnings)`);

  // Step 4: Fix auto-fixable issues (limit to 10 per run to avoid large commits)
  const fixableIssues = issues.filter((i) => i.autoFixable).slice(0, 10);
  const fixes: CodeFix[] = [];

  if (fixableIssues.length > 0) {
    console.log(`  [fix] Fixing ${fixableIssues.length} auto-fixable issues...`);

    for (const issue of fixableIssues) {
      try {
        const fileContent = issue.file ? await github.readFile(repoPath, issue.file) : '';
        const fix = await ai.generateFix(issue, profile, fileContent);
        fixes.push(fix);
      } catch (error) {
        const errMessage = error instanceof Error ? error.message : String(error);
        console.warn(`    [fix] Could not fix ${issue.id}: ${errMessage}`);
      }
    }

    if (fixes.length > 0) {
      await github.applyChanges(repoPath, fixes);
      console.log(`  [fix] Applied ${fixes.length} fixes`);
    }
  }

  // Step 5: Generate content if due
  const changes: Change[] = [];
  const lastPublished = await db.getLastPublishedDate(repo.id);

  if (contentGenerator.shouldGenerateContent(repo, lastPublished)) {
    console.log(`  [content] Generating new content...`);

    try {
      // Use DefaultFrameworkHandler for content generation
      // This adapts the framework-specific handler to the content generator's interface
      const contentHandler = createContentHandler(profile);
      const topic = repo.settings.topics[0] ?? 'general';

      // Generate blog post with featured image
      const { post, imageBuffer, imagePath } = await contentGenerator.generatePost(
        topic,
        topic,
        profile,
        repo.settings,
        contentHandler
      );

      // Save image file if generated
      if (imageBuffer.length > 0 && imagePath) {
        await github.writeFile(repoPath, imagePath, imageBuffer);
        console.log(`  [content] Generated image: ${imagePath}`);
      }

      // Save blog post
      const formattedPost = contentGenerator.formatForFramework(post, contentHandler);
      await github.writeFile(repoPath, post.filePath, formattedPost);
      await db.saveContent(repo.id, post);
      console.log(`  [content] Published: ${post.title}`);

      changes.push({
        id: `${repo.id}-${Date.now()}-blog`,
        repoId: repo.id,
        timestamp: new Date(),
        type: 'blog-published',
        file: post.filePath,
        description: `Published: ${post.title}`,
        commitSha: '',
        affectedPages: [post.filePath],
        expectedImpact: 'New content indexed within 1-2 weeks',
      });
    } catch (error) {
      const errMessage = error instanceof Error ? error.message : String(error);
      console.warn(`  [content] Content generation failed: ${errMessage}`);
    }
  } else {
    const daysUntil = contentGenerator.getDaysUntilNextContent(repo, lastPublished);
    if (daysUntil > 0) {
      console.log(`  [content] Next content due in ${daysUntil} day(s)`);
    }
  }

  // Step 6: Commit and push changes
  const totalChanges = fixes.length + changes.length;
  if (totalChanges > 0) {
    console.log(`  [git] Committing ${totalChanges} changes...`);
    const commitMessage = generateCommitMessage(fixes, changes);
    const commitSha = await github.commitAndPush(repoPath, commitMessage, repo.branch);

    if (commitSha) {
      // Record fixes as tracked changes
      for (const fix of fixes) {
        await changeTracker.trackChange({
          repoId: repo.id,
          type: inferChangeType(fix),
          file: fix.file,
          description: fix.description,
          commitSha,
          affectedPages: [],
          expectedImpact: 'Improved search appearance',
        });
      }

      // Record content changes with commit SHA
      for (const change of changes) {
        change.commitSha = commitSha;
        await db.saveChange(change);
      }

      console.log(`  [git] Pushed commit: ${commitSha.slice(0, 7)}`);
    } else {
      console.log(`  [git] No changes to commit`);
    }
  }

  // Step 7: Fetch analytics (if Search Console is configured)
  if (repo.searchConsole) {
    console.log(`  [analytics] Fetching metrics...`);
    try {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const metrics = await searchConsole.getDailyMetrics(repo.searchConsole.propertyUrl, yesterday);
      metrics.repoId = repo.id;
      await db.saveMetrics(metrics);
      console.log(
        `  [analytics] ${metrics.clicks} clicks, ${metrics.impressions} impressions (yesterday)`
      );
    } catch (error) {
      const errMessage = error instanceof Error ? error.message : String(error);
      console.warn(`  [analytics] Could not fetch metrics: ${errMessage}`);
    }
  }

  // Step 8: Measure impact of past changes (if enough time has passed)
  try {
    await changeTracker.measurePendingImpacts(repo.id);
  } catch (error) {
    // Non-critical, don't warn loudly
  }
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Content handler interface for the ContentGenerator
 * Matches the IFrameworkHandler expected by optimizer/content.ts
 */
interface ContentFrameworkHandler {
  readonly framework: string;
  getContentDir(profile: CodebaseProfile): string;
  getContentExtension(): 'mdx' | 'md' | 'html';
  formatFrontmatter(post: import('./types').BlogPost): string;
  getFilePath(profile: CodebaseProfile, slug: string): string;
  getUrlPath(slug: string): string;
}

/**
 * Create a content handler for the given codebase profile
 *
 * Adapts the scanner's IFrameworkHandler to the content generator's interface.
 */
function createContentHandler(profile: CodebaseProfile): ContentFrameworkHandler {
  // Get the framework-specific handler from scanner
  const scannerHandler = getHandler(profile.framework);

  // Determine content extension based on framework
  const getExtension = (): 'mdx' | 'md' | 'html' => {
    if (
      profile.framework === 'nextjs-app' ||
      profile.framework === 'nextjs-pages' ||
      profile.framework === 'astro'
    ) {
      return 'mdx';
    }
    return 'md';
  };

  // Create handler with framework-specific behavior
  return {
    framework: profile.framework,

    getContentDir(p: CodebaseProfile): string {
      return p.structure.contentDir ?? scannerHandler.getBlogDirectory();
    },

    getContentExtension(): 'mdx' | 'md' | 'html' {
      return getExtension();
    },

    formatFrontmatter(post: import('./types').BlogPost): string {
      const fm: Record<string, unknown> = {
        title: post.title,
        slug: post.slug,
        description: post.metaDescription,
        author: post.author,
        publishedAt: post.publishedAt.toISOString(),
        ...post.frontmatter,
      };

      if (post.featuredImage) {
        fm['image'] = `/images/blog/${post.featuredImage.filename}`;
        fm['imageAlt'] = post.featuredImage.altText;
      }

      const lines = ['---'];
      for (const [key, value] of Object.entries(fm)) {
        if (typeof value === 'string') {
          lines.push(`${key}: "${value.replace(/"/g, '\\"')}"`);
        } else if (value instanceof Date) {
          lines.push(`${key}: "${value.toISOString()}"`);
        } else if (Array.isArray(value)) {
          lines.push(`${key}:`);
          for (const item of value) {
            lines.push(`  - "${String(item).replace(/"/g, '\\"')}"`);
          }
        } else {
          lines.push(`${key}: ${JSON.stringify(value)}`);
        }
      }
      lines.push('---');
      return lines.join('\n');
    },

    getFilePath(p: CodebaseProfile, slug: string): string {
      const contentDir = this.getContentDir(p);
      const ext = this.getContentExtension();
      return `${contentDir}/${slug}.${ext}`;
    },

    getUrlPath(slug: string): string {
      return `/blog/${slug}`;
    },
  };
}

/**
 * Generate a descriptive commit message from fixes and changes
 */
function generateCommitMessage(fixes: CodeFix[], changes: Change[]): string {
  const parts: string[] = [];

  if (fixes.length > 0) {
    parts.push(`Fix ${fixes.length} SEO issue${fixes.length === 1 ? '' : 's'}`);
  }

  const blogs = changes.filter((c) => c.type === 'blog-published');
  if (blogs.length > 0) {
    parts.push(`Publish ${blogs.length} blog post${blogs.length === 1 ? '' : 's'}`);
  }

  const images = changes.filter((c) => c.type === 'image-added');
  if (images.length > 0) {
    parts.push(`Add ${images.length} image${images.length === 1 ? '' : 's'}`);
  }

  const summary = parts.length > 0 ? parts.join('; ') : 'SEO optimization';

  return `SEO Agent: ${summary}

Automatically generated by SEO Agent.
https://github.com/your-org/seo-agent`;
}

/**
 * Infer the change type from a code fix based on its description
 */
function inferChangeType(fix: CodeFix): ChangeType {
  const desc = fix.description.toLowerCase();

  if (desc.includes('title')) return 'meta-title';
  if (desc.includes('description')) return 'meta-description';
  if (desc.includes('og') || desc.includes('open graph')) return 'og-tags';
  if (desc.includes('schema') || desc.includes('json-ld') || desc.includes('structured data'))
    return 'schema';
  if (desc.includes('sitemap')) return 'sitemap';
  if (desc.includes('robots')) return 'robots';
  if (desc.includes('alt')) return 'alt-text';
  if (desc.includes('link') || desc.includes('anchor')) return 'internal-link';

  return 'content-update';
}

/**
 * Get the database path from environment or default
 */
function getDatabasePath(): string {
  const dataDir = process.env['DATA_DIR'] ?? './data';
  return `${dataDir}/seo-agent.db`;
}

// =============================================================================
// Main Entry Point
// =============================================================================

/**
 * Main orchestrator function
 *
 * Initializes all services, processes repositories, and generates reports.
 * Designed to run as a scheduled job (e.g., daily cron).
 */
async function main(): Promise<void> {
  const startTime = Date.now();

  console.log('========================================');
  console.log('SEO Agent starting...');
  console.log(`Time: ${new Date().toISOString()}`);
  console.log('========================================\n');

  // 1. Initialize all services
  let config: Config;
  try {
    config = loadConfig();
  } catch (error) {
    const errMessage = error instanceof Error ? error.message : String(error);
    console.error(`[FATAL] Configuration error: ${errMessage}`);
    process.exit(1);
  }

  const dbPath = getDatabasePath();
  const db = new DatabaseClient(dbPath);
  const ai = new AIClient();
  const github = new GitHubClient();
  const searchConsole = new SearchConsoleClient();
  const imageService = new ImageService(ai);
  const contentGenerator = new ContentGenerator(ai, imageService);
  const changeTracker = new ChangeTracker(db);
  const reportGenerator = new DailyReportGenerator(db, searchConsole);
  const weeklyReportGenerator = new WeeklyReportGenerator(db);
  const emailSender = new EmailSender();

  const services: Services = {
    config,
    db,
    ai,
    github,
    searchConsole,
    imageService,
    contentGenerator,
    changeTracker,
  };

  console.log(`[config] Loaded ${config.repos.length} repository(s)\n`);

  // 2. Process each repository (isolated error handling)
  let successCount = 0;
  let failCount = 0;

  for (const repo of config.repos) {
    console.log(`----------------------------------------`);
    console.log(`[repo] Processing: ${repo.id} (${repo.domain})`);
    console.log(`----------------------------------------`);

    try {
      await processRepository(repo, services);
      successCount++;
      console.log(`[repo] ${repo.id} completed successfully\n`);
    } catch (error) {
      failCount++;
      const errMessage = error instanceof Error ? error.message : String(error);
      const errStack = error instanceof Error ? error.stack : '';
      console.error(`[ERROR] Failed to process ${repo.id}: ${errMessage}`);
      if (errStack) {
        console.error(errStack);
      }
      console.log(''); // Blank line before next repo
      // Continue with other repos - don't let one failure stop everything
    }
  }

  // 3. Generate and send reports
  console.log(`----------------------------------------`);
  console.log(`[reports] Generating reports...`);
  console.log(`----------------------------------------`);

  try {
    const report = await reportGenerator.generate(config.repos);
    console.log(
      `[reports] Daily report: ${report.totalClicks} clicks, ${report.totalImpressions} impressions`
    );

    await emailSender.sendDailyReport(report);

    // Weekly report on Sundays
    const today = new Date();
    if (today.getDay() === 0) {
      const weeklyReport = await weeklyReportGenerator.generate(config.repos);
      console.log(`[reports] Weekly report generated (Week ${weeklyReport.weekNumber})`);
      await emailSender.sendWeeklyReport(weeklyReport);
    }
  } catch (error) {
    const errMessage = error instanceof Error ? error.message : String(error);
    console.error(`[ERROR] Report generation failed: ${errMessage}`);
  }

  // 4. Cleanup
  db.close();

  // 5. Summary
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n========================================`);
  console.log(`SEO Agent completed`);
  console.log(`Time: ${new Date().toISOString()}`);
  console.log(`Duration: ${elapsed}s`);
  console.log(`Repos: ${successCount} succeeded, ${failCount} failed`);
  console.log(`========================================`);
}

// =============================================================================
// Execute
// =============================================================================

main().catch((error: unknown) => {
  const errMessage = error instanceof Error ? error.message : String(error);
  const errStack = error instanceof Error ? error.stack : '';
  console.error(`[FATAL] Unhandled error: ${errMessage}`);
  if (errStack) {
    console.error(errStack);
  }
  process.exit(1);
});
