/**
 * SEO Agency Module
 *
 * An AI-powered SEO team that operates like a real agency:
 * - Keyword Researcher: Finds keyword opportunities
 * - Competitor Analyst: Analyzes competitive landscape
 * - SEO Director: Creates strategic plans
 *
 * @example
 * ```typescript
 * import { SEOAgency } from './agency'
 *
 * const agency = new SEOAgency(aiClient)
 * const plan = await agency.createStrategicPlan(input)
 *
 * // Execute plan actions
 * for (const action of plan.actions) {
 *   // ...
 * }
 * ```
 */

// Main agency class
export { SEOAgency, createSEOAgency } from './agency'
export type { AgencyConfig, AgencyInput } from './agency'

// Types
export type {
  KeywordOpportunity,
  CompetitorAnalysis,
  CompetitorContent,
  ContentGap,
  AgencyContext,
  AgencyAction,
  AgencyPlan,
  ActionExecutor,
  IAgencyAgent,
  IResearchAgent,
  IExecutionAgent,
  ISEODirector,
} from './types'

// Individual agents (for advanced usage)
export { KeywordResearcher, createKeywordResearcher } from './agents/keyword-researcher'
export { CompetitorAnalyst, createCompetitorAnalyst } from './agents/competitor-analyst'
export { SEODirector, createSEODirector } from './agents/seo-director'
