/**
 * SEO Agent Main Orchestrator
 *
 * Coordinates the entire SEO automation workflow:
 * 1. Loads configuration and initializes services
 * 2. Runs SEO Agency (research + strategic planning)
 * 3. Executes the strategic plan (fixes + content)
 * 4. Generates and sends daily/weekly reports
 *
 * Designed for autonomous operation with robust error isolation.
 */

// Configuration & Database
import { loadConfig } from './config';
import { DatabaseClient } from './db';

// AI & Agency
import { AIClient } from './ai';
import { SEOAgency, type AgencyPlan, type AgencyAction } from './agency';

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
// Configuration
// =============================================================================

/**
 * Agency configuration from environment variables
 */
interface AgencySettings {
  /** Enable full agency mode with research (default: true) */
  enabled: boolean;
  /** Enable keyword research (default: true) */
  enableKeywordResearch: boolean;
  /** Enable competitor analysis (default: true) */
  enableCompetitorAnalysis: boolean;
  /** Use quick mode without research for faster execution */
  quickMode: boolean;
}

/**
 * Load agency settings from environment
 */
function loadAgencySettings(): AgencySettings {
  return {
    enabled: process.env['AGENCY_ENABLED'] !== 'false',
    enableKeywordResearch: process.env['AGENCY_KEYWORD_RESEARCH'] !== 'false',
    enableCompetitorAnalysis: process.env['AGENCY_COMPETITOR_ANALYSIS'] !== 'false',
    quickMode: process.env['AGENCY_QUICK_MODE'] === 'true',
  };
}

// =============================================================================
// Service Container
// =============================================================================

/**
 * Container for all initialized services
 * Passed to repository processing for dependency injection
 */
interface Services {
  config: Config;
  agencySettings: AgencySettings;
  db: DatabaseClient;
  ai: AIClient;
  agency: SEOAgency;
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
 * 3. Run SEO Agency (research + strategic planning)
 * 4. Execute the strategic plan (prioritized fixes + content)
 * 5. Commit and push changes
 * 6. Fetch analytics
 *
 * @param repo - Repository configuration
 * @param services - Initialized service container
 */
async function processRepository(repo: RepoConfig, services: Services): Promise<void> {
  const { db, ai, agency, agencySettings, github, searchConsole, contentGenerator, changeTracker } = services;

  // Step 0: Ensure repo exists in database (for foreign key constraints)
  await db.saveRepo(repo);

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

  // Step 4: SEO AGENCY - Research + Strategic Planning
  console.log(`  [agency] Running SEO Agency...`);

  // Gather context for the agency
  const recentMetrics = await db.getRecentMetrics(repo.id, 30);
  const pastChanges = await db.getRecentChanges(repo.id, 30);
  const lastPublished = await db.getLastPublishedDate(repo.id);
  const existingContentCount = await db.getContentCount(repo.id);

  const agencyInput = {
    profile,
    issues,
    recentMetrics,
    pastChanges,
    settings: repo.settings,
    daysSinceLastContent: lastPublished
      ? Math.floor((Date.now() - lastPublished.getTime()) / (1000 * 60 * 60 * 24))
      : null,
    existingContentCount,
  };

  // Run agency (full or quick mode)
  let plan: AgencyPlan;
  if (agencySettings.quickMode) {
    plan = await agency.createQuickPlan(agencyInput);
  } else {
    plan = await agency.createStrategicPlan(agencyInput);
  }

  // Log the strategic plan
  console.log(`  [agency] ═══════════════════════════════════════════`);
  console.log(`  [agency] STRATEGIC PLAN`);
  console.log(`  [agency] ═══════════════════════════════════════════`);
  console.log(`  [agency] Assessment: ${plan.overallAssessment}`);
  console.log(`  [agency] Maturity: ${plan.maturityLevel}`);
  console.log(`  [agency] Focus: ${plan.focusArea}`);
  console.log(`  [agency] Confidence: ${plan.confidence}`);
  console.log(`  [agency] Actions: ${plan.actions.length}`);

  if (plan.keyInsights.length > 0) {
    console.log(`  [agency] Key Insights:`);
    for (const insight of plan.keyInsights.slice(0, 3)) {
      console.log(`    • ${insight}`);
    }
  }

  if (plan.shortTermGoals.length > 0) {
    console.log(`  [agency] 30-Day Goals:`);
    for (const goal of plan.shortTermGoals.slice(0, 3)) {
      console.log(`    → ${goal}`);
    }
  }
  console.log(`  [agency] ═══════════════════════════════════════════`);

  // Step 5: Execute the strategic plan
  const fixes: CodeFix[] = [];
  const changes: Change[] = [];

  // Process planned actions in priority order
  const sortedActions = [...plan.actions].sort((a, b) => a.priority - b.priority);

  for (const action of sortedActions) {
    await executeAction(action, {
      profile,
      issues,
      repoPath,
      repoId: repo.id,
      settings: repo.settings,
      ai,
      github,
      contentGenerator,
      db,
      fixes,
      changes,
    });
  }

  // Log deferred actions (for transparency)
  if (plan.deferredActions.length > 0) {
    console.log(`  [agency] Deferred ${plan.deferredActions.length} actions:`);
    for (const deferred of plan.deferredActions.slice(0, 3)) {
      console.log(`    ⏸ ${deferred.description}: ${deferred.reason}`);
    }
  }

  // Apply all fixes
  if (fixes.length > 0) {
    await github.applyChanges(repoPath, fixes);
    console.log(`  [fix] Applied ${fixes.length} fixes`);
  }

  // Step 6: Commit and push changes
  const totalChanges = fixes.length + changes.length;
  if (totalChanges > 0) {
    console.log(`  [git] Committing ${totalChanges} changes...`);
    const commitMessage = generateCommitMessage(fixes, changes, plan);
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
  } catch {
    // Non-critical, don't warn loudly
  }
}

// =============================================================================
// Action Execution
// =============================================================================

/**
 * Context for action execution
 */
interface ActionContext {
  profile: CodebaseProfile;
  issues: import('./types').SEOIssue[];
  repoPath: string;
  repoId: string;
  settings: import('./types').RepoSettings;
  ai: AIClient;
  github: GitHubClient;
  contentGenerator: ContentGenerator;
  db: DatabaseClient;
  fixes: CodeFix[];
  changes: Change[];
}

/**
 * Execute a single action from the strategic plan
 */
async function executeAction(action: AgencyAction, ctx: ActionContext): Promise<void> {
  const { profile, issues, repoPath, repoId, settings, ai, github, contentGenerator, db, fixes, changes } = ctx;

  switch (action.type) {
    case 'fix-issue': {
      if (!action.issueId) break;

      const issue = issues.find((i) => i.id === action.issueId);
      if (!issue || !issue.autoFixable) {
        console.log(`  [fix] Skipping ${action.issueId}: not auto-fixable`);
        break;
      }

      try {
        console.log(`  [fix] Fixing: ${issue.type}`);
        console.log(`    Reason: ${action.reasoning}`);
        const fileContent = issue.file ? await github.readFile(repoPath, issue.file) : '';
        const fix = await ai.generateFix(issue, profile, fileContent);
        fixes.push(fix);
      } catch (error) {
        const errMessage = error instanceof Error ? error.message : String(error);
        console.warn(`  [fix] Failed to fix ${issue.id}: ${errMessage}`);
      }
      break;
    }

    case 'create-content': {
      if (!action.content) break;

      console.log(`  [content] Creating: ${action.content.topic}`);
      console.log(`    Keyword: ${action.content.keyword}`);
      console.log(`    Reason: ${action.reasoning}`);

      try {
        const contentHandler = createContentHandler(profile);

        const { post, imageBuffer, imagePath } = await contentGenerator.generatePost(
          action.content.topic,
          action.content.keyword,
          profile,
          settings,
          contentHandler
        );

        if (imageBuffer.length > 0 && imagePath) {
          await github.writeFile(repoPath, imagePath, imageBuffer);
          console.log(`  [content] Generated image: ${imagePath}`);
        }

        const formattedPost = contentGenerator.formatForFramework(post, contentHandler);
        await github.writeFile(repoPath, post.filePath, formattedPost);
        await db.saveContent(repoId, post);
        console.log(`  [content] Published: ${post.title}`);

        changes.push({
          id: `${repoId}-${Date.now()}-blog`,
          repoId,
          timestamp: new Date(),
          type: 'blog-published',
          file: post.filePath,
          description: `Published: ${post.title}`,
          commitSha: '',
          affectedPages: [post.filePath],
          expectedImpact: action.expectedImpact,
        });
      } catch (error) {
        const errMessage = error instanceof Error ? error.message : String(error);
        console.warn(`  [content] Failed to create content: ${errMessage}`);
      }
      break;
    }

    case 'optimize-links': {
      console.log(`  [links] Link optimization: ${action.reasoning}`);
      // Future: implement internal linking optimization
      break;
    }

    case 'investigate': {
      console.log(`  [investigate] ${action.reasoning}`);
      // Log for manual review - no automated action
      break;
    }

    case 'defer': {
      // Silently skip deferred actions (logged separately)
      break;
    }
  }
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Content handler interface for the ContentGenerator
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
 */
function createContentHandler(profile: CodebaseProfile): ContentFrameworkHandler {
  const scannerHandler = getHandler(profile.framework);

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
 * Generate a descriptive commit message from fixes, changes, and plan
 */
function generateCommitMessage(fixes: CodeFix[], changes: Change[], plan: AgencyPlan): string {
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

Focus: ${plan.focusArea}
Maturity: ${plan.maturityLevel}
Confidence: ${plan.confidence}

Automatically generated by SEO Agency.
https://github.com/your-org/seo-agent`;
}

/**
 * Infer the change type from a code fix
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
 * Get the database path from environment
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

  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║                    SEO AGENCY STARTING                      ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`  Time: ${new Date().toISOString()}`);
  console.log('');

  // 1. Load configuration
  let config: Config;
  const agencySettings = loadAgencySettings();

  try {
    config = loadConfig();
  } catch (error) {
    const errMessage = error instanceof Error ? error.message : String(error);
    console.error(`[FATAL] Configuration error: ${errMessage}`);
    process.exit(1);
  }

  // 2. Initialize services
  const dbPath = getDatabasePath();
  const db = new DatabaseClient(dbPath);
  const ai = new AIClient();

  // Initialize SEO Agency with settings
  const agency = new SEOAgency(ai, {
    enableKeywordResearch: agencySettings.enableKeywordResearch,
    enableCompetitorAnalysis: agencySettings.enableCompetitorAnalysis,
    enableContentGapAnalysis: true,
  });

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
    agencySettings,
    db,
    ai,
    agency,
    github,
    searchConsole,
    imageService,
    contentGenerator,
    changeTracker,
  };

  // Log configuration
  console.log(`[config] Agency Mode: ${agencySettings.enabled ? 'ENABLED' : 'DISABLED'}`);
  console.log(`[config] Keyword Research: ${agencySettings.enableKeywordResearch ? 'ON' : 'OFF'}`);
  console.log(`[config] Competitor Analysis: ${agencySettings.enableCompetitorAnalysis ? 'ON' : 'OFF'}`);
  console.log(`[config] Quick Mode: ${agencySettings.quickMode ? 'ON' : 'OFF'}`);
  console.log(`[config] Repositories: ${config.repos.length}`);
  console.log('');

  // 3. Process each repository
  let successCount = 0;
  let failCount = 0;

  for (const repo of config.repos) {
    console.log('┌────────────────────────────────────────────────────────────┐');
    console.log(`│ REPOSITORY: ${repo.id.padEnd(47)} │`);
    console.log(`│ Domain: ${repo.domain.padEnd(51)} │`);
    console.log('└────────────────────────────────────────────────────────────┘');

    try {
      await processRepository(repo, services);
      successCount++;
      console.log(`[repo] ✓ ${repo.id} completed successfully\n`);
    } catch (error) {
      failCount++;
      const errMessage = error instanceof Error ? error.message : String(error);
      const errStack = error instanceof Error ? error.stack : '';
      console.error(`[ERROR] ✗ Failed to process ${repo.id}: ${errMessage}`);
      if (errStack && process.env['DEBUG']) {
        console.error(errStack);
      }
      console.log('');
    }
  }

  // 4. Generate and send reports
  console.log('┌────────────────────────────────────────────────────────────┐');
  console.log('│                      GENERATING REPORTS                     │');
  console.log('└────────────────────────────────────────────────────────────┘');

  try {
    const report = await reportGenerator.generate(config.repos);
    console.log(`[reports] Daily: ${report.totalClicks} clicks, ${report.totalImpressions} impressions`);

    await emailSender.sendDailyReport(report);

    // Weekly report on Sundays
    const today = new Date();
    if (today.getDay() === 0) {
      const weeklyReport = await weeklyReportGenerator.generate(config.repos);
      console.log(`[reports] Weekly: Week ${weeklyReport.weekNumber}`);
      await emailSender.sendWeeklyReport(weeklyReport);
    }
  } catch (error) {
    const errMessage = error instanceof Error ? error.message : String(error);
    console.error(`[ERROR] Report generation failed: ${errMessage}`);
  }

  // 5. Cleanup
  db.close();

  // 6. Summary
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║                    SEO AGENCY COMPLETED                     ║');
  console.log('╠════════════════════════════════════════════════════════════╣');
  console.log(`║  Time: ${new Date().toISOString().padEnd(51)} ║`);
  console.log(`║  Duration: ${(elapsed + 's').padEnd(48)} ║`);
  console.log(`║  Success: ${String(successCount).padEnd(49)} ║`);
  console.log(`║  Failed: ${String(failCount).padEnd(50)} ║`);
  console.log('╚════════════════════════════════════════════════════════════╝');
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
