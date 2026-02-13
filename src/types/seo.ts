/**
 * Types for SEO analysis and issue tracking
 */

/**
 * Categories of SEO issues that can be detected
 */
export type SEOIssueType =
  | 'missing-meta-title'
  | 'missing-meta-description'
  | 'duplicate-title'
  | 'duplicate-description'
  | 'title-too-long'
  | 'description-too-long'
  | 'missing-canonical'
  | 'missing-og-tags'
  | 'missing-og-image'
  | 'missing-twitter-tags'
  | 'missing-sitemap'
  | 'missing-robots'
  | 'missing-schema'
  | 'broken-internal-link'
  | 'missing-h1'
  | 'multiple-h1'
  | 'thin-content'
  | 'missing-alt-text'
  | 'keyword-missing'
  | 'orphan-page'
  | 'deep-page'
  | 'missing-breadcrumbs';

/**
 * An identified SEO issue
 */
export interface SEOIssue {
  /** Unique identifier for this issue */
  id: string;
  /** Type/category of the issue */
  type: SEOIssueType;
  /** How severe the issue is */
  severity: 'critical' | 'warning' | 'info';
  /** URL path affected (if page-specific) */
  page?: string;
  /** File path affected (if file-specific) */
  file?: string;
  /** Human-readable description of the issue */
  description: string;
  /** Recommendation for fixing the issue */
  recommendation: string;
  /** Whether this issue can be fixed automatically */
  autoFixable: boolean;
}

/**
 * A code modification to fix an SEO issue
 */
export interface CodeFix {
  /** ID of the issue being fixed */
  issueId: string;
  /** File to modify */
  file: string;
  /** Type of modification */
  action: 'create' | 'modify' | 'delete';
  /** Full content for create action */
  content?: string;
  /** Search string for modify action */
  search?: string;
  /** Replace string for modify action */
  replace?: string;
  /** Description of what this fix does */
  description: string;
}

/**
 * Entry for sitemap generation
 */
export interface SitemapEntry {
  /** Full URL of the page */
  url: string;
  /** Last modification date (ISO string) */
  lastModified: string;
  /** How frequently the page changes */
  changeFrequency: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  /** Priority relative to other pages (0.0 - 1.0) */
  priority: number;
}

/**
 * Schema.org structured data markup
 */
export interface SchemaMarkup {
  /** Schema.org type (e.g., Article, Product) */
  type: string;
  /** Schema data object */
  data: Record<string, unknown>;
}
