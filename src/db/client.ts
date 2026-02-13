/**
 * SQLite database client using better-sqlite3
 */

import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { join } from 'path';
import type {
  IDatabase,
  RepoConfig,
  CodebaseProfile,
  DailyMetrics,
  Change,
  BlogPost,
  SEOIssue,
  ImageRecord,
  DailyReport,
  WeeklyReport,
  PageMetrics,
  QueryMetrics,
  MeasuredImpact,
} from '../types';

/**
 * Format a Date to SQLite date string (YYYY-MM-DD)
 */
function formatDate(date: Date): string {
  const iso = date.toISOString();
  return iso.slice(0, 10);
}

/**
 * Format a Date to SQLite datetime string
 */
function formatDateTime(date: Date): string {
  return date.toISOString().replace('T', ' ').replace('Z', '');
}

/**
 * Parse an SQLite date string to Date
 */
function parseDate(dateStr: string): Date {
  // Handle both YYYY-MM-DD and ISO datetime formats
  if (dateStr.includes(' ')) {
    return new Date(dateStr.replace(' ', 'T') + 'Z');
  }
  return new Date(dateStr);
}

/**
 * Database client implementing IDatabase interface
 */
export class DatabaseClient implements IDatabase {
  private db: Database.Database;

  /**
   * Create a new database client
   * @param dbPath - Path to SQLite database file
   */
  constructor(dbPath: string) {
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
    this.initialize();
  }

  /**
   * Initialize database schema
   */
  private initialize(): void {
    // Use __dirname for CommonJS compatibility
    const schemaPath = join(__dirname, 'schema.sql');
    const schema = readFileSync(schemaPath, 'utf-8');
    this.db.exec(schema);
  }

  /**
   * Close the database connection
   */
  close(): void {
    this.db.close();
  }

  // ============================================
  // Repository Methods
  // ============================================

  async getRepo(id: string): Promise<RepoConfig | null> {
    const row = this.db.prepare(`
      SELECT id, url, branch, domain, settings_json, search_console_url
      FROM repos WHERE id = ?
    `).get(id) as {
      id: string;
      url: string;
      branch: string;
      domain: string;
      settings_json: string;
      search_console_url: string | null;
    } | undefined;

    if (!row) return null;

    const repo: RepoConfig = {
      id: row.id,
      url: row.url,
      branch: row.branch,
      domain: row.domain,
      settings: JSON.parse(row.settings_json),
    };

    if (row.search_console_url !== null) {
      repo.searchConsole = { propertyUrl: row.search_console_url };
    }

    return repo;
  }

  async saveRepo(repo: RepoConfig): Promise<void> {
    this.db.prepare(`
      INSERT INTO repos (id, url, branch, domain, settings_json, search_console_url, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(id) DO UPDATE SET
        url = excluded.url,
        branch = excluded.branch,
        domain = excluded.domain,
        settings_json = excluded.settings_json,
        search_console_url = excluded.search_console_url,
        updated_at = datetime('now')
    `).run(
      repo.id,
      repo.url,
      repo.branch,
      repo.domain,
      JSON.stringify(repo.settings),
      repo.searchConsole?.propertyUrl ?? null
    );
  }

  // ============================================
  // Codebase Profile Methods
  // ============================================

  async getCodebaseProfile(repoId: string): Promise<CodebaseProfile | null> {
    const row = this.db.prepare(`
      SELECT * FROM codebase_profiles
      WHERE repo_id = ?
      ORDER BY scanned_at DESC
      LIMIT 1
    `).get(repoId) as {
      repo_id: string;
      scanned_at: string;
      commit_hash: string;
      framework: string;
      framework_version: string | null;
      structure_json: string;
      seo_patterns_json: string;
      build_system_json: string;
      pages_json: string;
      safe_zones_json: string;
      danger_zones_json: string;
    } | undefined;

    if (!row) return null;

    const profile: CodebaseProfile = {
      repoId: row.repo_id,
      scannedAt: parseDate(row.scanned_at),
      commitHash: row.commit_hash,
      framework: row.framework as CodebaseProfile['framework'],
      structure: JSON.parse(row.structure_json),
      seoPatterns: JSON.parse(row.seo_patterns_json),
      buildSystem: JSON.parse(row.build_system_json),
      pages: JSON.parse(row.pages_json),
      safeZones: JSON.parse(row.safe_zones_json),
      dangerZones: JSON.parse(row.danger_zones_json),
    };

    if (row.framework_version !== null) {
      profile.frameworkVersion = row.framework_version;
    }

    return profile;
  }

  async saveCodebaseProfile(profile: CodebaseProfile): Promise<void> {
    this.db.prepare(`
      INSERT INTO codebase_profiles (
        repo_id, scanned_at, commit_hash, framework, framework_version,
        structure_json, seo_patterns_json, build_system_json, pages_json,
        safe_zones_json, danger_zones_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      profile.repoId,
      formatDateTime(profile.scannedAt),
      profile.commitHash,
      profile.framework,
      profile.frameworkVersion ?? null,
      JSON.stringify(profile.structure),
      JSON.stringify(profile.seoPatterns),
      JSON.stringify(profile.buildSystem),
      JSON.stringify(profile.pages),
      JSON.stringify(profile.safeZones),
      JSON.stringify(profile.dangerZones)
    );
  }

  // ============================================
  // Metrics Methods
  // ============================================

  async getMetrics(repoId: string, date: Date): Promise<DailyMetrics | null> {
    const row = this.db.prepare(`
      SELECT * FROM daily_metrics
      WHERE repo_id = ? AND date = ?
    `).get(repoId, formatDate(date)) as {
      repo_id: string;
      date: string;
      clicks: number;
      impressions: number;
      ctr: number;
      position: number;
      clicks_change: number;
      impressions_change: number;
      ctr_change: number;
      position_change: number;
      pages_json: string;
      queries_json: string;
    } | undefined;

    if (!row) return null;

    return {
      repoId: row.repo_id,
      date: parseDate(row.date),
      clicks: row.clicks,
      impressions: row.impressions,
      ctr: row.ctr,
      position: row.position,
      clicksChange: row.clicks_change,
      impressionsChange: row.impressions_change,
      ctrChange: row.ctr_change,
      positionChange: row.position_change,
      pages: JSON.parse(row.pages_json) as PageMetrics[],
      queries: JSON.parse(row.queries_json) as QueryMetrics[],
    };
  }

  async saveMetrics(metrics: DailyMetrics): Promise<void> {
    this.db.prepare(`
      INSERT INTO daily_metrics (
        repo_id, date, clicks, impressions, ctr, position,
        clicks_change, impressions_change, ctr_change, position_change,
        pages_json, queries_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(repo_id, date) DO UPDATE SET
        clicks = excluded.clicks,
        impressions = excluded.impressions,
        ctr = excluded.ctr,
        position = excluded.position,
        clicks_change = excluded.clicks_change,
        impressions_change = excluded.impressions_change,
        ctr_change = excluded.ctr_change,
        position_change = excluded.position_change,
        pages_json = excluded.pages_json,
        queries_json = excluded.queries_json
    `).run(
      metrics.repoId,
      formatDate(metrics.date),
      metrics.clicks,
      metrics.impressions,
      metrics.ctr,
      metrics.position,
      metrics.clicksChange,
      metrics.impressionsChange,
      metrics.ctrChange,
      metrics.positionChange,
      JSON.stringify(metrics.pages),
      JSON.stringify(metrics.queries)
    );
  }

  async getMetricsRange(repoId: string, startDate: Date, endDate: Date): Promise<DailyMetrics[]> {
    const rows = this.db.prepare(`
      SELECT * FROM daily_metrics
      WHERE repo_id = ? AND date >= ? AND date <= ?
      ORDER BY date ASC
    `).all(repoId, formatDate(startDate), formatDate(endDate)) as Array<{
      repo_id: string;
      date: string;
      clicks: number;
      impressions: number;
      ctr: number;
      position: number;
      clicks_change: number;
      impressions_change: number;
      ctr_change: number;
      position_change: number;
      pages_json: string;
      queries_json: string;
    }>;

    return rows.map(row => ({
      repoId: row.repo_id,
      date: parseDate(row.date),
      clicks: row.clicks,
      impressions: row.impressions,
      ctr: row.ctr,
      position: row.position,
      clicksChange: row.clicks_change,
      impressionsChange: row.impressions_change,
      ctrChange: row.ctr_change,
      positionChange: row.position_change,
      pages: JSON.parse(row.pages_json) as PageMetrics[],
      queries: JSON.parse(row.queries_json) as QueryMetrics[],
    }));
  }

  // ============================================
  // Change Methods
  // ============================================

  async getChange(id: string): Promise<Change | null> {
    const row = this.db.prepare(`
      SELECT * FROM changes WHERE id = ?
    `).get(id) as {
      id: string;
      repo_id: string;
      timestamp: string;
      type: string;
      file: string;
      description: string;
      commit_sha: string;
      affected_pages_json: string;
      expected_impact: string;
      measured_impact_json: string | null;
    } | undefined;

    if (!row) return null;

    const change: Change = {
      id: row.id,
      repoId: row.repo_id,
      timestamp: parseDate(row.timestamp),
      type: row.type as Change['type'],
      file: row.file,
      description: row.description,
      commitSha: row.commit_sha,
      affectedPages: JSON.parse(row.affected_pages_json),
      expectedImpact: row.expected_impact,
    };

    if (row.measured_impact_json !== null) {
      change.measuredImpact = JSON.parse(row.measured_impact_json) as MeasuredImpact;
    }

    return change;
  }

  async saveChange(change: Change): Promise<void> {
    this.db.prepare(`
      INSERT INTO changes (
        id, repo_id, timestamp, type, file, description,
        commit_sha, affected_pages_json, expected_impact, measured_impact_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      change.id,
      change.repoId,
      formatDateTime(change.timestamp),
      change.type,
      change.file,
      change.description,
      change.commitSha,
      JSON.stringify(change.affectedPages),
      change.expectedImpact,
      change.measuredImpact ? JSON.stringify(change.measuredImpact) : null
    );
  }

  async getChangesForDate(repoId: string, date: Date): Promise<Change[]> {
    const dateStr = formatDate(date);
    const rows = this.db.prepare(`
      SELECT * FROM changes
      WHERE repo_id = ? AND date(timestamp) = ?
      ORDER BY timestamp ASC
    `).all(repoId, dateStr) as Array<{
      id: string;
      repo_id: string;
      timestamp: string;
      type: string;
      file: string;
      description: string;
      commit_sha: string;
      affected_pages_json: string;
      expected_impact: string;
      measured_impact_json: string | null;
    }>;

    return rows.map(row => {
      const change: Change = {
        id: row.id,
        repoId: row.repo_id,
        timestamp: parseDate(row.timestamp),
        type: row.type as Change['type'],
        file: row.file,
        description: row.description,
        commitSha: row.commit_sha,
        affectedPages: JSON.parse(row.affected_pages_json),
        expectedImpact: row.expected_impact,
      };

      if (row.measured_impact_json !== null) {
        change.measuredImpact = JSON.parse(row.measured_impact_json) as MeasuredImpact;
      }

      return change;
    });
  }

  async updateChange(id: string, updates: Partial<Change>): Promise<void> {
    const setClauses: string[] = [];
    const values: unknown[] = [];

    if (updates.measuredImpact !== undefined) {
      setClauses.push('measured_impact_json = ?');
      values.push(JSON.stringify(updates.measuredImpact));
    }

    if (updates.description !== undefined) {
      setClauses.push('description = ?');
      values.push(updates.description);
    }

    if (setClauses.length === 0) return;

    values.push(id);
    this.db.prepare(`
      UPDATE changes SET ${setClauses.join(', ')} WHERE id = ?
    `).run(...values);
  }

  // ============================================
  // Content Methods
  // ============================================

  async getContent(id: string): Promise<BlogPost | null> {
    const row = this.db.prepare(`
      SELECT * FROM content WHERE id = ?
    `).get(id) as {
      id: string;
      repo_id: string;
      title: string;
      slug: string;
      content: string;
      excerpt: string;
      target_keyword: string;
      secondary_keywords_json: string;
      meta_description: string;
      featured_image_json: string | null;
      author: string;
      published_at: string;
      frontmatter_json: string;
      file_path: string;
      format: string;
    } | undefined;

    if (!row) return null;

    const post: BlogPost = {
      id: row.id,
      repoId: row.repo_id,
      title: row.title,
      slug: row.slug,
      content: row.content,
      excerpt: row.excerpt,
      targetKeyword: row.target_keyword,
      secondaryKeywords: JSON.parse(row.secondary_keywords_json),
      metaDescription: row.meta_description,
      author: row.author,
      publishedAt: parseDate(row.published_at),
      frontmatter: JSON.parse(row.frontmatter_json),
      filePath: row.file_path,
      format: row.format as BlogPost['format'],
    };

    if (row.featured_image_json !== null) {
      post.featuredImage = JSON.parse(row.featured_image_json);
    }

    return post;
  }

  async saveContent(repoId: string, post: BlogPost): Promise<void> {
    this.db.prepare(`
      INSERT INTO content (
        id, repo_id, title, slug, content, excerpt,
        target_keyword, secondary_keywords_json, meta_description,
        featured_image_json, author, published_at, frontmatter_json,
        file_path, format, status, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'published', datetime('now'))
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        slug = excluded.slug,
        content = excluded.content,
        excerpt = excluded.excerpt,
        target_keyword = excluded.target_keyword,
        secondary_keywords_json = excluded.secondary_keywords_json,
        meta_description = excluded.meta_description,
        featured_image_json = excluded.featured_image_json,
        author = excluded.author,
        published_at = excluded.published_at,
        frontmatter_json = excluded.frontmatter_json,
        file_path = excluded.file_path,
        format = excluded.format,
        updated_at = datetime('now')
    `).run(
      post.id,
      repoId,
      post.title,
      post.slug,
      post.content,
      post.excerpt,
      post.targetKeyword,
      JSON.stringify(post.secondaryKeywords),
      post.metaDescription,
      post.featuredImage ? JSON.stringify(post.featuredImage) : null,
      post.author,
      formatDateTime(post.publishedAt),
      JSON.stringify(post.frontmatter),
      post.filePath,
      post.format
    );
  }

  async getContentTitles(repoId: string): Promise<string[]> {
    const rows = this.db.prepare(`
      SELECT title FROM content WHERE repo_id = ?
    `).all(repoId) as Array<{ title: string }>;

    return rows.map(row => row.title);
  }

  async getLastPublishedDate(repoId: string): Promise<Date | null> {
    const row = this.db.prepare(`
      SELECT published_at FROM content
      WHERE repo_id = ? AND status = 'published'
      ORDER BY published_at DESC
      LIMIT 1
    `).get(repoId) as { published_at: string } | undefined;

    return row ? parseDate(row.published_at) : null;
  }

  // ============================================
  // SEO Issues Methods
  // ============================================

  async saveIssues(repoId: string, issues: SEOIssue[]): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT INTO seo_issues (
        id, repo_id, type, severity, page, file,
        description, recommendation, auto_fixable, status, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', datetime('now'))
      ON CONFLICT(id) DO UPDATE SET
        type = excluded.type,
        severity = excluded.severity,
        page = excluded.page,
        file = excluded.file,
        description = excluded.description,
        recommendation = excluded.recommendation,
        auto_fixable = excluded.auto_fixable,
        updated_at = datetime('now')
    `);

    const transaction = this.db.transaction((issues: SEOIssue[]) => {
      for (const issue of issues) {
        stmt.run(
          issue.id,
          repoId,
          issue.type,
          issue.severity,
          issue.page ?? null,
          issue.file ?? null,
          issue.description,
          issue.recommendation,
          issue.autoFixable ? 1 : 0
        );
      }
    });

    transaction(issues);
  }

  async getPendingIssues(repoId: string): Promise<SEOIssue[]> {
    const rows = this.db.prepare(`
      SELECT * FROM seo_issues
      WHERE repo_id = ? AND status = 'pending'
      ORDER BY
        CASE severity
          WHEN 'critical' THEN 1
          WHEN 'warning' THEN 2
          ELSE 3
        END,
        created_at ASC
    `).all(repoId) as Array<{
      id: string;
      type: string;
      severity: string;
      page: string | null;
      file: string | null;
      description: string;
      recommendation: string;
      auto_fixable: number;
    }>;

    return rows.map(row => {
      const issue: SEOIssue = {
        id: row.id,
        type: row.type as SEOIssue['type'],
        severity: row.severity as SEOIssue['severity'],
        description: row.description,
        recommendation: row.recommendation,
        autoFixable: row.auto_fixable === 1,
      };

      if (row.page !== null) {
        issue.page = row.page;
      }
      if (row.file !== null) {
        issue.file = row.file;
      }

      return issue;
    });
  }

  // ============================================
  // Image Record Methods
  // ============================================

  async getImageCountForDay(repoId: string, date: string): Promise<number> {
    const row = this.db.prepare(`
      SELECT COUNT(*) as count FROM image_records
      WHERE repo_id = ? AND date = ?
    `).get(repoId, date) as { count: number };

    return row.count;
  }

  async saveImageRecord(record: ImageRecord): Promise<void> {
    this.db.prepare(`
      INSERT INTO image_records (
        repo_id, date, filename, provider, model, size_bytes
      ) VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      record.repoId,
      formatDate(record.date),
      record.filename,
      record.provider,
      record.model,
      record.sizeBytes
    );
  }

  // ============================================
  // Report Methods
  // ============================================

  async saveReport(type: 'daily' | 'weekly', report: DailyReport | WeeklyReport): Promise<void> {
    const weekNumber = type === 'weekly' ? (report as WeeklyReport).weekNumber : null;

    this.db.prepare(`
      INSERT INTO reports (type, date, week_number, report_json)
      VALUES (?, ?, ?, ?)
    `).run(
      type,
      formatDate(report.date),
      weekNumber,
      JSON.stringify(report)
    );
  }
}
