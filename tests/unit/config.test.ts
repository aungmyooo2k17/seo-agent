/**
 * Configuration loader unit tests
 */

import { loadConfig, ConfigError } from '../../src/config/loader';

describe('Config Loader', () => {
  // Store original env vars
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset to clean state before each test
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('loadConfig', () => {
    it('loads repos from environment variables', () => {
      process.env.AI_API_KEY = 'test-key';
      process.env.AI_MODEL = 'claude-sonnet-4-20250514';
      process.env.EMAIL_FROM = 'test@example.com';
      process.env.EMAIL_TO = 'recipient@example.com';
      process.env.REPO_MYSITE_URL = 'git@github.com:user/repo.git';
      process.env.REPO_MYSITE_BRANCH = 'main';
      process.env.REPO_MYSITE_DOMAIN = 'https://example.com';

      const config = loadConfig();

      expect(config.repos).toHaveLength(1);
      expect(config.repos[0].id).toBe('mysite');
      expect(config.repos[0].url).toBe('git@github.com:user/repo.git');
      expect(config.repos[0].branch).toBe('main');
    });

    it('throws ConfigError if AI_API_KEY is missing', () => {
      delete process.env.AI_API_KEY;
      process.env.AI_MODEL = 'claude-sonnet-4-20250514';
      process.env.EMAIL_FROM = 'test@example.com';
      process.env.EMAIL_TO = 'recipient@example.com';

      expect(() => loadConfig()).toThrow(ConfigError);
      expect(() => loadConfig()).toThrow(/AI_API_KEY/);
    });

    it('throws ConfigError if AI_MODEL is missing', () => {
      process.env.AI_API_KEY = 'test-key';
      delete process.env.AI_MODEL;
      process.env.EMAIL_FROM = 'test@example.com';
      process.env.EMAIL_TO = 'recipient@example.com';

      expect(() => loadConfig()).toThrow(ConfigError);
      expect(() => loadConfig()).toThrow(/AI_MODEL/);
    });

    it('throws ConfigError if EMAIL_FROM is missing', () => {
      process.env.AI_API_KEY = 'test-key';
      process.env.AI_MODEL = 'claude-sonnet-4-20250514';
      delete process.env.EMAIL_FROM;
      process.env.EMAIL_TO = 'recipient@example.com';

      expect(() => loadConfig()).toThrow(ConfigError);
      expect(() => loadConfig()).toThrow(/EMAIL_FROM/);
    });

    it('throws ConfigError if EMAIL_TO is missing', () => {
      process.env.AI_API_KEY = 'test-key';
      process.env.AI_MODEL = 'claude-sonnet-4-20250514';
      process.env.EMAIL_FROM = 'test@example.com';
      delete process.env.EMAIL_TO;

      expect(() => loadConfig()).toThrow(ConfigError);
      expect(() => loadConfig()).toThrow(/EMAIL_TO/);
    });

    it('uses default AI model settings if not specified', () => {
      process.env.AI_API_KEY = 'test-key';
      process.env.AI_MODEL = 'claude-sonnet-4-20250514';
      process.env.EMAIL_FROM = 'test@example.com';
      process.env.EMAIL_TO = 'recipient@example.com';
      // Don't set AI_MAX_TOKENS or AI_TEMPERATURE

      const config = loadConfig();

      expect(config.ai.model).toBe('claude-sonnet-4-20250514');
      expect(config.ai.maxTokens).toBe(4096); // default
      expect(config.ai.temperature).toBe(0.7); // default
    });

    it('parses image config correctly', () => {
      process.env.AI_API_KEY = 'test-key';
      process.env.AI_MODEL = 'claude-sonnet-4-20250514';
      process.env.EMAIL_FROM = 'test@example.com';
      process.env.EMAIL_TO = 'recipient@example.com';
      process.env.IMAGE_PROVIDER = 'replicate';
      process.env.IMAGE_MODEL = 'stability-ai/sdxl';
      process.env.IMAGE_MAX_PER_DAY = '15';

      const config = loadConfig();

      expect(config.images.provider).toBe('replicate');
      expect(config.images.model).toBe('stability-ai/sdxl');
      expect(config.images.maxPerDay).toBe(15);
    });

    it('throws ConfigError for invalid image provider', () => {
      process.env.AI_API_KEY = 'test-key';
      process.env.AI_MODEL = 'claude-sonnet-4-20250514';
      process.env.EMAIL_FROM = 'test@example.com';
      process.env.EMAIL_TO = 'recipient@example.com';
      process.env.IMAGE_PROVIDER = 'invalid-provider';

      expect(() => loadConfig()).toThrow(ConfigError);
      expect(() => loadConfig()).toThrow(/IMAGE_PROVIDER/);
    });

    it('parses email config correctly', () => {
      process.env.AI_API_KEY = 'test-key';
      process.env.AI_MODEL = 'claude-sonnet-4-20250514';
      process.env.EMAIL_FROM = 'sender@example.com';
      process.env.EMAIL_TO = 'user1@example.com,user2@example.com';
      process.env.EMAIL_PROVIDER = 'resend';
      process.env.EMAIL_DAILY_REPORT = 'true';
      process.env.EMAIL_WEEKLY_REPORT = 'false';

      const config = loadConfig();

      expect(config.email.provider).toBe('resend');
      expect(config.email.from).toBe('sender@example.com');
      expect(config.email.to).toEqual(['user1@example.com', 'user2@example.com']);
      expect(config.email.dailyReport).toBe(true);
      expect(config.email.weeklyReport).toBe(false);
    });

    it('throws ConfigError for invalid email provider', () => {
      process.env.AI_API_KEY = 'test-key';
      process.env.AI_MODEL = 'claude-sonnet-4-20250514';
      process.env.EMAIL_FROM = 'test@example.com';
      process.env.EMAIL_TO = 'recipient@example.com';
      process.env.EMAIL_PROVIDER = 'invalid-provider';

      expect(() => loadConfig()).toThrow(ConfigError);
      expect(() => loadConfig()).toThrow(/EMAIL_PROVIDER/);
    });

    it('parses repo settings correctly', () => {
      process.env.AI_API_KEY = 'test-key';
      process.env.AI_MODEL = 'claude-sonnet-4-20250514';
      process.env.EMAIL_FROM = 'test@example.com';
      process.env.EMAIL_TO = 'recipient@example.com';
      process.env.REPO_BLOG_URL = 'git@github.com:user/blog.git';
      process.env.REPO_BLOG_CONTENT_FREQUENCY = 'daily';
      process.env.REPO_BLOG_TONE = 'casual';
      process.env.REPO_BLOG_TOPICS = 'tech,programming,ai';
      process.env.REPO_BLOG_MAX_BLOGS = '5';
      process.env.REPO_BLOG_MAX_IMAGES = '10';
      process.env.REPO_BLOG_EXCLUDE = 'node_modules,dist';

      const config = loadConfig();
      const repo = config.repos.find(r => r.id === 'blog');

      expect(repo).toBeDefined();
      expect(repo!.settings.contentFrequency).toBe('daily');
      expect(repo!.settings.tone).toBe('casual');
      expect(repo!.settings.topics).toEqual(['tech', 'programming', 'ai']);
      expect(repo!.settings.maxBlogsPerWeek).toBe(5);
      expect(repo!.settings.maxImagesPerDay).toBe(10);
      expect(repo!.settings.excludePaths).toEqual(['node_modules', 'dist']);
    });

    it('parses Search Console config when provided', () => {
      process.env.AI_API_KEY = 'test-key';
      process.env.AI_MODEL = 'claude-sonnet-4-20250514';
      process.env.EMAIL_FROM = 'test@example.com';
      process.env.EMAIL_TO = 'recipient@example.com';
      process.env.REPO_SITE_URL = 'git@github.com:user/site.git';
      process.env.REPO_SITE_SEARCH_CONSOLE = 'sc-domain:example.com';

      const config = loadConfig();
      const repo = config.repos.find(r => r.id === 'site');

      expect(repo).toBeDefined();
      expect(repo!.searchConsole).toBeDefined();
      expect(repo!.searchConsole!.propertyUrl).toBe('sc-domain:example.com');
    });

    it('handles repos without Search Console config', () => {
      process.env.AI_API_KEY = 'test-key';
      process.env.AI_MODEL = 'claude-sonnet-4-20250514';
      process.env.EMAIL_FROM = 'test@example.com';
      process.env.EMAIL_TO = 'recipient@example.com';
      process.env.REPO_NOSEARCH_URL = 'git@github.com:user/nosearch.git';

      const config = loadConfig();
      const repo = config.repos.find(r => r.id === 'nosearch');

      expect(repo).toBeDefined();
      expect(repo!.searchConsole).toBeUndefined();
    });
  });

  describe('ConfigError', () => {
    it('includes missing variables in error', () => {
      const error = new ConfigError('Missing vars', ['VAR1', 'VAR2']);

      expect(error.name).toBe('ConfigError');
      expect(error.missingVars).toEqual(['VAR1', 'VAR2']);
      expect(error.message).toBe('Missing vars');
    });
  });
});
