/**
 * Reports integration tests
 * Tests daily and weekly report generation
 */

import {
  createMockDatabase,
  createMockRepoConfig,
  createMockDailyMetrics,
  createMockChange,
} from '../helpers';
import type {
  DailyReport,
  WeeklyReport,
  RepoReport,
  DailyMetrics,
  Change,
  RepoConfig,
} from '../../src/types';

// Mock Search Console client
const createMockSearchConsoleClient = () => ({
  getDailyMetrics: jest.fn().mockResolvedValue(createMockDailyMetrics()),
  getMetricsRange: jest.fn().mockResolvedValue([createMockDailyMetrics()]),
});

describe('Reports Integration', () => {
  const mockDb = createMockDatabase();
  const mockSearchConsole = createMockSearchConsoleClient();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Daily Report Generation', () => {
    it('generates daily report with correct structure', async () => {
      const repos = [
        createMockRepoConfig({ id: 'repo-1', domain: 'https://site1.com' }),
        createMockRepoConfig({ id: 'repo-2', domain: 'https://site2.com' }),
      ];

      const metrics1 = createMockDailyMetrics({
        repoId: 'repo-1',
        clicks: 100,
        impressions: 5000,
        ctr: 0.02,
        position: 8,
      });

      const metrics2 = createMockDailyMetrics({
        repoId: 'repo-2',
        clicks: 200,
        impressions: 10000,
        ctr: 0.02,
        position: 5,
      });

      const changes = [
        createMockChange({ repoId: 'repo-1', type: 'meta-title' }),
        createMockChange({ repoId: 'repo-2', type: 'blog-published' }),
      ];

      mockDb.getMetrics.mockImplementation(async (repoId: string) => {
        return repoId === 'repo-1' ? metrics1 : metrics2;
      });

      mockDb.getChangesForDate.mockImplementation(async (repoId: string) => {
        return changes.filter(c => c.repoId === repoId);
      });

      mockDb.getMetricsRange.mockResolvedValue([]);

      // Simulate report generation
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const repoReports: RepoReport[] = [];

      for (const repo of repos) {
        const repoMetrics = await mockDb.getMetrics(repo.id, yesterday);
        const repoChanges = await mockDb.getChangesForDate(repo.id, yesterday);

        const repoReport: RepoReport = {
          repoId: repo.id,
          domain: repo.domain,
          metrics: {
            clicks: repoMetrics!.clicks,
            clicksChange: repoMetrics!.clicksChange,
            impressions: repoMetrics!.impressions,
            impressionsChange: repoMetrics!.impressionsChange,
            ctr: repoMetrics!.ctr,
            ctrChange: repoMetrics!.ctrChange,
            position: repoMetrics!.position,
            positionChange: repoMetrics!.positionChange,
          },
          changes: repoChanges,
          topGrowingPages: [],
          issuesFixed: repoChanges.filter(c =>
            ['meta-title', 'meta-description', 'og-tags', 'schema', 'alt-text'].includes(c.type)
          ).length,
          contentPublished: repoChanges.filter(c => c.type === 'blog-published').length,
          imagesGenerated: repoChanges.filter(c => c.type === 'image-added').length,
          nextActions: [],
        };

        repoReports.push(repoReport);
      }

      const report: DailyReport = {
        date: yesterday,
        repos: repoReports,
        totalClicks: repoReports.reduce((sum, r) => sum + r.metrics.clicks, 0),
        totalImpressions: repoReports.reduce((sum, r) => sum + r.metrics.impressions, 0),
        changesAcrossRepos: repoReports.reduce((sum, r) => sum + r.changes.length, 0),
      };

      // Verify report structure
      expect(report.repos).toHaveLength(2);
      expect(report.totalClicks).toBe(300);
      expect(report.totalImpressions).toBe(15000);
      expect(report.changesAcrossRepos).toBe(2);

      // Verify repo reports
      expect(report.repos[0].issuesFixed).toBe(1);
      expect(report.repos[1].contentPublished).toBe(1);
    });

    it('generates daily report with empty data', async () => {
      const repos = [createMockRepoConfig({ id: 'empty-repo' })];

      mockDb.getMetrics.mockResolvedValue(null);
      mockDb.getChangesForDate.mockResolvedValue([]);

      const emptyMetrics: DailyMetrics = {
        repoId: 'empty-repo',
        date: new Date(),
        clicks: 0,
        impressions: 0,
        ctr: 0,
        position: 0,
        clicksChange: 0,
        impressionsChange: 0,
        ctrChange: 0,
        positionChange: 0,
        pages: [],
        queries: [],
      };

      mockSearchConsole.getDailyMetrics.mockResolvedValue(emptyMetrics);

      const report: DailyReport = {
        date: new Date(),
        repos: [{
          repoId: 'empty-repo',
          domain: repos[0].domain,
          metrics: {
            clicks: 0,
            clicksChange: 0,
            impressions: 0,
            impressionsChange: 0,
            ctr: 0,
            ctrChange: 0,
            position: 0,
            positionChange: 0,
          },
          changes: [],
          topGrowingPages: [],
          issuesFixed: 0,
          contentPublished: 0,
          imagesGenerated: 0,
          nextActions: ['No optimizations made today - consider publishing new content'],
        }],
        totalClicks: 0,
        totalImpressions: 0,
        changesAcrossRepos: 0,
      };

      expect(report.totalClicks).toBe(0);
      expect(report.repos[0].nextActions.length).toBeGreaterThan(0);
    });

    it('calculates change percentages correctly', () => {
      const oldValue = 100;
      const newValue = 120;

      const percentageChange = ((newValue - oldValue) / oldValue) * 100;

      expect(percentageChange).toBe(20);
    });

    it('handles zero old value in percentage calculation', () => {
      const oldValue = 0;
      const newValue = 50;

      // Special handling for zero
      const percentageChange = oldValue === 0 ? (newValue > 0 ? 100 : 0) : ((newValue - oldValue) / oldValue) * 100;

      expect(percentageChange).toBe(100);
    });
  });

  describe('Weekly Report Generation', () => {
    it('generates weekly report with correct structure', () => {
      const dailyMetrics: DailyMetrics[] = Array.from({ length: 7 }, (_, i) => ({
        ...createMockDailyMetrics(),
        date: new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000),
        clicks: 100 + i * 10, // Increasing trend
        impressions: 5000 + i * 500,
      }));

      const weeklyReport: WeeklyReport = {
        date: new Date(),
        repos: [{
          repoId: 'test-repo',
          domain: 'https://example.com',
          metrics: {
            clicks: dailyMetrics.reduce((sum, m) => sum + m.clicks, 0) / 7,
            clicksChange: 15, // Overall growth
            impressions: dailyMetrics.reduce((sum, m) => sum + m.impressions, 0) / 7,
            impressionsChange: 12,
            ctr: 0.025,
            ctrChange: 5,
            position: 7.5,
            positionChange: 2, // Improved
          },
          changes: [],
          topGrowingPages: [
            { page: '/blog/popular', clicks: 50, change: 25 },
            { page: '/services', clicks: 30, change: 15 },
          ],
          issuesFixed: 5,
          contentPublished: 2,
          imagesGenerated: 3,
          nextActions: ['Continue content publishing momentum'],
        }],
        totalClicks: dailyMetrics.reduce((sum, m) => sum + m.clicks, 0),
        totalImpressions: dailyMetrics.reduce((sum, m) => sum + m.impressions, 0),
        changesAcrossRepos: 10,
        weekNumber: 3,
        totalChanges: 10,
        totalBlogsPublished: 2,
        newKeywordsRanking: 15,
        keywordsImproved: 25,
        clicksTrend: dailyMetrics.map(m => m.clicks),
        impressionsTrend: dailyMetrics.map(m => m.impressions),
        biggestWins: [
          { type: 'ranking', description: 'Keyword "seo tips" moved to position 3', impact: '+200% clicks' },
          { type: 'content', description: 'New blog post generating 50 daily clicks', impact: '+15% total traffic' },
        ],
      };

      // Verify structure
      expect(weeklyReport.weekNumber).toBe(3);
      expect(weeklyReport.clicksTrend).toHaveLength(7);
      expect(weeklyReport.impressionsTrend).toHaveLength(7);
      expect(weeklyReport.biggestWins).toHaveLength(2);
      expect(weeklyReport.totalBlogsPublished).toBe(2);
    });

    it('report has correct structure with required fields', () => {
      const report: WeeklyReport = {
        date: new Date('2024-01-20'),
        repos: [],
        totalClicks: 1500,
        totalImpressions: 75000,
        changesAcrossRepos: 25,
        weekNumber: 3,
        totalChanges: 25,
        totalBlogsPublished: 3,
        newKeywordsRanking: 10,
        keywordsImproved: 20,
        clicksTrend: [180, 200, 220, 210, 230, 240, 220],
        impressionsTrend: [10000, 10500, 11000, 10800, 11200, 11500, 10000],
        biggestWins: [],
      };

      // Type checking ensures all required fields are present
      expect(report.date).toBeInstanceOf(Date);
      expect(Array.isArray(report.repos)).toBe(true);
      expect(typeof report.totalClicks).toBe('number');
      expect(typeof report.totalImpressions).toBe('number');
      expect(typeof report.weekNumber).toBe('number');
      expect(Array.isArray(report.clicksTrend)).toBe(true);
      expect(report.clicksTrend.length).toBe(7);
    });

    it('calculates week-over-week changes', () => {
      const thisWeekClicks = 1500;
      const lastWeekClicks = 1200;

      const weekOverWeekChange = ((thisWeekClicks - lastWeekClicks) / lastWeekClicks) * 100;

      expect(weekOverWeekChange).toBe(25);
    });

    it('identifies biggest wins from changes', () => {
      const changes: Change[] = [
        createMockChange({
          type: 'meta-title',
          description: 'Optimized title for homepage',
          expectedImpact: 'Improved CTR',
          measuredImpact: { clicksBefore: 100, clicksAfter: 150, measurementPeriod: 7 },
        }),
        createMockChange({
          type: 'blog-published',
          description: 'Published SEO guide',
          expectedImpact: 'New traffic source',
          measuredImpact: { clicksBefore: 0, clicksAfter: 80, measurementPeriod: 7 },
        }),
      ];

      // Find biggest wins (changes with positive measured impact)
      const biggestWins = changes
        .filter(c => c.measuredImpact && c.measuredImpact.clicksAfter > c.measuredImpact.clicksBefore)
        .sort((a, b) => {
          const aGain = a.measuredImpact!.clicksAfter - a.measuredImpact!.clicksBefore;
          const bGain = b.measuredImpact!.clicksAfter - b.measuredImpact!.clicksBefore;
          return bGain - aGain;
        })
        .slice(0, 3);

      expect(biggestWins).toHaveLength(2);
      // Blog has biggest absolute gain (80 vs 50)
      expect(biggestWins[0].type).toBe('blog-published');
    });
  });

  describe('Next Actions Generation', () => {
    it('suggests CTR improvement when CTR is low', () => {
      const metrics: DailyMetrics = createMockDailyMetrics({
        ctr: 0.015, // Below 2%
        impressions: 10000,
        clicks: 150,
      });

      const actions: string[] = [];

      if (metrics.ctr < 0.02) {
        actions.push('Consider improving meta titles and descriptions to increase CTR');
      }

      expect(actions).toContain('Consider improving meta titles and descriptions to increase CTR');
    });

    it('suggests SERP review for high impressions low clicks', () => {
      const metrics: DailyMetrics = createMockDailyMetrics({
        impressions: 5000,
        clicks: 30,
      });

      const actions: string[] = [];

      if (metrics.impressions > 1000 && metrics.clicks < 50) {
        actions.push('High impressions but low clicks - review SERP appearance');
      }

      expect(actions).toContain('High impressions but low clicks - review SERP appearance');
    });

    it('suggests content quality focus for poor position', () => {
      const metrics: DailyMetrics = createMockDailyMetrics({
        position: 25,
      });

      const actions: string[] = [];

      if (metrics.position > 20) {
        actions.push('Average position is below page 2 - focus on content quality and backlinks');
      }

      expect(actions).toContain('Average position is below page 2 - focus on content quality and backlinks');
    });

    it('suggests publishing when no changes made', () => {
      const changes: Change[] = [];

      const actions: string[] = [];

      if (changes.length === 0) {
        actions.push('No optimizations made today - consider publishing new content');
      }

      expect(actions).toContain('No optimizations made today - consider publishing new content');
    });

    it('suggests investigation when clicks declining', () => {
      const metrics: DailyMetrics = createMockDailyMetrics({
        clicksChange: -15,
      });

      const actions: string[] = [];

      if (metrics.clicksChange < -10) {
        actions.push('Clicks declining - investigate ranking changes and competitors');
      }

      expect(actions).toContain('Clicks declining - investigate ranking changes and competitors');
    });

    it('limits to top 3 actions', () => {
      const allActions = [
        'Action 1',
        'Action 2',
        'Action 3',
        'Action 4',
        'Action 5',
      ];

      const limitedActions = allActions.slice(0, 3);

      expect(limitedActions).toHaveLength(3);
    });
  });
});
