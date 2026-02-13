/**
 * Types for analytics, metrics, and reporting
 */

/**
 * Daily metrics from Google Search Console
 */
export interface DailyMetrics {
  /** Repository identifier */
  repoId: string;
  /** Date of the metrics */
  date: Date;
  /** Total clicks */
  clicks: number;
  /** Total impressions */
  impressions: number;
  /** Click-through rate */
  ctr: number;
  /** Average position */
  position: number;
  /** Change in clicks from previous period */
  clicksChange: number;
  /** Change in impressions from previous period */
  impressionsChange: number;
  /** Change in CTR from previous period */
  ctrChange: number;
  /** Change in position from previous period */
  positionChange: number;
  /** Per-page metrics */
  pages: PageMetrics[];
  /** Per-query metrics */
  queries: QueryMetrics[];
}

/**
 * Metrics for a single page
 */
export interface PageMetrics {
  /** Page URL */
  page: string;
  /** Clicks to this page */
  clicks: number;
  /** Impressions for this page */
  impressions: number;
  /** Click-through rate */
  ctr: number;
  /** Average position */
  position: number;
}

/**
 * Metrics for a search query
 */
export interface QueryMetrics {
  /** Search query string */
  query: string;
  /** Clicks from this query */
  clicks: number;
  /** Impressions for this query */
  impressions: number;
  /** Click-through rate */
  ctr: number;
  /** Average position */
  position: number;
}

/**
 * A recorded change made to a repository
 */
export interface Change {
  /** Unique identifier */
  id: string;
  /** Repository identifier */
  repoId: string;
  /** When the change was made */
  timestamp: Date;
  /** Type of change */
  type: ChangeType;
  /** File that was modified */
  file: string;
  /** Description of the change */
  description: string;
  /** Git commit SHA */
  commitSha: string;
  /** Pages affected by this change */
  affectedPages: string[];
  /** Expected impact of the change */
  expectedImpact: string;
  /** Measured impact after sufficient time */
  measuredImpact?: MeasuredImpact;
}

/**
 * Categories of changes made
 */
export type ChangeType =
  | 'meta-title'
  | 'meta-description'
  | 'og-tags'
  | 'schema'
  | 'sitemap'
  | 'robots'
  | 'blog-published'
  | 'image-added'
  | 'alt-text'
  | 'internal-link'
  | 'content-update';

/**
 * Measured impact of a change
 */
export interface MeasuredImpact {
  /** Clicks before the change */
  clicksBefore: number;
  /** Clicks after the change */
  clicksAfter: number;
  /** Number of days in measurement period */
  measurementPeriod: number;
}

/**
 * Daily summary report
 */
export interface DailyReport {
  /** Report date */
  date: Date;
  /** Per-repository reports */
  repos: RepoReport[];
  /** Total clicks across all repos */
  totalClicks: number;
  /** Total impressions across all repos */
  totalImpressions: number;
  /** Total changes made across all repos */
  changesAcrossRepos: number;
}

/**
 * Report for a single repository
 */
export interface RepoReport {
  /** Repository identifier */
  repoId: string;
  /** Repository domain */
  domain: string;
  /** Aggregated metrics */
  metrics: {
    clicks: number;
    clicksChange: number;
    impressions: number;
    impressionsChange: number;
    ctr: number;
    ctrChange: number;
    position: number;
    positionChange: number;
  };
  /** Changes made in this period */
  changes: Change[];
  /** Pages with highest growth */
  topGrowingPages: { page: string; clicks: number; change: number }[];
  /** Number of SEO issues fixed */
  issuesFixed: number;
  /** Number of content pieces published */
  contentPublished: number;
  /** Number of images generated */
  imagesGenerated: number;
  /** Suggested next actions */
  nextActions: string[];
}

/**
 * Weekly summary report
 */
export interface WeeklyReport extends DailyReport {
  /** ISO week number */
  weekNumber: number;
  /** Total changes in the week */
  totalChanges: number;
  /** Total blogs published this week */
  totalBlogsPublished: number;
  /** New keywords that started ranking */
  newKeywordsRanking: number;
  /** Keywords with improved position */
  keywordsImproved: number;
  /** Daily clicks trend (7 values) */
  clicksTrend: number[];
  /** Daily impressions trend (7 values) */
  impressionsTrend: number[];
  /** Biggest wins of the week */
  biggestWins: { type: string; description: string; impact: string }[];
}
