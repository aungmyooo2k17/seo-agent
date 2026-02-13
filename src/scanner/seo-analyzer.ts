/**
 * SEO Analyzer module
 * Combines rule-based checks with AI analysis to find SEO issues
 */

import type {
  CodebaseProfile,
  PageInfo,
  SEOIssue,
  SEOIssueType,
  IAIClient,
} from '../types';

/**
 * Configuration for SEO analysis thresholds
 */
export interface SEOAnalyzerConfig {
  /** Maximum title length before warning */
  maxTitleLength: number;
  /** Maximum description length before warning */
  maxDescriptionLength: number;
  /** Minimum word count for page content */
  minWordCount: number;
  /** Enable AI-powered analysis */
  enableAI: boolean;
}

const DEFAULT_CONFIG: SEOAnalyzerConfig = {
  maxTitleLength: 60,
  maxDescriptionLength: 155,
  minWordCount: 300,
  enableAI: true,
};

/**
 * Analyzes codebase for SEO issues
 * Combines fast rule-based checks with AI-powered deeper analysis
 */
export class SEOAnalyzer {
  private aiClient: IAIClient;
  private config: SEOAnalyzerConfig;

  constructor(aiClient: IAIClient, config: Partial<SEOAnalyzerConfig> = {}) {
    this.aiClient = aiClient;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Analyze a codebase profile for SEO issues
   * @param profile - The codebase profile to analyze
   * @returns Array of deduplicated SEO issues
   */
  async analyze(profile: CodebaseProfile): Promise<SEOIssue[]> {
    const issues: SEOIssue[] = [];

    // Rule-based checks (fast, no AI)
    issues.push(...this.checkMissingMeta(profile.pages));
    issues.push(...this.checkDuplicateMeta(profile.pages));
    issues.push(...this.checkMetaLength(profile.pages));
    issues.push(...this.checkMissingOGImages(profile.pages));
    issues.push(...this.checkMissingSitemap(profile));
    issues.push(...this.checkMissingRobots(profile));
    issues.push(...this.checkMissingSchema(profile.pages));
    issues.push(...this.checkMissingAltText(profile.pages));
    issues.push(...this.checkThinContent(profile.pages));
    issues.push(...this.checkOrphanPages(profile.pages));

    // AI-powered analysis (if enabled)
    if (this.config.enableAI) {
      const aiIssues = await this.aiAnalysis(profile);
      issues.push(...aiIssues);
    }

    // Deduplicate by issue ID
    return this.deduplicateIssues(issues);
  }

  /**
   * Check for missing meta titles and descriptions
   */
  private checkMissingMeta(pages: PageInfo[]): SEOIssue[] {
    const issues: SEOIssue[] = [];

    for (const page of pages) {
      if (!page.title) {
        issues.push({
          id: `missing-meta-title:${page.path}`,
          type: 'missing-meta-title',
          severity: 'critical',
          page: page.path,
          file: page.filePath,
          description: `Page "${page.path}" is missing a title tag`,
          recommendation: 'Add a descriptive title tag that includes relevant keywords',
          autoFixable: true,
        });
      }

      if (!page.description) {
        issues.push({
          id: `missing-meta-description:${page.path}`,
          type: 'missing-meta-description',
          severity: 'critical',
          page: page.path,
          file: page.filePath,
          description: `Page "${page.path}" is missing a meta description`,
          recommendation: 'Add a compelling meta description (150-155 characters) that summarizes the page content',
          autoFixable: true,
        });
      }
    }

    return issues;
  }

  /**
   * Check for duplicate titles and descriptions
   */
  private checkDuplicateMeta(pages: PageInfo[]): SEOIssue[] {
    const issues: SEOIssue[] = [];

    // Group pages by title
    const titleGroups = new Map<string, PageInfo[]>();
    for (const page of pages) {
      if (page.title) {
        const existing = titleGroups.get(page.title) || [];
        existing.push(page);
        titleGroups.set(page.title, existing);
      }
    }

    // Report duplicates
    for (const [title, pagesWithTitle] of titleGroups) {
      if (pagesWithTitle.length > 1) {
        for (const page of pagesWithTitle) {
          issues.push({
            id: `duplicate-title:${page.path}`,
            type: 'duplicate-title',
            severity: 'warning',
            page: page.path,
            file: page.filePath,
            description: `Title "${title}" is used on ${pagesWithTitle.length} pages`,
            recommendation: 'Each page should have a unique title that describes its specific content',
            autoFixable: true,
          });
        }
      }
    }

    // Group pages by description
    const descGroups = new Map<string, PageInfo[]>();
    for (const page of pages) {
      if (page.description) {
        const existing = descGroups.get(page.description) || [];
        existing.push(page);
        descGroups.set(page.description, existing);
      }
    }

    // Report duplicates
    for (const [_desc, pagesWithDesc] of descGroups) {
      if (pagesWithDesc.length > 1) {
        for (const page of pagesWithDesc) {
          issues.push({
            id: `duplicate-description:${page.path}`,
            type: 'duplicate-description',
            severity: 'warning',
            page: page.path,
            file: page.filePath,
            description: `Meta description is duplicated across ${pagesWithDesc.length} pages`,
            recommendation: 'Each page should have a unique meta description',
            autoFixable: true,
          });
        }
      }
    }

    return issues;
  }

  /**
   * Check for meta tags that are too long
   */
  private checkMetaLength(pages: PageInfo[]): SEOIssue[] {
    const issues: SEOIssue[] = [];

    for (const page of pages) {
      if (page.title && page.title.length > this.config.maxTitleLength) {
        issues.push({
          id: `title-too-long:${page.path}`,
          type: 'title-too-long',
          severity: 'warning',
          page: page.path,
          file: page.filePath,
          description: `Title is ${page.title.length} characters (max ${this.config.maxTitleLength})`,
          recommendation: `Shorten the title to ${this.config.maxTitleLength} characters or less to prevent truncation in search results`,
          autoFixable: true,
        });
      }

      if (page.description && page.description.length > this.config.maxDescriptionLength) {
        issues.push({
          id: `description-too-long:${page.path}`,
          type: 'description-too-long',
          severity: 'info',
          page: page.path,
          file: page.filePath,
          description: `Meta description is ${page.description.length} characters (max ${this.config.maxDescriptionLength})`,
          recommendation: `Shorten the description to ${this.config.maxDescriptionLength} characters to prevent truncation in search results`,
          autoFixable: true,
        });
      }
    }

    return issues;
  }

  /**
   * Check for missing OG images
   */
  private checkMissingOGImages(pages: PageInfo[]): SEOIssue[] {
    const issues: SEOIssue[] = [];

    for (const page of pages) {
      if (!page.hasOgImage) {
        issues.push({
          id: `missing-og-image:${page.path}`,
          type: 'missing-og-image',
          severity: 'warning',
          page: page.path,
          file: page.filePath,
          description: `Page "${page.path}" has no Open Graph image`,
          recommendation: 'Add an og:image meta tag with a 1200x630 image for better social sharing',
          autoFixable: false,
        });
      }
    }

    return issues;
  }

  /**
   * Check for missing sitemap
   */
  private checkMissingSitemap(profile: CodebaseProfile): SEOIssue[] {
    if (profile.seoPatterns.existingSitemap) {
      return [];
    }

    return [{
      id: 'missing-sitemap:global',
      type: 'missing-sitemap',
      severity: 'critical',
      description: 'No sitemap.xml found in the project',
      recommendation: 'Add a sitemap.xml to help search engines discover and index your pages',
      autoFixable: true,
    }];
  }

  /**
   * Check for missing robots.txt
   */
  private checkMissingRobots(profile: CodebaseProfile): SEOIssue[] {
    if (profile.seoPatterns.existingRobots) {
      return [];
    }

    return [{
      id: 'missing-robots:global',
      type: 'missing-robots',
      severity: 'warning',
      description: 'No robots.txt found in the project',
      recommendation: 'Add a robots.txt to control search engine crawling and link to your sitemap',
      autoFixable: true,
    }];
  }

  /**
   * Check for missing schema markup
   */
  private checkMissingSchema(pages: PageInfo[]): SEOIssue[] {
    const issues: SEOIssue[] = [];

    // Check for global schema (Organization, WebSite)
    const hasGlobalSchema = pages.some((p) => p.hasSchema && p.path === '/');
    if (!hasGlobalSchema) {
      issues.push({
        id: 'missing-schema:global',
        type: 'missing-schema',
        severity: 'info',
        description: 'No Organization or WebSite schema markup found',
        recommendation: 'Add JSON-LD schema markup for your organization and website',
        autoFixable: true,
      });
    }

    // Check blog posts for Article schema
    for (const page of pages) {
      if (page.path.includes('/blog/') && !page.hasSchema) {
        issues.push({
          id: `missing-schema:${page.path}`,
          type: 'missing-schema',
          severity: 'info',
          page: page.path,
          file: page.filePath,
          description: `Blog post "${page.path}" has no Article schema`,
          recommendation: 'Add BlogPosting or Article schema markup for better search appearance',
          autoFixable: true,
        });
      }
    }

    return issues;
  }

  /**
   * Check for images missing alt text
   */
  private checkMissingAltText(pages: PageInfo[]): SEOIssue[] {
    const issues: SEOIssue[] = [];

    for (const page of pages) {
      const imagesWithoutAlt = page.images.filter((img) => !img.alt);

      for (const image of imagesWithoutAlt) {
        issues.push({
          id: `missing-alt-text:${page.path}:${image.src}`,
          type: 'missing-alt-text',
          severity: 'warning',
          page: page.path,
          file: page.filePath,
          description: `Image "${image.src}" is missing alt text`,
          recommendation: 'Add descriptive alt text that includes relevant keywords',
          autoFixable: false,
        });
      }
    }

    return issues;
  }

  /**
   * Check for thin content (low word count)
   */
  private checkThinContent(pages: PageInfo[]): SEOIssue[] {
    const issues: SEOIssue[] = [];

    for (const page of pages) {
      // Skip non-content pages (e.g., /api, /login)
      if (this.isNonContentPage(page.path)) continue;

      if (page.wordCount < this.config.minWordCount) {
        issues.push({
          id: `thin-content:${page.path}`,
          type: 'thin-content',
          severity: 'warning',
          page: page.path,
          file: page.filePath,
          description: `Page has only ${page.wordCount} words (min ${this.config.minWordCount})`,
          recommendation: 'Add more valuable content to improve rankings. Consider expanding with examples, explanations, or FAQs',
          autoFixable: false,
        });
      }
    }

    return issues;
  }

  /**
   * Check for orphan pages (pages with no internal links pointing to them)
   */
  private checkOrphanPages(pages: PageInfo[]): SEOIssue[] {
    const issues: SEOIssue[] = [];

    // Collect all internal links
    const linkedPaths = new Set<string>();
    for (const page of pages) {
      for (const link of page.internalLinks) {
        linkedPaths.add(link);
      }
    }

    // Find orphan pages
    for (const page of pages) {
      // Skip home page
      if (page.path === '/') continue;

      // Check if any page links to this one
      if (!linkedPaths.has(page.path)) {
        issues.push({
          id: `orphan-page:${page.path}`,
          type: 'orphan-page',
          severity: 'info',
          page: page.path,
          file: page.filePath,
          description: `Page "${page.path}" has no internal links pointing to it`,
          recommendation: 'Add internal links from relevant pages to improve discoverability',
          autoFixable: false,
        });
      }
    }

    return issues;
  }

  /**
   * Check if a path is a non-content page
   */
  private isNonContentPage(path: string): boolean {
    const nonContentPatterns = [
      '/api/',
      '/login',
      '/signup',
      '/register',
      '/admin',
      '/dashboard',
      '/settings',
      '/profile',
      '/auth/',
      '/404',
      '/500',
    ];

    return nonContentPatterns.some((pattern) => path.includes(pattern));
  }

  /**
   * AI-powered deeper analysis
   */
  private async aiAnalysis(profile: CodebaseProfile): Promise<SEOIssue[]> {
    try {
      const aiIssues = await this.aiClient.findSEOIssues(profile, profile.pages);

      // Filter out duplicates of issues we already found with rules
      const ruleIssueTypes: SEOIssueType[] = [
        'missing-meta-title',
        'missing-meta-description',
        'duplicate-title',
        'duplicate-description',
        'title-too-long',
        'description-too-long',
        'missing-og-image',
        'missing-sitemap',
        'missing-robots',
        'missing-schema',
        'missing-alt-text',
        'thin-content',
        'orphan-page',
      ];

      return aiIssues.filter((issue) =>
        !ruleIssueTypes.includes(issue.type)
      );
    } catch (error) {
      console.warn('AI analysis failed, continuing with rule-based results:', error);
      return [];
    }
  }

  /**
   * Deduplicate issues by ID
   */
  private deduplicateIssues(issues: SEOIssue[]): SEOIssue[] {
    const seen = new Map<string, SEOIssue>();

    for (const issue of issues) {
      // Keep the first occurrence (rule-based checks come first)
      if (!seen.has(issue.id)) {
        seen.set(issue.id, issue);
      }
    }

    return Array.from(seen.values());
  }
}

/**
 * Create an analyzer and run analysis
 */
export async function analyzeForSEO(
  profile: CodebaseProfile,
  aiClient: IAIClient,
  config?: Partial<SEOAnalyzerConfig>
): Promise<SEOIssue[]> {
  const analyzer = new SEOAnalyzer(aiClient, config);
  return analyzer.analyze(profile);
}
