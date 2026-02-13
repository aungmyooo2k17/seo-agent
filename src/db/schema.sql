-- SEO Optimizer Database Schema
-- SQLite with better-sqlite3
-- All tables use IF NOT EXISTS for idempotent runs

-- Repository configurations
CREATE TABLE IF NOT EXISTS repos (
    id TEXT PRIMARY KEY,
    url TEXT NOT NULL,
    branch TEXT NOT NULL DEFAULT 'main',
    domain TEXT NOT NULL,
    settings_json TEXT NOT NULL,
    search_console_url TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Codebase profiles from scanning
CREATE TABLE IF NOT EXISTS codebase_profiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    repo_id TEXT NOT NULL REFERENCES repos(id) ON DELETE CASCADE,
    scanned_at TEXT NOT NULL DEFAULT (datetime('now')),
    commit_hash TEXT NOT NULL,
    framework TEXT NOT NULL,
    framework_version TEXT,
    structure_json TEXT NOT NULL,
    seo_patterns_json TEXT NOT NULL,
    build_system_json TEXT NOT NULL,
    pages_json TEXT NOT NULL,
    safe_zones_json TEXT NOT NULL DEFAULT '[]',
    danger_zones_json TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_codebase_profiles_repo
    ON codebase_profiles(repo_id, scanned_at DESC);

-- Daily metrics from Search Console
CREATE TABLE IF NOT EXISTS daily_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    repo_id TEXT NOT NULL REFERENCES repos(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    clicks INTEGER NOT NULL DEFAULT 0,
    impressions INTEGER NOT NULL DEFAULT 0,
    ctr REAL NOT NULL DEFAULT 0,
    position REAL NOT NULL DEFAULT 0,
    clicks_change REAL NOT NULL DEFAULT 0,
    impressions_change REAL NOT NULL DEFAULT 0,
    ctr_change REAL NOT NULL DEFAULT 0,
    position_change REAL NOT NULL DEFAULT 0,
    pages_json TEXT NOT NULL DEFAULT '[]',
    queries_json TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(repo_id, date)
);

CREATE INDEX IF NOT EXISTS idx_daily_metrics_date
    ON daily_metrics(repo_id, date DESC);

-- Changes made to repositories
CREATE TABLE IF NOT EXISTS changes (
    id TEXT PRIMARY KEY,
    repo_id TEXT NOT NULL REFERENCES repos(id) ON DELETE CASCADE,
    timestamp TEXT NOT NULL DEFAULT (datetime('now')),
    type TEXT NOT NULL,
    file TEXT NOT NULL,
    description TEXT NOT NULL,
    commit_sha TEXT NOT NULL,
    affected_pages_json TEXT NOT NULL DEFAULT '[]',
    expected_impact TEXT NOT NULL,
    measured_impact_json TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_changes_repo_date
    ON changes(repo_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_changes_type
    ON changes(type);

-- SEO issues detected
CREATE TABLE IF NOT EXISTS seo_issues (
    id TEXT PRIMARY KEY,
    repo_id TEXT NOT NULL REFERENCES repos(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    severity TEXT NOT NULL,
    page TEXT,
    file TEXT,
    description TEXT NOT NULL,
    recommendation TEXT NOT NULL,
    auto_fixable INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending',
    fixed_at TEXT,
    fix_change_id TEXT REFERENCES changes(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_seo_issues_repo_status
    ON seo_issues(repo_id, status);

CREATE INDEX IF NOT EXISTS idx_seo_issues_type
    ON seo_issues(type);

-- Blog posts / generated content
CREATE TABLE IF NOT EXISTS content (
    id TEXT PRIMARY KEY,
    repo_id TEXT NOT NULL REFERENCES repos(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    slug TEXT NOT NULL,
    content TEXT NOT NULL,
    excerpt TEXT NOT NULL,
    target_keyword TEXT NOT NULL,
    secondary_keywords_json TEXT NOT NULL DEFAULT '[]',
    meta_description TEXT NOT NULL,
    featured_image_json TEXT,
    author TEXT NOT NULL,
    published_at TEXT NOT NULL,
    frontmatter_json TEXT NOT NULL DEFAULT '{}',
    file_path TEXT NOT NULL,
    format TEXT NOT NULL DEFAULT 'md',
    status TEXT NOT NULL DEFAULT 'draft',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_content_repo
    ON content(repo_id, published_at DESC);

CREATE INDEX IF NOT EXISTS idx_content_keyword
    ON content(target_keyword);

CREATE UNIQUE INDEX IF NOT EXISTS idx_content_repo_slug
    ON content(repo_id, slug);

-- Content calendar for scheduled posts
CREATE TABLE IF NOT EXISTS content_calendar (
    id TEXT PRIMARY KEY,
    repo_id TEXT NOT NULL REFERENCES repos(id) ON DELETE CASCADE,
    topic TEXT NOT NULL,
    target_keyword TEXT NOT NULL,
    scheduled_for TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'scheduled',
    content_id TEXT REFERENCES content(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_content_calendar_repo_date
    ON content_calendar(repo_id, scheduled_for);

CREATE INDEX IF NOT EXISTS idx_content_calendar_status
    ON content_calendar(status);

-- Image generation records for quota tracking
CREATE TABLE IF NOT EXISTS image_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    repo_id TEXT NOT NULL REFERENCES repos(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    filename TEXT NOT NULL,
    provider TEXT NOT NULL,
    model TEXT NOT NULL,
    size_bytes INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_image_records_repo_date
    ON image_records(repo_id, date);

-- Reports (daily and weekly)
CREATE TABLE IF NOT EXISTS reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL CHECK(type IN ('daily', 'weekly')),
    date TEXT NOT NULL,
    week_number INTEGER,
    report_json TEXT NOT NULL,
    sent_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_reports_type_date
    ON reports(type, date DESC);

-- Migration tracking
CREATE TABLE IF NOT EXISTS schema_migrations (
    version INTEGER PRIMARY KEY,
    applied_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Insert initial migration version
INSERT OR IGNORE INTO schema_migrations (version) VALUES (1);
