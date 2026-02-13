/**
 * AI module for SEO automation.
 * Provides AI-powered codebase analysis, SEO issue detection,
 * code fixes, and content generation.
 */

export { AIClient, createAIClient } from './client'
export type { AIClientConfig } from './client'

export {
  PROMPTS,
  CODEBASE_ANALYZER,
  SEO_ANALYZER,
  CODE_FIXER,
  TOPIC_SUGGESTER,
  BLOG_WRITER,
  IMAGE_PROMPTER,
  ALT_TEXT_GENERATOR,
} from './prompts'
