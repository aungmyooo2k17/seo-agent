/**
 * Database Client unit tests
 */

import * as fs from 'fs';
import * as path from 'path';
import { DatabaseClient } from '../../src/db/client';
import {
  createTempDir,
  cleanupTempDir,
  createMockRepoConfig,
  createMockCodebaseProfile,
  createMockDailyMetrics,
  createMockChange,
  createMockBlogPost,
  createMockSEOIssue,
} from '../helpers';

// We need the schema file to exist for the DatabaseClient
// Create a mock schema if the real one doesn't exist
function ensureSchema(dbDir: string): void {
  const schemaPath = path.join(dbDir, 'schema.sql');
  if (!fs.existsSync(schemaPath)) {
    fs.writeFileSync(schemaPath, `
      CREATE TABLE IF NOT EXISTS repos (
        id TEXT PRIMARY KEY,
        url TEXT NOT NULL,
        branch TEXT NOT NULL,
        domain TEXT NOT NULL,
        settings_json TEXT NOT NULL,
        search_console_url TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS codebase_profiles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        repo_id TEXT NOT NULL,
        scanned_at DATETIME NOT NULL,
        commit_hash TEXT NOT NULL,
        framework TEXT NOT NULL,
        framework_version TEXT,
        structure_json TEXT NOT NULL,
        seo_patterns_json TEXT NOT NULL,
        build_system_json TEXT NOT NULL,
        pages_json TEXT NOT NULL,
        safe_zones_json TEXT NOT NULL,
        danger_zones_json TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS daily_metrics (
        repo_id TEXT NOT NULL,
        date TEXT NOT NULL,
        clicks INTEGER NOT NULL,
        impressions INTEGER NOT NULL,
        ctr REAL NOT NULL,
        position REAL NOT NULL,
        clicks_change REAL DEFAULT 0,
        impressions_change REAL DEFAULT 0,
        ctr_change REAL DEFAULT 0,
        position_change REAL DEFAULT 0,
        pages_json TEXT NOT NULL,
        queries_json TEXT NOT NULL,
        PRIMARY KEY (repo_id, date)
      );

      CREATE TABLE IF NOT EXISTS changes (
        id TEXT PRIMARY KEY,
        repo_id TEXT NOT NULL,
        timestamp DATETIME NOT NULL,
        type TEXT NOT NULL,
        file TEXT NOT NULL,
        description TEXT NOT NULL,
        commit_sha TEXT NOT NULL,
        affected_pages_json TEXT NOT NULL,
        expected_impact TEXT NOT NULL,
        measured_impact_json TEXT
      );

      CREATE TABLE IF NOT EXISTS content (
        id TEXT PRIMARY KEY,
        repo_id TEXT NOT NULL,
        title TEXT NOT NULL,
        slug TEXT NOT NULL,
        content TEXT NOT NULL,
        excerpt TEXT NOT NULL,
        target_keyword TEXT NOT NULL,
        secondary_keywords_json TEXT NOT NULL,
        meta_description TEXT NOT NULL,
        featured_image_json TEXT,
        author TEXT NOT NULL,
        published_at DATETIME NOT NULL,
        frontmatter_json TEXT NOT NULL,
        file_path TEXT NOT NULL,
        format TEXT NOT NULL,
        status TEXT DEFAULT 'draft',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS seo_issues (
        id TEXT PRIMARY KEY,
        repo_id TEXT NOT NULL,
        type TEXT NOT NULL,
        severity TEXT NOT NULL,
        page TEXT,
        file TEXT,
        description TEXT NOT NULL,
        recommendation TEXT NOT NULL,
        auto_fixable INTEGER NOT NULL,
        status TEXT DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS image_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        repo_id TEXT NOT NULL,
        date TEXT NOT NULL,
        filename TEXT NOT NULL,
        provider TEXT NOT NULL,
        model TEXT NOT NULL,
        size_bytes INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS reports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        date TEXT NOT NULL,
        week_number INTEGER,
        report_json TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
  }
}

describe('DatabaseClient', () => {
  let tempDir: string;
  let dbPath: string;
  let db: DatabaseClient;

  beforeEach(() => {
    tempDir = createTempDir();

    // Create a fake db directory structure that mimics src/db
    const dbDir = path.join(tempDir, 'db');
    fs.mkdirSync(dbDir, { recursive: true });
    ensureSchema(dbDir);

    dbPath = path.join(tempDir, 'test.db');

    // We need to mock __dirname for the schema path
    // Since we can't easily do this, we'll copy the schema to the expected location
    const srcDbDir = path.join(process.cwd(), 'src', 'db');
    if (fs.existsSync(srcDbDir)) {
      const schemaPath = path.join(srcDbDir, 'schema.sql');
      if (fs.existsSync(schemaPath)) {
        db = new DatabaseClient(dbPath);
      } else {
        // Create schema file in src/db for test
        fs.mkdirSync(srcDbDir, { recursive: true });
        fs.writeFileSync(schemaPath, `
          CREATE TABLE IF NOT EXISTS repos (id TEXT PRIMARY KEY, url TEXT NOT NULL, branch TEXT NOT NULL, domain TEXT NOT NULL, settings_json TEXT NOT NULL, search_console_url TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP);
          CREATE TABLE IF NOT EXISTS codebase_profiles (id INTEGER PRIMARY KEY AUTOINCREMENT, repo_id TEXT NOT NULL, scanned_at DATETIME NOT NULL, commit_hash TEXT NOT NULL, framework TEXT NOT NULL, framework_version TEXT, structure_json TEXT NOT NULL, seo_patterns_json TEXT NOT NULL, build_system_json TEXT NOT NULL, pages_json TEXT NOT NULL, safe_zones_json TEXT NOT NULL, danger_zones_json TEXT NOT NULL);
          CREATE TABLE IF NOT EXISTS daily_metrics (repo_id TEXT NOT NULL, date TEXT NOT NULL, clicks INTEGER NOT NULL, impressions INTEGER NOT NULL, ctr REAL NOT NULL, position REAL NOT NULL, clicks_change REAL DEFAULT 0, impressions_change REAL DEFAULT 0, ctr_change REAL DEFAULT 0, position_change REAL DEFAULT 0, pages_json TEXT NOT NULL, queries_json TEXT NOT NULL, PRIMARY KEY (repo_id, date));
          CREATE TABLE IF NOT EXISTS changes (id TEXT PRIMARY KEY, repo_id TEXT NOT NULL, timestamp DATETIME NOT NULL, type TEXT NOT NULL, file TEXT NOT NULL, description TEXT NOT NULL, commit_sha TEXT NOT NULL, affected_pages_json TEXT NOT NULL, expected_impact TEXT NOT NULL, measured_impact_json TEXT);
          CREATE TABLE IF NOT EXISTS content (id TEXT PRIMARY KEY, repo_id TEXT NOT NULL, title TEXT NOT NULL, slug TEXT NOT NULL, content TEXT NOT NULL, excerpt TEXT NOT NULL, target_keyword TEXT NOT NULL, secondary_keywords_json TEXT NOT NULL, meta_description TEXT NOT NULL, featured_image_json TEXT, author TEXT NOT NULL, published_at DATETIME NOT NULL, frontmatter_json TEXT NOT NULL, file_path TEXT NOT NULL, format TEXT NOT NULL, status TEXT DEFAULT 'draft', created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP);
          CREATE TABLE IF NOT EXISTS seo_issues (id TEXT PRIMARY KEY, repo_id TEXT NOT NULL, type TEXT NOT NULL, severity TEXT NOT NULL, page TEXT, file TEXT, description TEXT NOT NULL, recommendation TEXT NOT NULL, auto_fixable INTEGER NOT NULL, status TEXT DEFAULT 'pending', created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP);
          CREATE TABLE IF NOT EXISTS image_records (id INTEGER PRIMARY KEY AUTOINCREMENT, repo_id TEXT NOT NULL, date TEXT NOT NULL, filename TEXT NOT NULL, provider TEXT NOT NULL, model TEXT NOT NULL, size_bytes INTEGER NOT NULL);
          CREATE TABLE IF NOT EXISTS reports (id INTEGER PRIMARY KEY AUTOINCREMENT, type TEXT NOT NULL, date TEXT NOT NULL, week_number INTEGER, report_json TEXT NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);
        `);
        db = new DatabaseClient(dbPath);
      }
    } else {
      fs.mkdirSync(srcDbDir, { recursive: true });
      const schemaPath = path.join(srcDbDir, 'schema.sql');
      fs.writeFileSync(schemaPath, `
        CREATE TABLE IF NOT EXISTS repos (id TEXT PRIMARY KEY, url TEXT NOT NULL, branch TEXT NOT NULL, domain TEXT NOT NULL, settings_json TEXT NOT NULL, search_console_url TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP);
        CREATE TABLE IF NOT EXISTS codebase_profiles (id INTEGER PRIMARY KEY AUTOINCREMENT, repo_id TEXT NOT NULL, scanned_at DATETIME NOT NULL, commit_hash TEXT NOT NULL, framework TEXT NOT NULL, framework_version TEXT, structure_json TEXT NOT NULL, seo_patterns_json TEXT NOT NULL, build_system_json TEXT NOT NULL, pages_json TEXT NOT NULL, safe_zones_json TEXT NOT NULL, danger_zones_json TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS daily_metrics (repo_id TEXT NOT NULL, date TEXT NOT NULL, clicks INTEGER NOT NULL, impressions INTEGER NOT NULL, ctr REAL NOT NULL, position REAL NOT NULL, clicks_change REAL DEFAULT 0, impressions_change REAL DEFAULT 0, ctr_change REAL DEFAULT 0, position_change REAL DEFAULT 0, pages_json TEXT NOT NULL, queries_json TEXT NOT NULL, PRIMARY KEY (repo_id, date));
        CREATE TABLE IF NOT EXISTS changes (id TEXT PRIMARY KEY, repo_id TEXT NOT NULL, timestamp DATETIME NOT NULL, type TEXT NOT NULL, file TEXT NOT NULL, description TEXT NOT NULL, commit_sha TEXT NOT NULL, affected_pages_json TEXT NOT NULL, expected_impact TEXT NOT NULL, measured_impact_json TEXT);
        CREATE TABLE IF NOT EXISTS content (id TEXT PRIMARY KEY, repo_id TEXT NOT NULL, title TEXT NOT NULL, slug TEXT NOT NULL, content TEXT NOT NULL, excerpt TEXT NOT NULL, target_keyword TEXT NOT NULL, secondary_keywords_json TEXT NOT NULL, meta_description TEXT NOT NULL, featured_image_json TEXT, author TEXT NOT NULL, published_at DATETIME NOT NULL, frontmatter_json TEXT NOT NULL, file_path TEXT NOT NULL, format TEXT NOT NULL, status TEXT DEFAULT 'draft', created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP);
        CREATE TABLE IF NOT EXISTS seo_issues (id TEXT PRIMARY KEY, repo_id TEXT NOT NULL, type TEXT NOT NULL, severity TEXT NOT NULL, page TEXT, file TEXT, description TEXT NOT NULL, recommendation TEXT NOT NULL, auto_fixable INTEGER NOT NULL, status TEXT DEFAULT 'pending', created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP);
        CREATE TABLE IF NOT EXISTS image_records (id INTEGER PRIMARY KEY AUTOINCREMENT, repo_id TEXT NOT NULL, date TEXT NOT NULL, filename TEXT NOT NULL, provider TEXT NOT NULL, model TEXT NOT NULL, size_bytes INTEGER NOT NULL);
        CREATE TABLE IF NOT EXISTS reports (id INTEGER PRIMARY KEY AUTOINCREMENT, type TEXT NOT NULL, date TEXT NOT NULL, week_number INTEGER, report_json TEXT NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);
      `);
      db = new DatabaseClient(dbPath);
    }
  });

  afterEach(() => {
    if (db) {
      db.close();
    }
    cleanupTempDir(tempDir);
  });

  describe('Repository operations', () => {
    it('saves and retrieves a repo', async () => {
      const repo = createMockRepoConfig({ id: 'test-repo' });

      await db.saveRepo(repo);
      const retrieved = await db.getRepo('test-repo');

      expect(retrieved).not.toBeNull();
      expect(retrieved!.id).toBe('test-repo');
      expect(retrieved!.url).toBe(repo.url);
      expect(retrieved!.branch).toBe(repo.branch);
      expect(retrieved!.settings.contentFrequency).toBe(repo.settings.contentFrequency);
    });

    it('handles missing repo (returns null)', async () => {
      const result = await db.getRepo('nonexistent');
      expect(result).toBeNull();
    });

    it('saves repo with search console config', async () => {
      const repo = createMockRepoConfig({
        id: 'with-sc',
        searchConsole: { propertyUrl: 'sc-domain:example.com' },
      });

      await db.saveRepo(repo);
      const retrieved = await db.getRepo('with-sc');

      expect(retrieved!.searchConsole).toBeDefined();
      expect(retrieved!.searchConsole!.propertyUrl).toBe('sc-domain:example.com');
    });

    it('updates existing repo on save', async () => {
      const repo = createMockRepoConfig({ id: 'update-test', branch: 'main' });
      await db.saveRepo(repo);

      repo.branch = 'develop';
      await db.saveRepo(repo);

      const retrieved = await db.getRepo('update-test');
      expect(retrieved!.branch).toBe('develop');
    });
  });

  describe('Codebase Profile operations', () => {
    it('saves and retrieves codebase profile', async () => {
      // First create the repo to satisfy foreign key constraint
      const repo = createMockRepoConfig({ id: 'profile-test' });
      await db.saveRepo(repo);

      const profile = createMockCodebaseProfile({ repoId: 'profile-test' });

      await db.saveCodebaseProfile(profile);
      const retrieved = await db.getCodebaseProfile('profile-test');

      expect(retrieved).not.toBeNull();
      expect(retrieved!.repoId).toBe('profile-test');
      expect(retrieved!.framework).toBe(profile.framework);
      // Pages array is serialized/deserialized, so check key fields
      expect(retrieved!.pages.length).toBe(profile.pages.length);
      expect(retrieved!.pages[0].path).toBe(profile.pages[0].path);
      expect(retrieved!.pages[0].title).toBe(profile.pages[0].title);
    });

    it('handles missing codebase profile (returns null)', async () => {
      const result = await db.getCodebaseProfile('nonexistent');
      expect(result).toBeNull();
    });

    it('returns most recent profile when multiple exist', async () => {
      // First create the repo to satisfy foreign key constraint
      const repo = createMockRepoConfig({ id: 'multi-profile' });
      await db.saveRepo(repo);

      const profile1 = createMockCodebaseProfile({
        repoId: 'multi-profile',
        scannedAt: new Date('2024-01-01'),
        commitHash: 'old-commit',
      });
      const profile2 = createMockCodebaseProfile({
        repoId: 'multi-profile',
        scannedAt: new Date('2024-01-15'),
        commitHash: 'new-commit',
      });

      await db.saveCodebaseProfile(profile1);
      await db.saveCodebaseProfile(profile2);

      const retrieved = await db.getCodebaseProfile('multi-profile');
      expect(retrieved!.commitHash).toBe('new-commit');
    });
  });

  describe('Metrics operations', () => {
    it('saves and retrieves metrics', async () => {
      // First create the repo to satisfy foreign key constraint
      const repo = createMockRepoConfig({ id: 'metrics-test' });
      await db.saveRepo(repo);

      const metrics = createMockDailyMetrics({
        repoId: 'metrics-test',
        date: new Date('2024-01-20'),
      });

      await db.saveMetrics(metrics);
      const retrieved = await db.getMetrics('metrics-test', new Date('2024-01-20'));

      expect(retrieved).not.toBeNull();
      expect(retrieved!.clicks).toBe(metrics.clicks);
      expect(retrieved!.impressions).toBe(metrics.impressions);
      expect(retrieved!.pages).toEqual(metrics.pages);
    });

    it('handles missing metrics (returns null)', async () => {
      const result = await db.getMetrics('nonexistent', new Date('2024-01-20'));
      expect(result).toBeNull();
    });

    it('retrieves metrics range', async () => {
      // First create the repo to satisfy foreign key constraint
      const repo = createMockRepoConfig({ id: 'range-test' });
      await db.saveRepo(repo);

      const metrics1 = createMockDailyMetrics({
        repoId: 'range-test',
        date: new Date('2024-01-18'),
        clicks: 100,
      });
      const metrics2 = createMockDailyMetrics({
        repoId: 'range-test',
        date: new Date('2024-01-19'),
        clicks: 150,
      });
      const metrics3 = createMockDailyMetrics({
        repoId: 'range-test',
        date: new Date('2024-01-20'),
        clicks: 200,
      });

      await db.saveMetrics(metrics1);
      await db.saveMetrics(metrics2);
      await db.saveMetrics(metrics3);

      const range = await db.getMetricsRange(
        'range-test',
        new Date('2024-01-18'),
        new Date('2024-01-20')
      );

      expect(range.length).toBe(3);
      expect(range[0].clicks).toBe(100);
      expect(range[2].clicks).toBe(200);
    });
  });

  describe('Change operations', () => {
    it('saves and retrieves changes', async () => {
      // First create the repo to satisfy foreign key constraint
      const repo = createMockRepoConfig({ id: 'test-repo' });
      await db.saveRepo(repo);

      const change = createMockChange({ id: 'change-test', repoId: 'test-repo' });

      await db.saveChange(change);
      const retrieved = await db.getChange('change-test');

      expect(retrieved).not.toBeNull();
      expect(retrieved!.id).toBe('change-test');
      expect(retrieved!.type).toBe(change.type);
      expect(retrieved!.affectedPages).toEqual(change.affectedPages);
    });

    it('handles missing change (returns null)', async () => {
      const result = await db.getChange('nonexistent');
      expect(result).toBeNull();
    });

    it('retrieves changes for date', async () => {
      // First create the repo to satisfy foreign key constraint
      const repo = createMockRepoConfig({ id: 'date-repo' });
      await db.saveRepo(repo);

      const change1 = createMockChange({
        id: 'date-change-1',
        repoId: 'date-repo',
        timestamp: new Date('2024-01-20T10:00:00Z'),
      });
      const change2 = createMockChange({
        id: 'date-change-2',
        repoId: 'date-repo',
        timestamp: new Date('2024-01-20T14:00:00Z'),
      });

      await db.saveChange(change1);
      await db.saveChange(change2);

      const changes = await db.getChangesForDate('date-repo', new Date('2024-01-20'));
      expect(changes.length).toBe(2);
    });

    it('updates change with measured impact', async () => {
      // First create the repo to satisfy foreign key constraint
      const repo = createMockRepoConfig({ id: 'update-repo' });
      await db.saveRepo(repo);

      const change = createMockChange({ id: 'update-change', repoId: 'update-repo' });
      await db.saveChange(change);

      await db.updateChange('update-change', {
        measuredImpact: {
          clicksBefore: 100,
          clicksAfter: 150,
          measurementPeriod: 7,
        },
      });

      const retrieved = await db.getChange('update-change');
      expect(retrieved!.measuredImpact).toBeDefined();
      expect(retrieved!.measuredImpact!.clicksAfter).toBe(150);
    });
  });

  describe('Content operations', () => {
    it('saves and retrieves content', async () => {
      // First create the repo to satisfy foreign key constraint
      const repo = createMockRepoConfig({ id: 'content-repo' });
      await db.saveRepo(repo);

      const post = createMockBlogPost({ id: 'post-test', repoId: 'content-repo' });

      await db.saveContent('content-repo', post);
      const retrieved = await db.getContent('post-test');

      expect(retrieved).not.toBeNull();
      expect(retrieved!.title).toBe(post.title);
      expect(retrieved!.slug).toBe(post.slug);
      expect(retrieved!.secondaryKeywords).toEqual(post.secondaryKeywords);
    });

    it('handles missing content (returns null)', async () => {
      const result = await db.getContent('nonexistent');
      expect(result).toBeNull();
    });

    it('retrieves content titles', async () => {
      // First create the repo to satisfy foreign key constraint
      const repo = createMockRepoConfig({ id: 'titles-repo' });
      await db.saveRepo(repo);

      const post1 = createMockBlogPost({ id: 'title-1', title: 'First Post', slug: 'first-post' });
      const post2 = createMockBlogPost({ id: 'title-2', title: 'Second Post', slug: 'second-post' });

      await db.saveContent('titles-repo', post1);
      await db.saveContent('titles-repo', post2);

      const titles = await db.getContentTitles('titles-repo');
      expect(titles).toContain('First Post');
      expect(titles).toContain('Second Post');
    });

    it('retrieves last published date', async () => {
      // First create the repo to satisfy foreign key constraint
      const repo = createMockRepoConfig({ id: 'published-repo' });
      await db.saveRepo(repo);

      const post = createMockBlogPost({
        id: 'published-post',
        publishedAt: new Date('2024-01-15T12:00:00Z'),
      });

      await db.saveContent('published-repo', post);
      const lastDate = await db.getLastPublishedDate('published-repo');

      expect(lastDate).not.toBeNull();
      expect(lastDate!.toISOString().slice(0, 10)).toBe('2024-01-15');
    });

    it('returns null for last published date when no content', async () => {
      const result = await db.getLastPublishedDate('no-content-repo');
      expect(result).toBeNull();
    });
  });

  describe('SEO Issues operations', () => {
    it('saves issues in batch', async () => {
      // First create the repo to satisfy foreign key constraint
      const repo = createMockRepoConfig({ id: 'issues-repo' });
      await db.saveRepo(repo);

      const issues = [
        createMockSEOIssue({ id: 'issue-1' }),
        createMockSEOIssue({ id: 'issue-2' }),
      ];

      await db.saveIssues('issues-repo', issues);
      const pending = await db.getPendingIssues('issues-repo');

      expect(pending.length).toBe(2);
    });

    it('retrieves pending issues sorted by severity', async () => {
      // First create the repo to satisfy foreign key constraint
      const repo = createMockRepoConfig({ id: 'severity-repo' });
      await db.saveRepo(repo);

      const issues = [
        createMockSEOIssue({ id: 'info-issue', severity: 'info' }),
        createMockSEOIssue({ id: 'critical-issue', severity: 'critical' }),
        createMockSEOIssue({ id: 'warning-issue', severity: 'warning' }),
      ];

      await db.saveIssues('severity-repo', issues);
      const pending = await db.getPendingIssues('severity-repo');

      expect(pending[0].severity).toBe('critical');
      expect(pending[1].severity).toBe('warning');
      expect(pending[2].severity).toBe('info');
    });
  });

  describe('Image Record operations', () => {
    it('gets image count for day', async () => {
      // First create the repo to satisfy foreign key constraint
      const repo = createMockRepoConfig({ id: 'image-repo' });
      await db.saveRepo(repo);

      const record1 = {
        repoId: 'image-repo',
        date: new Date('2024-01-20'),
        filename: 'image1.webp',
        provider: 'replicate',
        model: 'sdxl',
        sizeBytes: 10000,
      };
      const record2 = {
        repoId: 'image-repo',
        date: new Date('2024-01-20'),
        filename: 'image2.webp',
        provider: 'replicate',
        model: 'sdxl',
        sizeBytes: 15000,
      };

      await db.saveImageRecord(record1);
      await db.saveImageRecord(record2);

      const count = await db.getImageCountForDay('image-repo', '2024-01-20');
      expect(count).toBe(2);
    });

    it('returns 0 for day with no images', async () => {
      const count = await db.getImageCountForDay('no-images', '2024-01-20');
      expect(count).toBe(0);
    });
  });

  describe('Report operations', () => {
    it('saves daily report', async () => {
      const report = {
        date: new Date('2024-01-20'),
        repos: [],
        totalClicks: 1000,
        totalImpressions: 50000,
        changesAcrossRepos: 5,
      };

      // Should not throw
      await expect(db.saveReport('daily', report)).resolves.not.toThrow();
    });

    it('saves weekly report with week number', async () => {
      const report = {
        date: new Date('2024-01-20'),
        repos: [],
        totalClicks: 7000,
        totalImpressions: 350000,
        changesAcrossRepos: 35,
        weekNumber: 3,
        totalChanges: 35,
        totalBlogsPublished: 7,
        newKeywordsRanking: 15,
        keywordsImproved: 25,
        clicksTrend: [900, 950, 1000, 1050, 1000, 1100, 1000],
        impressionsTrend: [45000, 48000, 50000, 52000, 50000, 55000, 50000],
        biggestWins: [],
      };

      await expect(db.saveReport('weekly', report)).resolves.not.toThrow();
    });
  });
});
