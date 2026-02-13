/**
 * Service interface definitions for dependency injection
 */

import type { CodebaseProfile, PageInfo } from './codebase';
import type { RepoConfig, RepoSettings } from './config';
import type { BlogPost } from './content';
import type { DailyMetrics, DailyReport, WeeklyReport, Change } from './analytics';
import type { SEOIssue, CodeFix } from './seo';

/**
 * A message in a chat conversation
 */
export interface Message {
  /** Role of the message sender */
  role: 'user' | 'assistant';
  /** Message content */
  content: string;
}

/**
 * Options for chat completion
 */
export interface ChatOptions {
  /** Temperature for response randomness */
  temperature?: number;
  /** Maximum tokens in response */
  maxTokens?: number;
}

/**
 * Context for generating an image prompt
 */
export interface ImagePromptContext {
  /** Title of the content */
  title: string;
  /** Topic of the content */
  topic: string;
  /** Tone of the content */
  tone: string;
}

/**
 * Context for generating a blog featured image
 */
export interface BlogImageContext {
  /** Blog post title */
  title: string;
  /** Blog topic */
  topic: string;
  /** Writing tone */
  tone: string;
  /** URL slug */
  slug: string;
}

/**
 * Record of a generated image for tracking quotas
 */
export interface ImageRecord {
  /** Repository identifier */
  repoId: string;
  /** Date of generation */
  date: Date;
  /** Generated filename */
  filename: string;
  /** Provider used */
  provider: string;
  /** Model used */
  model: string;
  /** Size of generated image in bytes */
  sizeBytes: number;
}

/**
 * A generated image with metadata
 */
export interface GeneratedImage {
  /** Image data */
  buffer: Buffer;
  /** Filename for saving */
  filename: string;
  /** Alt text for SEO */
  altText: string;
  /** Prompt used to generate */
  prompt: string;
  /** Provider that generated it */
  provider: string;
  /** Model used */
  model: string;
  /** Image dimensions */
  dimensions: { width: number; height: number };
  /** File size in bytes */
  sizeBytes: number;
}

/**
 * AI client interface for code analysis and content generation
 */
export interface IAIClient {
  /**
   * Send a chat message and get a response
   */
  chat(systemPrompt: string, messages: Message[], options?: ChatOptions): Promise<string>;

  /**
   * Analyze a codebase and generate a profile
   */
  analyzeCodebase(files: Map<string, string>): Promise<CodebaseProfile>;

  /**
   * Find SEO issues in a codebase
   */
  findSEOIssues(profile: CodebaseProfile, pages: PageInfo[]): Promise<SEOIssue[]>;

  /**
   * Generate a fix for an SEO issue
   */
  generateFix(issue: SEOIssue, profile: CodebaseProfile, fileContent: string): Promise<CodeFix>;

  /**
   * Generate a blog post
   */
  generateBlog(
    topic: string,
    keyword: string,
    profile: CodebaseProfile,
    settings: RepoSettings
  ): Promise<BlogPost>;

  /**
   * Generate an image prompt from context
   */
  generateImagePrompt(context: ImagePromptContext): Promise<string>;

  /**
   * Generate alt text for an image
   */
  generateAltText(imageContext: string, keyword?: string): Promise<string>;
}

/**
 * GitHub client interface for repository operations
 */
export interface IGitHubClient {
  /**
   * Clone a repository or pull latest changes
   */
  cloneOrPull(repo: RepoConfig): Promise<string>;

  /**
   * Get the latest commit hash
   */
  getLatestCommit(repoPath: string): Promise<string>;

  /**
   * Read a file from the repository
   */
  readFile(repoPath: string, filePath: string): Promise<string>;

  /**
   * Write a file to the repository
   */
  writeFile(repoPath: string, filePath: string, content: string | Buffer): Promise<void>;

  /**
   * List files matching a pattern
   */
  listFiles(repoPath: string, pattern?: string): Promise<string[]>;

  /**
   * Apply multiple code fixes
   */
  applyChanges(repoPath: string, changes: CodeFix[]): Promise<void>;

  /**
   * Commit changes and push to remote
   */
  commitAndPush(repoPath: string, message: string, branch: string): Promise<string>;
}

/**
 * Image generation service interface
 */
export interface IImageService {
  /**
   * Generate a featured image for a blog post
   */
  generateBlogImage(context: BlogImageContext): Promise<GeneratedImage>;

  /**
   * Generate an Open Graph image
   */
  generateOGImage(title: string, domain: string): Promise<Buffer>;

  /**
   * Find opportunities for new images
   */
  findMissingImages(pages: PageInfo[]): Promise<import('./content').ImageOpportunity[]>;

  /**
   * Check if more images can be generated today
   */
  canGenerate(repoId: string): Promise<boolean>;
}

/**
 * Google Search Console client interface
 */
export interface ISearchConsoleClient {
  /**
   * Get metrics for a single day
   */
  getDailyMetrics(siteUrl: string, date: Date): Promise<DailyMetrics>;

  /**
   * Get metrics for a date range
   */
  getMetricsRange(siteUrl: string, startDate: Date, endDate: Date): Promise<DailyMetrics[]>;
}

/**
 * Database interface for persistence
 */
export interface IDatabase {
  /**
   * Get a repository configuration by ID
   */
  getRepo(id: string): Promise<RepoConfig | null>;

  /**
   * Save a repository configuration
   */
  saveRepo(repo: RepoConfig): Promise<void>;

  /**
   * Get the latest codebase profile for a repository
   */
  getCodebaseProfile(repoId: string): Promise<CodebaseProfile | null>;

  /**
   * Save a codebase profile
   */
  saveCodebaseProfile(profile: CodebaseProfile): Promise<void>;

  /**
   * Get metrics for a specific date
   */
  getMetrics(repoId: string, date: Date): Promise<DailyMetrics | null>;

  /**
   * Save daily metrics
   */
  saveMetrics(metrics: DailyMetrics): Promise<void>;

  /**
   * Get metrics for a date range
   */
  getMetricsRange(repoId: string, startDate: Date, endDate: Date): Promise<DailyMetrics[]>;

  /**
   * Get a change record by ID
   */
  getChange(id: string): Promise<Change | null>;

  /**
   * Save a change record
   */
  saveChange(change: Change): Promise<void>;

  /**
   * Get all changes for a specific date
   */
  getChangesForDate(repoId: string, date: Date): Promise<Change[]>;

  /**
   * Update a change record
   */
  updateChange(id: string, updates: Partial<Change>): Promise<void>;

  /**
   * Get a blog post by ID
   */
  getContent(id: string): Promise<BlogPost | null>;

  /**
   * Save a blog post
   */
  saveContent(repoId: string, post: BlogPost): Promise<void>;

  /**
   * Get all content titles for duplicate checking
   */
  getContentTitles(repoId: string): Promise<string[]>;

  /**
   * Get the date of last published content
   */
  getLastPublishedDate(repoId: string): Promise<Date | null>;

  /**
   * Save SEO issues for a repository
   */
  saveIssues(repoId: string, issues: SEOIssue[]): Promise<void>;

  /**
   * Get pending (unfixed) issues
   */
  getPendingIssues(repoId: string): Promise<SEOIssue[]>;

  /**
   * Get image generation count for a day
   */
  getImageCountForDay(repoId: string, date: string): Promise<number>;

  /**
   * Save an image generation record
   */
  saveImageRecord(record: ImageRecord): Promise<void>;

  /**
   * Save a report
   */
  saveReport(type: 'daily' | 'weekly', report: DailyReport | WeeklyReport): Promise<void>;
}
