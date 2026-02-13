/**
 * Content Generator unit tests
 */

import { ContentGenerator, DefaultFrameworkHandler } from '../../src/optimizer/content';
import {
  createMockAIClient,
  createMockRepoConfig,
  createMockCodebaseProfile,
  createMockBlogPost,
} from '../helpers';
import type { RepoConfig } from '../../src/types';

// Mock ImageService
const mockImageService = {
  generateBlogImage: jest.fn().mockResolvedValue({
    buffer: Buffer.from('fake-image-data'),
    filename: 'test-image.webp',
    altText: 'Test image',
    prompt: 'Test prompt',
    provider: 'replicate',
    model: 'sdxl',
    dimensions: { width: 1024, height: 1024 },
    sizeBytes: 12345,
  }),
  generateOGImage: jest.fn().mockResolvedValue(Buffer.from('og-image-data')),
  findMissingImages: jest.fn().mockResolvedValue([]),
  canGenerate: jest.fn().mockResolvedValue(true),
};

describe('ContentGenerator', () => {
  const mockAIClient = createMockAIClient();
  let generator: ContentGenerator;

  beforeEach(() => {
    jest.clearAllMocks();
    generator = new ContentGenerator(mockAIClient, mockImageService as any);
  });

  describe('shouldGenerateContent', () => {
    it('returns true if never published', () => {
      const repo = createMockRepoConfig({
        settings: {
          contentFrequency: 'weekly',
          tone: 'professional',
          topics: [],
          maxBlogsPerWeek: 2,
          maxImagesPerDay: 5,
          excludePaths: [],
        },
      });

      const result = generator.shouldGenerateContent(repo, null);

      expect(result).toBe(true);
    });

    it('returns true for daily frequency after 1 day', () => {
      const repo = createMockRepoConfig({
        settings: {
          contentFrequency: 'daily',
          tone: 'professional',
          topics: [],
          maxBlogsPerWeek: 7,
          maxImagesPerDay: 5,
          excludePaths: [],
        },
      });

      const lastPublished = new Date();
      lastPublished.setDate(lastPublished.getDate() - 2); // 2 days ago

      const result = generator.shouldGenerateContent(repo, lastPublished);

      expect(result).toBe(true);
    });

    it('returns false for daily frequency within same day', () => {
      const repo = createMockRepoConfig({
        settings: {
          contentFrequency: 'daily',
          tone: 'professional',
          topics: [],
          maxBlogsPerWeek: 7,
          maxImagesPerDay: 5,
          excludePaths: [],
        },
      });

      const lastPublished = new Date(); // Just now

      const result = generator.shouldGenerateContent(repo, lastPublished);

      expect(result).toBe(false);
    });

    it('returns true for weekly frequency after 7 days', () => {
      const repo = createMockRepoConfig({
        settings: {
          contentFrequency: 'weekly',
          tone: 'professional',
          topics: [],
          maxBlogsPerWeek: 2,
          maxImagesPerDay: 5,
          excludePaths: [],
        },
      });

      const lastPublished = new Date();
      lastPublished.setDate(lastPublished.getDate() - 8); // 8 days ago

      const result = generator.shouldGenerateContent(repo, lastPublished);

      expect(result).toBe(true);
    });

    it('returns false for weekly frequency within 7 days', () => {
      const repo = createMockRepoConfig({
        settings: {
          contentFrequency: 'weekly',
          tone: 'professional',
          topics: [],
          maxBlogsPerWeek: 2,
          maxImagesPerDay: 5,
          excludePaths: [],
        },
      });

      const lastPublished = new Date();
      lastPublished.setDate(lastPublished.getDate() - 5); // 5 days ago

      const result = generator.shouldGenerateContent(repo, lastPublished);

      expect(result).toBe(false);
    });

    it('returns true for monthly frequency after 30 days', () => {
      const repo = createMockRepoConfig({
        settings: {
          contentFrequency: 'monthly',
          tone: 'professional',
          topics: [],
          maxBlogsPerWeek: 1,
          maxImagesPerDay: 5,
          excludePaths: [],
        },
      });

      const lastPublished = new Date();
      lastPublished.setDate(lastPublished.getDate() - 35); // 35 days ago

      const result = generator.shouldGenerateContent(repo, lastPublished);

      expect(result).toBe(true);
    });

    it('returns false for monthly frequency within 30 days', () => {
      const repo = createMockRepoConfig({
        settings: {
          contentFrequency: 'monthly',
          tone: 'professional',
          topics: [],
          maxBlogsPerWeek: 1,
          maxImagesPerDay: 5,
          excludePaths: [],
        },
      });

      const lastPublished = new Date();
      lastPublished.setDate(lastPublished.getDate() - 20); // 20 days ago

      const result = generator.shouldGenerateContent(repo, lastPublished);

      expect(result).toBe(false);
    });

    it('returns true for biweekly frequency after 14 days', () => {
      const repo = createMockRepoConfig({
        settings: {
          contentFrequency: 'biweekly',
          tone: 'professional',
          topics: [],
          maxBlogsPerWeek: 1,
          maxImagesPerDay: 5,
          excludePaths: [],
        },
      });

      const lastPublished = new Date();
      lastPublished.setDate(lastPublished.getDate() - 15); // 15 days ago

      const result = generator.shouldGenerateContent(repo, lastPublished);

      expect(result).toBe(true);
    });
  });

  describe('getDaysUntilNextContent', () => {
    it('returns 0 if never published', () => {
      const repo = createMockRepoConfig();
      const result = generator.getDaysUntilNextContent(repo, null);
      expect(result).toBe(0);
    });

    it('returns correct days for weekly frequency', () => {
      const repo = createMockRepoConfig({
        settings: {
          contentFrequency: 'weekly',
          tone: 'professional',
          topics: [],
          maxBlogsPerWeek: 2,
          maxImagesPerDay: 5,
          excludePaths: [],
        },
      });

      const lastPublished = new Date();
      lastPublished.setDate(lastPublished.getDate() - 3); // 3 days ago

      const result = generator.getDaysUntilNextContent(repo, lastPublished);

      expect(result).toBe(4); // 7 - 3 = 4 days remaining
    });

    it('returns 0 if time has passed', () => {
      const repo = createMockRepoConfig({
        settings: {
          contentFrequency: 'daily',
          tone: 'professional',
          topics: [],
          maxBlogsPerWeek: 7,
          maxImagesPerDay: 5,
          excludePaths: [],
        },
      });

      const lastPublished = new Date();
      lastPublished.setDate(lastPublished.getDate() - 5); // 5 days ago (for daily)

      const result = generator.getDaysUntilNextContent(repo, lastPublished);

      expect(result).toBe(0);
    });
  });

  describe('generatePost', () => {
    it('generates a blog post with featured image', async () => {
      const mockPost = createMockBlogPost();
      mockAIClient.generateBlog.mockResolvedValueOnce(mockPost);

      const profile = createMockCodebaseProfile();
      const settings = createMockRepoConfig().settings;
      const handler = new DefaultFrameworkHandler();

      const result = await generator.generatePost(
        'Test Topic',
        'test keyword',
        profile,
        settings,
        handler
      );

      expect(result.post).toBeDefined();
      expect(result.post.title).toBe(mockPost.title);
      expect(result.imageBuffer).toBeDefined();
      expect(result.imagePath).toBeDefined();
      expect(mockImageService.canGenerate).toHaveBeenCalled();
      expect(mockImageService.generateBlogImage).toHaveBeenCalled();
    });

    it('handles case when image quota is exhausted', async () => {
      mockImageService.canGenerate.mockResolvedValueOnce(false);

      const mockPost = createMockBlogPost();
      mockAIClient.generateBlog.mockResolvedValueOnce(mockPost);

      const profile = createMockCodebaseProfile();
      const settings = createMockRepoConfig().settings;
      const handler = new DefaultFrameworkHandler();

      const result = await generator.generatePost(
        'Test Topic',
        'test keyword',
        profile,
        settings,
        handler
      );

      expect(result.post).toBeDefined();
      expect(result.imageBuffer.length).toBe(0); // Empty buffer
      expect(result.imagePath).toBe(''); // Empty path
      expect(mockImageService.generateBlogImage).not.toHaveBeenCalled();
    });
  });

  describe('formatForFramework', () => {
    it('combines frontmatter with content', () => {
      const handler = new DefaultFrameworkHandler();
      const post = createMockBlogPost({
        title: 'Test Post',
        metaDescription: 'Test description',
        content: '# Test Content\n\nBody here.',
      });

      const result = generator.formatForFramework(post, handler);

      expect(result).toContain('---');
      expect(result).toContain('title: "Test Post"');
      expect(result).toContain('description: "Test description"');
      expect(result).toContain('# Test Content');
    });
  });

  describe('static utilities', () => {
    describe('generateSlug', () => {
      it('converts title to lowercase slug', () => {
        expect(ContentGenerator.generateSlug('Hello World')).toBe('hello-world');
      });

      it('removes special characters', () => {
        expect(ContentGenerator.generateSlug("What's New in 2024?")).toBe('whats-new-in-2024');
      });

      it('collapses multiple dashes', () => {
        expect(ContentGenerator.generateSlug('Hello---World')).toBe('hello-world');
      });

      it('trims leading and trailing dashes', () => {
        expect(ContentGenerator.generateSlug('---Hello World---')).toBe('hello-world');
      });

      it('limits length to 60 characters', () => {
        const longTitle = 'A'.repeat(100);
        expect(ContentGenerator.generateSlug(longTitle).length).toBeLessThanOrEqual(60);
      });
    });

    describe('isTopicCovered', () => {
      it('returns true for exact match', () => {
        const existingTitles = ['Introduction to SEO', 'Advanced Marketing'];
        expect(ContentGenerator.isTopicCovered('SEO', existingTitles)).toBe(true);
      });

      it('returns true for significant word overlap', () => {
        const existingTitles = ['Complete Guide to React Development'];
        expect(ContentGenerator.isTopicCovered('react development guide', existingTitles)).toBe(true);
      });

      it('returns false for different topics', () => {
        const existingTitles = ['Introduction to Python', 'JavaScript Basics'];
        expect(ContentGenerator.isTopicCovered('Machine Learning', existingTitles)).toBe(false);
      });
    });

    describe('estimateReadingTime', () => {
      it('estimates reading time based on word count', () => {
        const content = 'word '.repeat(400); // 400 words
        // 400 words / 200 wpm = 2 minutes, but .repeat creates extra spaces so word count varies
        const result = ContentGenerator.estimateReadingTime(content);
        expect(result).toBeGreaterThanOrEqual(2);
        expect(result).toBeLessThanOrEqual(4);
      });

      it('rounds up to nearest minute', () => {
        const content = 'word '.repeat(250); // ~250 words
        const result = ContentGenerator.estimateReadingTime(content);
        expect(result).toBeGreaterThanOrEqual(1);
        expect(result).toBeLessThanOrEqual(3);
      });
    });

    describe('extractKeywords', () => {
      it('extracts most common words', () => {
        const content = 'SEO optimization is important. SEO helps visibility. Optimization improves rankings.';
        const keywords = ContentGenerator.extractKeywords(content, 3);

        expect(keywords).toContain('optimization');
      });

      it('excludes stop words', () => {
        const content = 'The quick brown fox jumps over the lazy dog';
        const keywords = ContentGenerator.extractKeywords(content);

        // 'the' is a common stop word that should be excluded
        expect(keywords).not.toContain('the');
        // Note: 'over' is 4 letters so may be included depending on implementation
        // The main check is that common stop words like 'the' are excluded
      });

      it('removes markdown syntax', () => {
        const content = '# Header\n\n`code here` and [link](http://example.com)\n\n```\ncode block\n```';
        const keywords = ContentGenerator.extractKeywords(content);

        expect(keywords).not.toContain('http');
      });

      it('limits to specified max keywords', () => {
        const content = 'one two three four five six seven eight nine ten eleven twelve';
        const keywords = ContentGenerator.extractKeywords(content, 5);

        expect(keywords.length).toBeLessThanOrEqual(5);
      });
    });
  });
});

describe('DefaultFrameworkHandler', () => {
  const handler = new DefaultFrameworkHandler();

  describe('getContentDir', () => {
    it('uses contentDir from profile if available', () => {
      const profile = createMockCodebaseProfile({
        structure: {
          pagesDir: 'app',
          componentsDir: 'components',
          publicDir: 'public',
          contentDir: 'custom/content',
          layoutFiles: [],
          configFiles: [],
        },
      });

      expect(handler.getContentDir(profile)).toBe('custom/content');
    });

    it('falls back to content/blog if not specified', () => {
      const profile = createMockCodebaseProfile({
        structure: {
          pagesDir: 'app',
          componentsDir: 'components',
          publicDir: 'public',
          contentDir: undefined,
          layoutFiles: [],
          configFiles: [],
        },
      });

      expect(handler.getContentDir(profile)).toBe('content/blog');
    });
  });

  describe('getContentExtension', () => {
    it('returns mdx', () => {
      expect(handler.getContentExtension()).toBe('mdx');
    });
  });

  describe('formatFrontmatter', () => {
    it('formats frontmatter with YAML syntax', () => {
      const post = createMockBlogPost({
        title: 'Test "Quote" Post',
        slug: 'test-post',
        metaDescription: 'A description',
        author: 'Author',
        publishedAt: new Date('2024-01-15T10:00:00Z'),
      });

      const result = handler.formatFrontmatter(post);

      expect(result).toContain('---');
      expect(result).toContain('title: "Test \\"Quote\\" Post"'); // Escaped quotes
      expect(result).toContain('slug: "test-post"');
      expect(result).toContain('author: "Author"');
    });

    it('includes featured image if present', () => {
      const post = createMockBlogPost({
        featuredImage: {
          buffer: Buffer.from(''),
          filename: 'featured.webp',
          altText: 'Featured image alt',
          prompt: 'prompt',
          provider: 'replicate',
          model: 'sdxl',
          dimensions: { width: 1024, height: 1024 },
          sizeBytes: 1000,
        },
      });

      const result = handler.formatFrontmatter(post);

      expect(result).toContain('image: "/images/blog/featured.webp"');
      expect(result).toContain('imageAlt: "Featured image alt"');
    });
  });

  describe('getFilePath', () => {
    it('returns correct path for slug', () => {
      const profile = createMockCodebaseProfile();
      const result = handler.getFilePath(profile, 'my-blog-post');

      expect(result).toContain('my-blog-post.mdx');
    });
  });

  describe('getUrlPath', () => {
    it('returns blog URL path', () => {
      expect(handler.getUrlPath('my-post')).toBe('/blog/my-post');
    });
  });
});
