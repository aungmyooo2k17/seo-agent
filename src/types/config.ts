/**
 * Configuration types for the SEO Optimizer
 */

/**
 * Main configuration object containing all settings
 */
export interface Config {
  repos: RepoConfig[];
  ai: AIConfig;
  images: ImageConfig;
  email: EmailConfig;
}

/**
 * Configuration for a single repository to be optimized
 */
export interface RepoConfig {
  /** Unique identifier for the repository */
  id: string;
  /** Git URL (e.g., git@github.com:user/repo.git) */
  url: string;
  /** Branch to work on (e.g., main) */
  branch: string;
  /** Production domain (e.g., https://example.com) */
  domain: string;
  /** Repository-specific settings */
  settings: RepoSettings;
  /** Optional Google Search Console configuration */
  searchConsole?: SearchConsoleConfig;
}

/**
 * Repository-specific optimization settings
 */
export interface RepoSettings {
  /** How often to generate new content */
  contentFrequency: 'daily' | 'weekly' | 'biweekly' | 'monthly';
  /** Writing tone for generated content */
  tone: 'professional' | 'casual' | 'technical' | 'friendly';
  /** Topics to focus on for content generation */
  topics: string[];
  /** Maximum number of blog posts per week */
  maxBlogsPerWeek: number;
  /** Maximum number of images to generate per day */
  maxImagesPerDay: number;
  /** Paths to exclude from scanning/modification */
  excludePaths: string[];
  /** Custom instructions for the AI */
  customInstructions?: string;
}

/**
 * Google Search Console configuration
 */
export interface SearchConsoleConfig {
  /** The property URL as registered in Search Console */
  propertyUrl: string;
}

/**
 * AI service configuration
 */
export interface AIConfig {
  /** Model identifier (e.g., claude-3-opus) */
  model: string;
  /** Maximum tokens for AI responses */
  maxTokens: number;
  /** Temperature for AI responses (0-1) */
  temperature: number;
}

/**
 * Image generation service configuration
 */
export interface ImageConfig {
  /** Image generation provider */
  provider: 'replicate' | 'openai';
  /** Model to use for generation */
  model: string;
  /** Maximum images to generate per day across all repos */
  maxPerDay: number;
}

/**
 * Email notification configuration
 */
export interface EmailConfig {
  /** Email service provider */
  provider: 'resend' | 'smtp';
  /** Sender email address */
  from: string;
  /** Recipient email addresses */
  to: string[];
  /** Whether to send daily reports */
  dailyReport: boolean;
  /** Whether to send weekly reports */
  weeklyReport: boolean;
}
