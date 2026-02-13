/**
 * AI Client for SEO automation using the Anthropic Claude API.
 * Supports both ANTHROPIC_API_KEY and CLAUDE_CODE_OAUTH_TOKEN authentication.
 */

import {
  IAIClient,
  Message,
  ChatOptions,
  CodebaseProfile,
  PageInfo,
  SEOIssue,
  CodeFix,
  BlogPost,
  RepoSettings,
  ImagePromptContext,
} from '../types'
import { PROMPTS } from './prompts'

const API_URL = 'https://api.anthropic.com/v1/messages'
const MAX_RETRIES = 3
const INITIAL_RETRY_DELAY_MS = 1000

type AuthType = 'api_key' | 'oauth_token'

interface AnthropicContentBlock {
  type: string
  text?: string
}

interface AnthropicResponse {
  content: AnthropicContentBlock[]
  usage?: {
    input_tokens: number
    output_tokens: number
  }
}

interface AnthropicErrorResponse {
  error?: {
    type: string
    message: string
  }
}

interface FileEntry {
  path: string
  content: string
}

/**
 * Configuration options for AIClient.
 */
export interface AIClientConfig {
  /** Claude model ID (defaults to claude-sonnet-4-20250514) */
  model?: string
  /** Default max tokens for responses */
  maxTokens?: number
  /** API key override (defaults to ANTHROPIC_API_KEY env var) */
  apiKey?: string
  /** OAuth token override (defaults to CLAUDE_CODE_OAUTH_TOKEN env var) */
  oauthToken?: string
}

/**
 * Resolve credentials from environment or config.
 * Priority: 1) Config overrides, 2) ANTHROPIC_API_KEY, 3) CLAUDE_CODE_OAUTH_TOKEN
 */
function resolveCredentials(config?: AIClientConfig): { token: string; authType: AuthType } {
  // Check config overrides first
  if (config?.apiKey) {
    return { token: config.apiKey, authType: 'api_key' }
  }
  if (config?.oauthToken) {
    return { token: config.oauthToken, authType: 'oauth_token' }
  }

  // Check environment variables
  const apiKey = process.env['ANTHROPIC_API_KEY']
  if (apiKey) {
    return { token: apiKey, authType: 'api_key' }
  }

  const oauthToken = process.env['CLAUDE_CODE_OAUTH_TOKEN']
  if (oauthToken) {
    return { token: oauthToken, authType: 'oauth_token' }
  }

  throw new Error(
    'No API credentials found. Set either ANTHROPIC_API_KEY or CLAUDE_CODE_OAUTH_TOKEN environment variable.'
  )
}

/**
 * Build headers for Anthropic API request based on auth type.
 */
function buildHeaders(token: string, authType: AuthType): Record<string, string> {
  const baseHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    'anthropic-version': '2023-06-01',
  }

  if (authType === 'api_key') {
    // Standard API key authentication
    return {
      ...baseHeaders,
      'x-api-key': token,
    }
  }

  // OAuth token authentication (Claude Code style)
  return {
    ...baseHeaders,
    'Authorization': `Bearer ${token}`,
    'anthropic-beta': 'claude-code-20250219,oauth-2025-04-20',
    'anthropic-dangerous-direct-browser-access': 'true',
    'user-agent': 'claude-cli/2.1.2 (seo-agent)',
    'x-app': 'cli',
  }
}

/**
 * AI Client implementing the IAIClient interface.
 * Uses direct HTTP calls to the Anthropic API with retry logic.
 * Supports both API key and OAuth token authentication.
 */
export class AIClient implements IAIClient {
  private readonly token: string
  private readonly authType: AuthType
  private readonly model: string
  private readonly defaultMaxTokens: number

  /**
   * Creates a new AIClient instance.
   * @param config - Optional configuration overrides
   * @throws Error if no valid credentials are found
   */
  constructor(config?: AIClientConfig) {
    const credentials = resolveCredentials(config)
    this.token = credentials.token
    this.authType = credentials.authType
    this.model = config?.model || process.env['AI_MODEL'] || 'claude-sonnet-4-20250514'
    this.defaultMaxTokens = config?.maxTokens || 8192

    console.log(`  AI Client initialized with ${this.authType === 'oauth_token' ? 'OAuth token' : 'API key'}`)
  }

  /**
   * Get the current authentication type being used.
   */
  getAuthType(): AuthType {
    return this.authType
  }

  /**
   * Send a chat message to Claude and get a response.
   * @param systemPrompt - System prompt setting the context
   * @param messages - Conversation messages
   * @param options - Optional settings like temperature and max tokens
   * @returns The assistant's response text
   */
  async chat(
    systemPrompt: string,
    messages: Message[],
    options?: ChatOptions
  ): Promise<string> {
    return this.executeWithRetry(async () => {
      const headers = buildHeaders(this.token, this.authType)

      // For OAuth, we need to format system as array with type
      const systemContent = this.authType === 'oauth_token'
        ? [{ type: 'text', text: systemPrompt }]
        : systemPrompt

      const response = await fetch(API_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: this.model,
          max_tokens: options?.maxTokens || this.defaultMaxTokens,
          system: systemContent,
          messages,
          temperature: options?.temperature ?? 0.7,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        let errorMessage = `Anthropic API error: ${response.status}`

        try {
          const errorData = JSON.parse(errorText) as AnthropicErrorResponse
          if (errorData.error?.message) {
            errorMessage = `${errorMessage} - ${errorData.error.message}`
          }
        } catch {
          errorMessage = `${errorMessage} - ${errorText}`
        }

        // Check if this is a rate limit error for retry logic
        if (response.status === 429) {
          const error = new Error(errorMessage) as Error & { status: number }
          error.status = 429
          throw error
        }

        throw new Error(errorMessage)
      }

      const data = (await response.json()) as AnthropicResponse
      const textBlocks = data.content.filter(
        (block): block is AnthropicContentBlock & { text: string } =>
          block.type === 'text' && typeof block.text === 'string'
      )

      return textBlocks.map((block) => block.text).join('')
    })
  }

  /**
   * Analyze a codebase to determine its structure and SEO patterns.
   * @param files - Map of file paths to their contents
   * @returns CodebaseProfile with framework info and structure
   */
  async analyzeCodebase(files: Map<string, string>): Promise<CodebaseProfile> {
    const fileList: FileEntry[] = Array.from(files.entries())
      .map(([path, content]) => ({
        path,
        content: content.slice(0, 3000), // Limit content per file to avoid token limits
      }))
      .slice(0, 50) // Max 50 files to analyze

    const response = await this.chat(
      PROMPTS.CODEBASE_ANALYZER,
      [
        {
          role: 'user',
          content: `Analyze this codebase:\n\n${JSON.stringify(fileList, null, 2)}`,
        },
      ],
      { temperature: 0.3 }
    )

    return this.parseJSON<CodebaseProfile>(response)
  }

  /**
   * Find SEO issues in a codebase.
   * @param profile - The codebase profile from analyzeCodebase
   * @param pages - Array of page info to analyze
   * @returns Array of SEO issues found
   */
  async findSEOIssues(
    profile: CodebaseProfile,
    pages: PageInfo[]
  ): Promise<SEOIssue[]> {
    const response = await this.chat(
      PROMPTS.SEO_ANALYZER,
      [
        {
          role: 'user',
          content: `Codebase profile:\n${JSON.stringify(profile, null, 2)}\n\nPages:\n${JSON.stringify(pages, null, 2)}`,
        },
      ],
      { temperature: 0.3 }
    )

    return this.parseJSON<SEOIssue[]>(response)
  }

  /**
   * Generate a code fix for an SEO issue.
   * @param issue - The SEO issue to fix
   * @param profile - The codebase profile
   * @param fileContent - Current content of the file to fix
   * @returns CodeFix with the necessary changes
   */
  async generateFix(
    issue: SEOIssue,
    profile: CodebaseProfile,
    fileContent: string
  ): Promise<CodeFix> {
    const response = await this.chat(
      PROMPTS.CODE_FIXER,
      [
        {
          role: 'user',
          content: `Issue:\n${JSON.stringify(issue, null, 2)}\n\nFramework: ${profile.framework}\nMeta handling: ${profile.seoPatterns.metaHandling}\n\nCurrent file content:\n\`\`\`\n${fileContent}\n\`\`\``,
        },
      ],
      { temperature: 0.3 }
    )

    return this.parseJSON<CodeFix>(response)
  }

  /**
   * Generate an SEO-optimized blog post.
   * @param topic - The blog topic
   * @param keyword - Target keyword to optimize for
   * @param profile - The codebase profile
   * @param settings - Repository settings including tone
   * @returns Complete BlogPost ready for publishing
   */
  async generateBlog(
    topic: string,
    keyword: string,
    profile: CodebaseProfile,
    settings: RepoSettings
  ): Promise<BlogPost> {
    const response = await this.chat(
      PROMPTS.BLOG_WRITER,
      [
        {
          role: 'user',
          content: `Topic: ${topic}\nTarget keyword: ${keyword}\nTone: ${settings.tone}\nFramework: ${profile.framework}\n\nWrite a complete blog post.`,
        },
      ],
      { temperature: 0.7 }
    )

    const post = this.parseJSON<BlogPost>(response)

    // Add runtime fields
    post.id = `post-${Date.now()}`
    post.repoId = profile.repoId
    post.author = 'SEO Agent'
    post.publishedAt = new Date()

    return post
  }

  /**
   * Generate an AI image prompt for a blog post.
   * @param context - Context about the image needed
   * @returns Prompt string for image generation APIs
   */
  async generateImagePrompt(context: ImagePromptContext): Promise<string> {
    const response = await this.chat(
      PROMPTS.IMAGE_PROMPTER,
      [
        {
          role: 'user',
          content: `Title: ${context.title}\nTopic: ${context.topic}\nTone: ${context.tone}`,
        },
      ],
      { temperature: 0.8 }
    )

    return response.trim()
  }

  /**
   * Generate SEO-optimized alt text for an image.
   * @param imageContext - Description or context about the image
   * @param keyword - Optional keyword to incorporate
   * @returns Alt text string (max 125 characters)
   */
  async generateAltText(imageContext: string, keyword?: string): Promise<string> {
    const response = await this.chat(
      PROMPTS.ALT_TEXT_GENERATOR,
      [
        {
          role: 'user',
          content: `Image context: ${imageContext}\nKeyword: ${keyword || 'none'}`,
        },
      ],
      { temperature: 0.5 }
    )

    return response.trim().slice(0, 125)
  }

  /**
   * Suggest blog topics based on keyword and existing content.
   * @param keyword - Base keyword or topic area
   * @param existingTopics - Already published topics to avoid duplication
   * @param tone - Desired content tone
   * @returns Array of 5 topic suggestions
   */
  async suggestTopics(
    keyword: string,
    existingTopics: string[],
    tone: string
  ): Promise<string[]> {
    const response = await this.chat(
      PROMPTS.TOPIC_SUGGESTER,
      [
        {
          role: 'user',
          content: `Base keyword: ${keyword}\nTone: ${tone}\nExisting topics to avoid:\n${existingTopics.join('\n')}`,
        },
      ],
      { temperature: 0.8 }
    )

    return this.parseJSON<string[]>(response)
  }

  /**
   * Parse JSON response, stripping any markdown code blocks.
   * @param response - Raw response string from Claude
   * @returns Parsed JSON object
   * @throws Error if JSON parsing fails
   */
  private parseJSON<T>(response: string): T {
    let cleaned = response.trim()

    // Strip markdown code blocks
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.slice(7)
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.slice(3)
    }

    if (cleaned.endsWith('```')) {
      cleaned = cleaned.slice(0, -3)
    }

    cleaned = cleaned.trim()

    try {
      return JSON.parse(cleaned) as T
    } catch (error) {
      const parseError = error as Error
      throw new Error(
        `Failed to parse AI response as JSON: ${parseError.message}\nResponse: ${cleaned.slice(0, 500)}`
      )
    }
  }

  /**
   * Execute an async function with exponential backoff retry on rate limits.
   * @param fn - Async function to execute
   * @returns Result of the function
   */
  private async executeWithRetry<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: Error | undefined
    let delay = INITIAL_RETRY_DELAY_MS

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        return await fn()
      } catch (error) {
        lastError = error as Error
        const errorWithStatus = error as Error & { status?: number }

        // Only retry on rate limit errors
        if (errorWithStatus.status !== 429) {
          throw error
        }

        // Don't retry on last attempt
        if (attempt === MAX_RETRIES - 1) {
          break
        }

        // Exponential backoff with jitter
        const jitter = Math.random() * 200
        await this.sleep(delay + jitter)
        delay *= 2
      }
    }

    throw lastError || new Error('Max retries exceeded')
  }

  /**
   * Sleep for a specified duration.
   * @param ms - Milliseconds to sleep
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}

/**
 * Create a new AIClient instance with default configuration.
 * Convenience function for quick setup.
 */
export function createAIClient(config?: AIClientConfig): AIClient {
  return new AIClient(config)
}
