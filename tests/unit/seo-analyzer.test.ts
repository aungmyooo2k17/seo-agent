/**
 * SEO Analyzer unit tests
 */

import { SEOAnalyzer, analyzeForSEO } from '../../src/scanner/seo-analyzer';
import {
  createMockAIClient,
  createMockCodebaseProfile,
  createMockPageInfo,
  createMockSEOIssue,
} from '../helpers';
import type { PageInfo, CodebaseProfile, SEOIssue } from '../../src/types';

describe('SEOAnalyzer', () => {
  const mockAIClient = createMockAIClient();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('checkMissingMeta', () => {
    it('detects missing title', async () => {
      const analyzer = new SEOAnalyzer(mockAIClient, { enableAI: false });
      const profile = createMockCodebaseProfile({
        pages: [
          createMockPageInfo({
            path: '/about',
            filePath: 'app/about/page.tsx',
            title: undefined,
            description: 'Has description',
          }),
        ],
      });

      const issues = await analyzer.analyze(profile);

      const titleIssue = issues.find(i => i.type === 'missing-meta-title');
      expect(titleIssue).toBeDefined();
      expect(titleIssue!.page).toBe('/about');
      expect(titleIssue!.severity).toBe('critical');
      expect(titleIssue!.autoFixable).toBe(true);
    });

    it('detects missing description', async () => {
      const analyzer = new SEOAnalyzer(mockAIClient, { enableAI: false });
      const profile = createMockCodebaseProfile({
        pages: [
          createMockPageInfo({
            path: '/contact',
            filePath: 'app/contact/page.tsx',
            title: 'Contact Us',
            description: undefined,
          }),
        ],
      });

      const issues = await analyzer.analyze(profile);

      const descIssue = issues.find(i => i.type === 'missing-meta-description');
      expect(descIssue).toBeDefined();
      expect(descIssue!.page).toBe('/contact');
      expect(descIssue!.severity).toBe('critical');
    });
  });

  describe('checkMetaLength', () => {
    it('detects title too long (>60 chars)', async () => {
      const analyzer = new SEOAnalyzer(mockAIClient, { enableAI: false, maxTitleLength: 60 });
      const longTitle = 'A'.repeat(65);
      const profile = createMockCodebaseProfile({
        pages: [
          createMockPageInfo({
            path: '/long-title',
            title: longTitle,
          }),
        ],
      });

      const issues = await analyzer.analyze(profile);

      const titleIssue = issues.find(i => i.type === 'title-too-long');
      expect(titleIssue).toBeDefined();
      expect(titleIssue!.description).toContain('65 characters');
      expect(titleIssue!.severity).toBe('warning');
    });

    it('detects description too long (>155 chars)', async () => {
      const analyzer = new SEOAnalyzer(mockAIClient, { enableAI: false, maxDescriptionLength: 155 });
      const longDescription = 'B'.repeat(160);
      const profile = createMockCodebaseProfile({
        pages: [
          createMockPageInfo({
            path: '/long-desc',
            title: 'Normal Title',
            description: longDescription,
          }),
        ],
      });

      const issues = await analyzer.analyze(profile);

      const descIssue = issues.find(i => i.type === 'description-too-long');
      expect(descIssue).toBeDefined();
      expect(descIssue!.description).toContain('160 characters');
      expect(descIssue!.severity).toBe('info');
    });

    it('does not flag titles within limit', async () => {
      const analyzer = new SEOAnalyzer(mockAIClient, { enableAI: false });
      const profile = createMockCodebaseProfile({
        pages: [
          createMockPageInfo({
            path: '/good-title',
            title: 'A Short Good Title',
          }),
        ],
      });

      const issues = await analyzer.analyze(profile);

      expect(issues.find(i => i.type === 'title-too-long')).toBeUndefined();
    });
  });

  describe('checkDuplicateMeta', () => {
    it('detects duplicate titles', async () => {
      const analyzer = new SEOAnalyzer(mockAIClient, { enableAI: false });
      const profile = createMockCodebaseProfile({
        pages: [
          createMockPageInfo({ path: '/page1', title: 'Same Title' }),
          createMockPageInfo({ path: '/page2', title: 'Same Title' }),
          createMockPageInfo({ path: '/page3', title: 'Different Title' }),
        ],
      });

      const issues = await analyzer.analyze(profile);

      const dupTitleIssues = issues.filter(i => i.type === 'duplicate-title');
      expect(dupTitleIssues.length).toBe(2); // Both pages with "Same Title"
      expect(dupTitleIssues.every(i => i.description.includes('2 pages'))).toBe(true);
    });

    it('detects duplicate descriptions', async () => {
      const analyzer = new SEOAnalyzer(mockAIClient, { enableAI: false });
      const profile = createMockCodebaseProfile({
        pages: [
          createMockPageInfo({ path: '/page1', description: 'Same description' }),
          createMockPageInfo({ path: '/page2', description: 'Same description' }),
        ],
      });

      const issues = await analyzer.analyze(profile);

      const dupDescIssues = issues.filter(i => i.type === 'duplicate-description');
      expect(dupDescIssues.length).toBe(2);
    });
  });

  describe('checkMissingOGImages', () => {
    it('detects missing OG image', async () => {
      const analyzer = new SEOAnalyzer(mockAIClient, { enableAI: false });
      const profile = createMockCodebaseProfile({
        pages: [
          createMockPageInfo({
            path: '/no-og',
            hasOgImage: false,
          }),
        ],
      });

      const issues = await analyzer.analyze(profile);

      const ogIssue = issues.find(i => i.type === 'missing-og-image');
      expect(ogIssue).toBeDefined();
      expect(ogIssue!.page).toBe('/no-og');
      expect(ogIssue!.autoFixable).toBe(false);
    });

    it('does not flag pages with OG images', async () => {
      const analyzer = new SEOAnalyzer(mockAIClient, { enableAI: false });
      const profile = createMockCodebaseProfile({
        pages: [
          createMockPageInfo({
            path: '/has-og',
            hasOgImage: true,
          }),
        ],
      });

      const issues = await analyzer.analyze(profile);

      expect(issues.find(i => i.type === 'missing-og-image')).toBeUndefined();
    });
  });

  describe('checkMissingSitemap', () => {
    it('detects missing sitemap', async () => {
      const analyzer = new SEOAnalyzer(mockAIClient, { enableAI: false });
      const profile = createMockCodebaseProfile({
        seoPatterns: {
          metaHandling: 'metadata-export',
          existingSitemap: null,
          existingRobots: 'public/robots.txt',
          existingSchema: [],
          hasOgImages: false,
          hasFavicon: true,
        },
      });

      const issues = await analyzer.analyze(profile);

      const sitemapIssue = issues.find(i => i.type === 'missing-sitemap');
      expect(sitemapIssue).toBeDefined();
      expect(sitemapIssue!.severity).toBe('critical');
      expect(sitemapIssue!.autoFixable).toBe(true);
    });

    it('does not flag when sitemap exists', async () => {
      const analyzer = new SEOAnalyzer(mockAIClient, { enableAI: false });
      const profile = createMockCodebaseProfile({
        seoPatterns: {
          metaHandling: 'metadata-export',
          existingSitemap: 'public/sitemap.xml',
          existingRobots: null,
          existingSchema: [],
          hasOgImages: false,
          hasFavicon: true,
        },
      });

      const issues = await analyzer.analyze(profile);

      expect(issues.find(i => i.type === 'missing-sitemap')).toBeUndefined();
    });
  });

  describe('checkMissingRobots', () => {
    it('detects missing robots.txt', async () => {
      const analyzer = new SEOAnalyzer(mockAIClient, { enableAI: false });
      const profile = createMockCodebaseProfile({
        seoPatterns: {
          metaHandling: 'metadata-export',
          existingSitemap: 'public/sitemap.xml',
          existingRobots: null,
          existingSchema: [],
          hasOgImages: false,
          hasFavicon: true,
        },
      });

      const issues = await analyzer.analyze(profile);

      const robotsIssue = issues.find(i => i.type === 'missing-robots');
      expect(robotsIssue).toBeDefined();
      expect(robotsIssue!.severity).toBe('warning');
    });
  });

  describe('checkMissingSchema', () => {
    it('detects missing schema on homepage', async () => {
      const analyzer = new SEOAnalyzer(mockAIClient, { enableAI: false });
      const profile = createMockCodebaseProfile({
        pages: [
          createMockPageInfo({
            path: '/',
            hasSchema: false,
          }),
        ],
      });

      const issues = await analyzer.analyze(profile);

      const schemaIssue = issues.find(i => i.type === 'missing-schema' && i.id === 'missing-schema:global');
      expect(schemaIssue).toBeDefined();
    });

    it('detects missing Article schema on blog posts', async () => {
      const analyzer = new SEOAnalyzer(mockAIClient, { enableAI: false });
      const profile = createMockCodebaseProfile({
        pages: [
          createMockPageInfo({
            path: '/',
            hasSchema: true,
          }),
          createMockPageInfo({
            path: '/blog/my-post',
            hasSchema: false,
          }),
        ],
      });

      const issues = await analyzer.analyze(profile);

      const blogSchemaIssue = issues.find(i => i.type === 'missing-schema' && i.page === '/blog/my-post');
      expect(blogSchemaIssue).toBeDefined();
      expect(blogSchemaIssue!.description).toContain('Article schema');
    });
  });

  describe('checkMissingAltText', () => {
    it('detects missing alt text', async () => {
      const analyzer = new SEOAnalyzer(mockAIClient, { enableAI: false });
      const profile = createMockCodebaseProfile({
        pages: [
          createMockPageInfo({
            path: '/gallery',
            images: [
              { src: '/images/photo1.jpg', alt: null, isLocal: true },
              { src: '/images/photo2.jpg', alt: 'Has alt text', isLocal: true },
            ],
          }),
        ],
      });

      const issues = await analyzer.analyze(profile);

      const altIssues = issues.filter(i => i.type === 'missing-alt-text');
      expect(altIssues.length).toBe(1);
      expect(altIssues[0].description).toContain('photo1.jpg');
    });
  });

  describe('checkThinContent', () => {
    it('detects thin content (<300 words)', async () => {
      const analyzer = new SEOAnalyzer(mockAIClient, { enableAI: false, minWordCount: 300 });
      const profile = createMockCodebaseProfile({
        pages: [
          createMockPageInfo({
            path: '/thin-page',
            wordCount: 150,
          }),
        ],
      });

      const issues = await analyzer.analyze(profile);

      const thinIssue = issues.find(i => i.type === 'thin-content');
      expect(thinIssue).toBeDefined();
      expect(thinIssue!.description).toContain('150 words');
    });

    it('skips non-content pages like /login', async () => {
      const analyzer = new SEOAnalyzer(mockAIClient, { enableAI: false, minWordCount: 300 });
      const profile = createMockCodebaseProfile({
        pages: [
          createMockPageInfo({
            path: '/login',
            wordCount: 50,
          }),
          createMockPageInfo({
            path: '/api/users',
            wordCount: 10,
          }),
        ],
      });

      const issues = await analyzer.analyze(profile);

      const thinIssues = issues.filter(i => i.type === 'thin-content');
      expect(thinIssues.length).toBe(0);
    });
  });

  describe('checkOrphanPages', () => {
    it('detects orphan pages with no internal links pointing to them', async () => {
      const analyzer = new SEOAnalyzer(mockAIClient, { enableAI: false });
      const profile = createMockCodebaseProfile({
        pages: [
          createMockPageInfo({
            path: '/',
            internalLinks: ['/about'], // Only links to /about
          }),
          createMockPageInfo({
            path: '/about',
            internalLinks: ['/'],
          }),
          createMockPageInfo({
            path: '/orphan',
            internalLinks: ['/'],
          }),
        ],
      });

      const issues = await analyzer.analyze(profile);

      const orphanIssue = issues.find(i => i.type === 'orphan-page');
      expect(orphanIssue).toBeDefined();
      expect(orphanIssue!.page).toBe('/orphan');
    });

    it('does not flag homepage as orphan', async () => {
      const analyzer = new SEOAnalyzer(mockAIClient, { enableAI: false });
      const profile = createMockCodebaseProfile({
        pages: [
          createMockPageInfo({
            path: '/',
            internalLinks: [],
          }),
        ],
      });

      const issues = await analyzer.analyze(profile);

      expect(issues.find(i => i.type === 'orphan-page' && i.page === '/')).toBeUndefined();
    });
  });

  describe('deduplication', () => {
    it('deduplicates issues by ID', async () => {
      const analyzer = new SEOAnalyzer(mockAIClient, { enableAI: false });
      const profile = createMockCodebaseProfile({
        pages: [
          createMockPageInfo({
            path: '/test',
            title: undefined, // Will generate missing-meta-title:/test
          }),
        ],
      });

      // The analyzer generates the issue once from rules
      const issues = await analyzer.analyze(profile);

      const titleIssues = issues.filter(i => i.id === 'missing-meta-title:/test');
      expect(titleIssues.length).toBe(1);
    });
  });

  describe('AI analysis', () => {
    it('includes AI issues when enableAI is true', async () => {
      const aiIssue = createMockSEOIssue({
        id: 'keyword-missing:/product',
        type: 'keyword-missing',
        page: '/product',
        description: 'Primary keyword not in title',
      });

      mockAIClient.findSEOIssues.mockResolvedValueOnce([aiIssue]);

      const analyzer = new SEOAnalyzer(mockAIClient, { enableAI: true });
      const profile = createMockCodebaseProfile();

      const issues = await analyzer.analyze(profile);

      // AI should be called
      expect(mockAIClient.findSEOIssues).toHaveBeenCalled();

      // AI-only issue types should be included
      const keywordIssue = issues.find(i => i.type === 'keyword-missing');
      expect(keywordIssue).toBeDefined();
    });

    it('filters out rule-based issue types from AI results', async () => {
      // AI returns an issue type that's already covered by rules
      const duplicateTypeIssue = createMockSEOIssue({
        id: 'missing-meta-title:/ai-detected',
        type: 'missing-meta-title',
        page: '/ai-detected',
      });

      mockAIClient.findSEOIssues.mockResolvedValueOnce([duplicateTypeIssue]);

      const analyzer = new SEOAnalyzer(mockAIClient, { enableAI: true });
      const profile = createMockCodebaseProfile({ pages: [] }); // No rule-based issues

      const issues = await analyzer.analyze(profile);

      // AI issues with rule-based types should be filtered
      expect(issues.find(i => i.id === 'missing-meta-title:/ai-detected')).toBeUndefined();
    });

    it('continues with rule-based results if AI fails', async () => {
      mockAIClient.findSEOIssues.mockRejectedValueOnce(new Error('AI API error'));

      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const analyzer = new SEOAnalyzer(mockAIClient, { enableAI: true });
      const profile = createMockCodebaseProfile({
        pages: [createMockPageInfo({ title: undefined })],
      });

      const issues = await analyzer.analyze(profile);

      // Should still have rule-based issues
      expect(issues.find(i => i.type === 'missing-meta-title')).toBeDefined();
      // console.warn is called with multiple args, check first arg
      expect(warnSpy).toHaveBeenCalled();
      const firstCallFirstArg = warnSpy.mock.calls[0][0];
      expect(firstCallFirstArg).toContain('AI analysis failed');

      warnSpy.mockRestore();
    });
  });

  describe('analyzeForSEO convenience function', () => {
    it('creates analyzer and runs analysis', async () => {
      const profile = createMockCodebaseProfile({
        pages: [createMockPageInfo({ title: undefined })],
      });

      const issues = await analyzeForSEO(profile, mockAIClient, { enableAI: false });

      expect(issues.find(i => i.type === 'missing-meta-title')).toBeDefined();
    });
  });
});
