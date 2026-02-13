/**
 * AI module for SEO automation.
 * Provides AI-powered codebase analysis, SEO issue detection,
 * code fixes, content generation, and strategic planning.
 */

export { AIClient, createAIClient } from './client'
export type { AIClientConfig } from './client'

export { SEOStrategist, createStrategist } from './strategist'
export type { StrategyContext, StrategicAction, StrategicPlan } from './strategist'

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
