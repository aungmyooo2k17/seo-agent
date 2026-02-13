/**
 * Configuration loader with environment variable validation
 */

import { config as dotenvConfig } from 'dotenv';
import type { Config, RepoConfig, RepoSettings, AIConfig, ImageConfig, EmailConfig } from '../types';

/**
 * Environment variable validation error
 */
export class ConfigError extends Error {
  constructor(
    message: string,
    public readonly missingVars: string[] = []
  ) {
    super(message);
    this.name = 'ConfigError';
  }
}

/**
 * Required environment variables by category
 */
const REQUIRED_VARS = {
  ai: ['AI_API_KEY', 'AI_MODEL'],
  email: ['EMAIL_FROM', 'EMAIL_TO'],
} as const;

/**
 * Optional environment variables with defaults
 */
const DEFAULTS = {
  AI_MAX_TOKENS: '4096',
  AI_TEMPERATURE: '0.7',
  IMAGE_PROVIDER: 'replicate',
  IMAGE_MODEL: 'stability-ai/sdxl',
  IMAGE_MAX_PER_DAY: '10',
  EMAIL_PROVIDER: 'resend',
  EMAIL_DAILY_REPORT: 'true',
  EMAIL_WEEKLY_REPORT: 'true',
} as const;

/**
 * Get an environment variable with a required default
 */
function getEnvWithDefault(key: string, defaultValue: string): string {
  return process.env[key] ?? defaultValue;
}

/**
 * Get an optional environment variable
 */
function getEnvOptional(key: string): string | undefined {
  return process.env[key];
}

/**
 * Get a required environment variable, throwing if missing
 */
function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new ConfigError(`Missing required environment variable: ${key}`, [key]);
  }
  return value;
}

/**
 * Parse a numeric environment variable
 */
function parseNumber(value: string, name: string): number {
  const num = parseFloat(value);
  if (isNaN(num)) {
    throw new ConfigError(`Invalid numeric value for ${name}: ${value}`);
  }
  return num;
}

/**
 * Parse a boolean environment variable
 */
function parseBoolean(value: string): boolean {
  return value.toLowerCase() === 'true' || value === '1';
}

/**
 * Parse repository configurations from environment
 * Format: REPO_<ID>_URL, REPO_<ID>_BRANCH, etc.
 */
function parseRepoConfigs(): RepoConfig[] {
  const repos: RepoConfig[] = [];
  const repoIds = new Set<string>();

  // Find all REPO_*_URL variables to identify repos
  for (const key of Object.keys(process.env)) {
    const match = key.match(/^REPO_([A-Z0-9_]+)_URL$/);
    if (match && match[1]) {
      repoIds.add(match[1]);
    }
  }

  for (const id of repoIds) {
    const prefix = `REPO_${id}`;
    const url = getEnvOptional(`${prefix}_URL`);

    if (!url) continue;

    const customInstructions = getEnvOptional(`${prefix}_INSTRUCTIONS`);

    const settings: RepoSettings = {
      contentFrequency: getEnvWithDefault(`${prefix}_CONTENT_FREQUENCY`, 'weekly') as RepoSettings['contentFrequency'],
      tone: getEnvWithDefault(`${prefix}_TONE`, 'professional') as RepoSettings['tone'],
      topics: getEnvWithDefault(`${prefix}_TOPICS`, '').split(',').map(t => t.trim()).filter(Boolean),
      maxBlogsPerWeek: parseNumber(getEnvWithDefault(`${prefix}_MAX_BLOGS`, '2'), `${prefix}_MAX_BLOGS`),
      maxImagesPerDay: parseNumber(getEnvWithDefault(`${prefix}_MAX_IMAGES`, '5'), `${prefix}_MAX_IMAGES`),
      excludePaths: getEnvWithDefault(`${prefix}_EXCLUDE`, '').split(',').map(p => p.trim()).filter(Boolean),
    };

    // Only add customInstructions if it's defined (exactOptionalPropertyTypes compliance)
    if (customInstructions !== undefined) {
      settings.customInstructions = customInstructions;
    }

    const repo: RepoConfig = {
      id: id.toLowerCase().replace(/_/g, '-'),
      url,
      branch: getEnvWithDefault(`${prefix}_BRANCH`, 'main'),
      domain: getEnvWithDefault(`${prefix}_DOMAIN`, ''),
      settings,
    };

    const searchConsoleUrl = getEnvOptional(`${prefix}_SEARCH_CONSOLE`);
    if (searchConsoleUrl !== undefined) {
      repo.searchConsole = { propertyUrl: searchConsoleUrl };
    }

    repos.push(repo);
  }

  return repos;
}

/**
 * Parse AI configuration from environment
 */
function parseAIConfig(): AIConfig {
  return {
    model: requireEnv('AI_MODEL'),
    maxTokens: parseNumber(getEnvWithDefault('AI_MAX_TOKENS', DEFAULTS.AI_MAX_TOKENS), 'AI_MAX_TOKENS'),
    temperature: parseNumber(getEnvWithDefault('AI_TEMPERATURE', DEFAULTS.AI_TEMPERATURE), 'AI_TEMPERATURE'),
  };
}

/**
 * Parse image configuration from environment
 */
function parseImageConfig(): ImageConfig {
  const provider = getEnvWithDefault('IMAGE_PROVIDER', DEFAULTS.IMAGE_PROVIDER);

  if (provider !== 'replicate' && provider !== 'openai') {
    throw new ConfigError(`Invalid IMAGE_PROVIDER: ${provider}. Must be 'replicate' or 'openai'`);
  }

  return {
    provider,
    model: getEnvWithDefault('IMAGE_MODEL', DEFAULTS.IMAGE_MODEL),
    maxPerDay: parseNumber(getEnvWithDefault('IMAGE_MAX_PER_DAY', DEFAULTS.IMAGE_MAX_PER_DAY), 'IMAGE_MAX_PER_DAY'),
  };
}

/**
 * Parse email configuration from environment
 */
function parseEmailConfig(): EmailConfig {
  const provider = getEnvWithDefault('EMAIL_PROVIDER', DEFAULTS.EMAIL_PROVIDER);

  if (provider !== 'resend' && provider !== 'smtp') {
    throw new ConfigError(`Invalid EMAIL_PROVIDER: ${provider}. Must be 'resend' or 'smtp'`);
  }

  return {
    provider,
    from: requireEnv('EMAIL_FROM'),
    to: requireEnv('EMAIL_TO').split(',').map(e => e.trim()).filter(Boolean),
    dailyReport: parseBoolean(getEnvWithDefault('EMAIL_DAILY_REPORT', DEFAULTS.EMAIL_DAILY_REPORT)),
    weeklyReport: parseBoolean(getEnvWithDefault('EMAIL_WEEKLY_REPORT', DEFAULTS.EMAIL_WEEKLY_REPORT)),
  };
}

/**
 * Validate all required environment variables are present
 */
function validateRequiredVars(): void {
  const missing: string[] = [];

  for (const category of Object.keys(REQUIRED_VARS) as (keyof typeof REQUIRED_VARS)[]) {
    for (const varName of REQUIRED_VARS[category]) {
      if (!process.env[varName]) {
        missing.push(varName);
      }
    }
  }

  if (missing.length > 0) {
    throw new ConfigError(
      `Missing required environment variables: ${missing.join(', ')}`,
      missing
    );
  }
}

/**
 * Load configuration from environment variables
 * @param envPath - Optional path to .env file
 * @returns Validated configuration object
 * @throws ConfigError if required variables are missing or invalid
 */
export function loadConfig(envPath?: string): Config {
  // Load .env file if it exists
  if (envPath !== undefined) {
    dotenvConfig({ path: envPath });
  } else {
    dotenvConfig();
  }

  // Validate required variables
  validateRequiredVars();

  // Parse and return configuration
  return {
    repos: parseRepoConfigs(),
    ai: parseAIConfig(),
    images: parseImageConfig(),
    email: parseEmailConfig(),
  };
}

/**
 * Check if configuration is valid without throwing
 * @returns Object with valid flag and any errors
 */
export function validateConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  try {
    validateRequiredVars();
  } catch (e) {
    if (e instanceof ConfigError) {
      errors.push(e.message);
    }
  }

  // Check AI_TEMPERATURE is in valid range
  const tempStr = process.env['AI_TEMPERATURE'] ?? '0.7';
  const temp = parseFloat(tempStr);
  if (!isNaN(temp) && (temp < 0 || temp > 2)) {
    errors.push('AI_TEMPERATURE must be between 0 and 2');
  }

  // Check IMAGE_PROVIDER is valid
  const imageProvider = process.env['IMAGE_PROVIDER'];
  if (imageProvider && !['replicate', 'openai'].includes(imageProvider)) {
    errors.push(`Invalid IMAGE_PROVIDER: ${imageProvider}`);
  }

  // Check EMAIL_PROVIDER is valid
  const emailProvider = process.env['EMAIL_PROVIDER'];
  if (emailProvider && !['resend', 'smtp'].includes(emailProvider)) {
    errors.push(`Invalid EMAIL_PROVIDER: ${emailProvider}`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
