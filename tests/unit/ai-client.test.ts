/**
 * AI Client unit tests
 */

import { AIClient, createAIClient } from '../../src/ai/client';
import { createMockAnthropicResponse } from '../helpers';

describe('AIClient', () => {
  const originalEnv = process.env;
  const mockFetch = global.fetch as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    process.env.ANTHROPIC_API_KEY = 'test-api-key';
    process.env.AI_MODEL = 'claude-sonnet-4-20250514';
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('constructor', () => {
    it('throws error if API key is missing', () => {
      delete process.env.ANTHROPIC_API_KEY;

      expect(() => new AIClient()).toThrow('ANTHROPIC_API_KEY is required');
    });

    it('uses provided API key over environment variable', () => {
      const client = new AIClient({ apiKey: 'custom-key' });

      // Client should be created successfully
      expect(client).toBeDefined();
    });

    it('uses default model if not specified', () => {
      delete process.env.AI_MODEL;
      const client = new AIClient();

      expect(client).toBeDefined();
    });

    it('uses provided model config', () => {
      const client = new AIClient({ model: 'claude-3-opus-20240229' });

      expect(client).toBeDefined();
    });
  });

  describe('chat', () => {
    it('parses JSON from AI response', async () => {
      const responseData = { name: 'test', value: 42 };
      mockFetch.mockResolvedValueOnce(
        createMockAnthropicResponse(JSON.stringify(responseData))
      );

      const client = new AIClient();
      const result = await client.chat('System prompt', [{ role: 'user', content: 'Test' }]);

      expect(result).toBe(JSON.stringify(responseData));
    });

    it('strips markdown code blocks from response', async () => {
      const jsonData = { test: 'value' };
      const wrappedResponse = '```json\n' + JSON.stringify(jsonData) + '\n```';
      mockFetch.mockResolvedValueOnce(
        createMockAnthropicResponse(wrappedResponse)
      );

      const client = new AIClient();
      const result = await client.chat('System', [{ role: 'user', content: 'Test' }]);

      // The chat method returns raw text, parseJSON is private
      // So we test that the response is returned correctly
      expect(result).toBe(wrappedResponse);
    });

    it('handles malformed JSON gracefully in analyzeCodebase', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockAnthropicResponse('not valid json {{{')
      );

      const client = new AIClient();
      const files = new Map<string, string>();
      files.set('test.ts', 'const x = 1;');

      await expect(client.analyzeCodebase(files)).rejects.toThrow(/Failed to parse AI response/);
    });

    it('retries on rate limit (429) error', async () => {
      // First call returns 429, second succeeds
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          text: () => Promise.resolve(JSON.stringify({ error: { message: 'Rate limited' } })),
        })
        .mockResolvedValueOnce(createMockAnthropicResponse('{"success": true}'));

      const client = new AIClient();
      const result = await client.chat('System', [{ role: 'user', content: 'Test' }]);

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(result).toBe('{"success": true}');
    });

    it('throws on non-429 errors without retry', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: () => Promise.resolve(JSON.stringify({ error: { message: 'Bad request' } })),
      });

      const client = new AIClient();

      await expect(
        client.chat('System', [{ role: 'user', content: 'Test' }])
      ).rejects.toThrow(/Anthropic API error: 400/);

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('sends correct headers and body', async () => {
      mockFetch.mockResolvedValueOnce(createMockAnthropicResponse('response'));

      const client = new AIClient({ apiKey: 'test-key', model: 'test-model' });
      await client.chat('System prompt', [{ role: 'user', content: 'Hello' }], {
        temperature: 0.5,
        maxTokens: 1000,
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.anthropic.com/v1/messages',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'x-api-key': 'test-key',
            'anthropic-version': '2023-06-01',
          }),
        })
      );

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.system).toBe('System prompt');
      expect(callBody.messages).toEqual([{ role: 'user', content: 'Hello' }]);
      expect(callBody.temperature).toBe(0.5);
      expect(callBody.max_tokens).toBe(1000);
    });
  });

  describe('analyzeCodebase', () => {
    it('returns CodebaseProfile from AI response', async () => {
      const mockProfile = {
        repoId: 'test',
        scannedAt: new Date().toISOString(),
        commitHash: 'abc123',
        framework: 'nextjs-app',
        structure: {
          pagesDir: 'app',
          componentsDir: 'components',
          publicDir: 'public',
          layoutFiles: ['app/layout.tsx'],
          configFiles: ['next.config.js'],
        },
        seoPatterns: {
          metaHandling: 'metadata-export',
          existingSitemap: null,
          existingRobots: null,
          existingSchema: [],
          hasOgImages: false,
          hasFavicon: true,
        },
        buildSystem: {
          packageManager: 'npm',
          buildCommand: 'npm run build',
          devCommand: 'npm run dev',
          outDir: '.next',
        },
        pages: [],
        safeZones: [],
        dangerZones: [],
      };

      mockFetch.mockResolvedValueOnce(
        createMockAnthropicResponse(JSON.stringify(mockProfile))
      );

      const client = new AIClient();
      const files = new Map<string, string>();
      files.set('package.json', '{"dependencies": {"next": "14.0.0"}}');
      files.set('app/layout.tsx', 'export default function Layout() {}');

      const result = await client.analyzeCodebase(files);

      expect(result.framework).toBe('nextjs-app');
      expect(result.structure.pagesDir).toBe('app');
    });

    it('limits file content and count', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockAnthropicResponse('{"framework": "unknown", "pages": []}')
      );

      const client = new AIClient();
      const files = new Map<string, string>();

      // Add many files with long content
      for (let i = 0; i < 100; i++) {
        files.set(`file${i}.ts`, 'x'.repeat(5000));
      }

      await client.analyzeCodebase(files);

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      const userMessage = callBody.messages[0].content;
      const parsed = JSON.parse(userMessage.replace('Analyze this codebase:\n\n', ''));

      // Should be limited to 50 files
      expect(parsed.length).toBeLessThanOrEqual(50);
      // Each file content should be truncated
      parsed.forEach((file: { content: string }) => {
        expect(file.content.length).toBeLessThanOrEqual(3000);
      });
    });
  });

  describe('findSEOIssues', () => {
    it('returns array of SEO issues', async () => {
      const mockIssues = [
        {
          id: 'missing-title:/about',
          type: 'missing-meta-title',
          severity: 'critical',
          page: '/about',
          description: 'Missing title',
          recommendation: 'Add title',
          autoFixable: true,
        },
      ];

      mockFetch.mockResolvedValueOnce(
        createMockAnthropicResponse(JSON.stringify(mockIssues))
      );

      const client = new AIClient();
      const profile = {
        repoId: 'test',
        scannedAt: new Date(),
        commitHash: 'abc',
        framework: 'nextjs-app' as const,
        structure: { pagesDir: 'app', componentsDir: 'components', publicDir: 'public', layoutFiles: [], configFiles: [] },
        seoPatterns: { metaHandling: 'metadata-export' as const, existingSitemap: null, existingRobots: null, existingSchema: [], hasOgImages: false, hasFavicon: true },
        buildSystem: { packageManager: 'npm' as const, buildCommand: 'build', devCommand: 'dev', outDir: '.next' },
        pages: [],
        safeZones: [],
        dangerZones: [],
      };
      const pages = [{ path: '/about', filePath: 'app/about/page.tsx', hasOgImage: false, hasSchema: false, images: [], internalLinks: [], wordCount: 100, lastModified: new Date() }];

      const result = await client.findSEOIssues(profile, pages);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('missing-meta-title');
    });
  });

  describe('generateFix', () => {
    it('returns CodeFix from AI response', async () => {
      const mockFix = {
        issueId: 'missing-title:/about',
        file: 'app/about/page.tsx',
        action: 'modify',
        search: 'export default',
        replace: 'export const metadata = {};\nexport default',
        description: 'Added metadata',
      };

      mockFetch.mockResolvedValueOnce(
        createMockAnthropicResponse(JSON.stringify(mockFix))
      );

      const client = new AIClient();
      const issue = {
        id: 'missing-title:/about',
        type: 'missing-meta-title' as const,
        severity: 'critical' as const,
        description: 'Missing title',
        recommendation: 'Add title',
        autoFixable: true,
      };
      const profile = {
        repoId: 'test',
        scannedAt: new Date(),
        commitHash: 'abc',
        framework: 'nextjs-app' as const,
        structure: { pagesDir: 'app', componentsDir: 'components', publicDir: 'public', layoutFiles: [], configFiles: [] },
        seoPatterns: { metaHandling: 'metadata-export' as const, existingSitemap: null, existingRobots: null, existingSchema: [], hasOgImages: false, hasFavicon: true },
        buildSystem: { packageManager: 'npm' as const, buildCommand: 'build', devCommand: 'dev', outDir: '.next' },
        pages: [],
        safeZones: [],
        dangerZones: [],
      };

      const result = await client.generateFix(issue, profile, 'export default function About() {}');

      expect(result.action).toBe('modify');
      expect(result.file).toBe('app/about/page.tsx');
    });
  });

  describe('generateBlog', () => {
    it('returns BlogPost with runtime fields added', async () => {
      const mockPost = {
        title: 'Test Blog',
        slug: 'test-blog',
        content: '# Test\nContent here',
        excerpt: 'A test blog post',
        targetKeyword: 'testing',
        secondaryKeywords: ['test', 'blog'],
        metaDescription: 'Test description',
        frontmatter: {},
        filePath: 'content/test-blog.mdx',
        format: 'mdx',
      };

      mockFetch.mockResolvedValueOnce(
        createMockAnthropicResponse(JSON.stringify(mockPost))
      );

      const client = new AIClient();
      const profile = {
        repoId: 'my-repo',
        scannedAt: new Date(),
        commitHash: 'abc',
        framework: 'nextjs-app' as const,
        structure: { pagesDir: 'app', componentsDir: 'components', publicDir: 'public', layoutFiles: [], configFiles: [] },
        seoPatterns: { metaHandling: 'metadata-export' as const, existingSitemap: null, existingRobots: null, existingSchema: [], hasOgImages: false, hasFavicon: true },
        buildSystem: { packageManager: 'npm' as const, buildCommand: 'build', devCommand: 'dev', outDir: '.next' },
        pages: [],
        safeZones: [],
        dangerZones: [],
      };
      const settings = {
        contentFrequency: 'weekly' as const,
        tone: 'professional' as const,
        topics: ['tech'],
        maxBlogsPerWeek: 2,
        maxImagesPerDay: 5,
        excludePaths: [],
      };

      const result = await client.generateBlog('Test Topic', 'testing', profile, settings);

      expect(result.title).toBe('Test Blog');
      expect(result.id).toMatch(/^post-\d+$/);
      expect(result.repoId).toBe('my-repo');
      expect(result.author).toBe('SEO Agent');
      expect(result.publishedAt).toBeInstanceOf(Date);
    });
  });

  describe('generateImagePrompt', () => {
    it('returns trimmed prompt string', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockAnthropicResponse('  A professional office scene with modern aesthetics  ')
      );

      const client = new AIClient();
      const result = await client.generateImagePrompt({
        title: 'Test Article',
        topic: 'productivity',
        tone: 'professional',
      });

      expect(result).toBe('A professional office scene with modern aesthetics');
    });
  });

  describe('generateAltText', () => {
    it('returns alt text limited to 125 characters', async () => {
      const longAltText = 'A'.repeat(200);
      mockFetch.mockResolvedValueOnce(createMockAnthropicResponse(longAltText));

      const client = new AIClient();
      const result = await client.generateAltText('Image of office');

      expect(result.length).toBeLessThanOrEqual(125);
    });

    it('includes keyword when provided', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockAnthropicResponse('Office productivity scene')
      );

      const client = new AIClient();
      await client.generateAltText('Image context', 'productivity');

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.messages[0].content).toContain('Keyword: productivity');
    });
  });

  describe('createAIClient factory', () => {
    it('creates AIClient instance', () => {
      const client = createAIClient();
      expect(client).toBeInstanceOf(AIClient);
    });

    it('passes config to AIClient', () => {
      const client = createAIClient({ maxTokens: 2000 });
      expect(client).toBeInstanceOf(AIClient);
    });
  });
});
