/**
 * Type exports for the SEO Optimizer
 */

// Config types
export type {
  Config,
  RepoConfig,
  RepoSettings,
  SearchConsoleConfig,
  AIConfig,
  ImageConfig,
  EmailConfig,
} from './config';

// Codebase types
export type {
  FrameworkType,
  MetaHandlingType,
  CodebaseProfile,
  CodebaseStructure,
  SEOPatterns,
  BuildSystem,
  PageInfo,
  ImageInfo,
} from './codebase';

// SEO types
export type {
  SEOIssueType,
  SEOIssue,
  CodeFix,
  SitemapEntry,
  SchemaMarkup,
} from './seo';

// Content types
export type {
  BlogPost,
  GeneratedImage,
  ImageOpportunity,
  ContentCalendarEntry,
} from './content';

// Analytics types
export type {
  DailyMetrics,
  PageMetrics,
  QueryMetrics,
  Change,
  ChangeType,
  MeasuredImpact,
  DailyReport,
  RepoReport,
  WeeklyReport,
} from './analytics';

// Service interfaces
export type {
  Message,
  ChatOptions,
  ImagePromptContext,
  BlogImageContext,
  ImageRecord,
  IAIClient,
  IGitHubClient,
  IImageService,
  ISearchConsoleClient,
  IDatabase,
} from './services';
