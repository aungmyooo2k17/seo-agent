/**
 * SEO Agency - Orchestrates the AI-powered SEO team
 *
 * This is the main entry point for the agency model.
 * It coordinates research agents and the SEO Director to create
 * comprehensive, strategic SEO plans.
 */

import type { AIClient } from '../ai/client'
import type {
  CodebaseProfile,
  SEOIssue,
  DailyMetrics,
  Change,
  RepoSettings,
} from '../types'
import type {
  AgencyContext,
  AgencyPlan,
  KeywordOpportunity,
  CompetitorAnalysis,
  ContentGap,
} from './types'
import { KeywordResearcher } from './agents/keyword-researcher'
import { CompetitorAnalyst } from './agents/competitor-analyst'
import { SEODirector } from './agents/seo-director'

/**
 * Configuration for the SEO Agency
 */
export interface AgencyConfig {
  /** Enable keyword research (adds latency but improves recommendations) */
  enableKeywordResearch?: boolean
  /** Enable competitor analysis (adds latency but improves recommendations) */
  enableCompetitorAnalysis?: boolean
  /** Enable content gap analysis (derived from keyword + competitor data) */
  enableContentGapAnalysis?: boolean
  /** Maximum research agents to run in parallel */
  maxParallelResearch?: number
}

/**
 * Input for the agency's strategic planning
 */
export interface AgencyInput {
  profile: CodebaseProfile
  issues: SEOIssue[]
  recentMetrics: DailyMetrics[]
  pastChanges: Change[]
  settings: RepoSettings
  daysSinceLastContent: number | null
  existingContentCount: number
}

/**
 * SEO Agency - The AI-powered SEO team
 *
 * Coordinates research agents and strategic planning to create
 * comprehensive SEO action plans.
 *
 * @example
 * ```typescript
 * const agency = new SEOAgency(aiClient)
 * const plan = await agency.createStrategicPlan(input)
 * ```
 */
export class SEOAgency {
  private readonly keywordResearcher: KeywordResearcher
  private readonly competitorAnalyst: CompetitorAnalyst
  private readonly seoDirector: SEODirector
  private readonly config: AgencyConfig

  constructor(ai: AIClient, config: AgencyConfig = {}) {
    this.keywordResearcher = new KeywordResearcher(ai)
    this.competitorAnalyst = new CompetitorAnalyst(ai)
    this.seoDirector = new SEODirector(ai)

    // Default configuration
    this.config = {
      enableKeywordResearch: true,
      enableCompetitorAnalysis: true,
      enableContentGapAnalysis: true,
      maxParallelResearch: 2,
      ...config,
    }
  }

  /**
   * Create a comprehensive strategic plan
   *
   * This runs the full agency workflow:
   * 1. Research phase (keyword + competitor analysis)
   * 2. Strategy phase (SEO Director synthesizes and plans)
   *
   * @param input - Site context for analysis
   * @returns Comprehensive strategic plan
   */
  async createStrategicPlan(input: AgencyInput): Promise<AgencyPlan> {
    console.log('  [agency] Starting SEO Agency analysis...')

    // Phase 1: Research
    const researchResults = await this.runResearchPhase(input)

    // Phase 2: Strategic Planning
    const context: AgencyContext = {
      ...input,
      keywordOpportunities: researchResults.keywords,
      competitorAnalysis: researchResults.competitors,
      contentGaps: researchResults.contentGaps,
    }

    console.log('  [agency] SEO Director creating strategic plan...')
    const plan = await this.seoDirector.createPlan(context)

    console.log(`  [agency] Plan created: ${plan.actions.length} actions, focus: ${plan.focusArea}`)

    return plan
  }

  /**
   * Run the research phase
   *
   * Executes research agents in parallel to gather intelligence.
   */
  private async runResearchPhase(input: AgencyInput): Promise<{
    keywords?: KeywordOpportunity[]
    competitors?: CompetitorAnalysis[]
    contentGaps?: ContentGap[]
  }> {
    const results: {
      keywords?: KeywordOpportunity[]
      competitors?: CompetitorAnalysis[]
      contentGaps?: ContentGap[]
    } = {}

    const researchTasks: Array<Promise<void>> = []

    // Keyword Research
    if (this.config.enableKeywordResearch) {
      console.log('  [agency] Keyword Researcher analyzing opportunities...')
      researchTasks.push(
        this.keywordResearcher
          .research({
            profile: input.profile,
            settings: input.settings,
            recentMetrics: input.recentMetrics,
          })
          .then((keywords) => {
            results.keywords = keywords
            console.log(`  [agency] Found ${keywords.length} keyword opportunities`)
          })
          .catch((error) => {
            console.warn(`  [agency] Keyword research failed: ${error instanceof Error ? error.message : String(error)}`)
          })
      )
    }

    // Competitor Analysis
    if (this.config.enableCompetitorAnalysis) {
      console.log('  [agency] Competitor Analyst analyzing landscape...')
      researchTasks.push(
        this.competitorAnalyst
          .research({
            profile: input.profile,
            settings: input.settings,
          })
          .then((competitors) => {
            results.competitors = competitors
            console.log(`  [agency] Analyzed ${competitors.length} competitors`)
          })
          .catch((error) => {
            console.warn(`  [agency] Competitor analysis failed: ${error instanceof Error ? error.message : String(error)}`)
          })
      )
    }

    // Wait for all research to complete
    await Promise.all(researchTasks)

    // Derive content gaps from keyword + competitor data
    if (this.config.enableContentGapAnalysis && results.keywords && results.competitors) {
      results.contentGaps = this.deriveContentGaps(results.keywords, results.competitors, input.profile)
      console.log(`  [agency] Identified ${results.contentGaps.length} content gaps`)
    }

    return results
  }

  /**
   * Derive content gaps from keyword and competitor research
   */
  private deriveContentGaps(
    keywords: KeywordOpportunity[],
    competitors: CompetitorAnalysis[],
    profile: CodebaseProfile
  ): ContentGap[] {
    // Get existing page topics
    const existingTopics = new Set(
      profile.pages
        .filter((p) => p.title)
        .map((p) => p.title!.toLowerCase())
    )

    // Cluster keywords by theme
    const gaps: ContentGap[] = []

    // Find keywords we're not covering
    const uncoveredKeywords = keywords.filter((k) => {
      const keywordLower = k.keyword.toLowerCase()
      return !Array.from(existingTopics).some((topic) =>
        topic.includes(keywordLower) || keywordLower.includes(topic)
      )
    })

    // Group high-opportunity uncovered keywords
    const highOpportunity = uncoveredKeywords.filter((k) => k.opportunityScore >= 60)

    if (highOpportunity.length > 0) {
      // Simple clustering: group by first significant word
      const clusters = new Map<string, KeywordOpportunity[]>()

      for (const kw of highOpportunity) {
        // Get first meaningful word (skip common words)
        const words = kw.keyword.toLowerCase().split(' ')
        const skipWords = ['how', 'to', 'what', 'is', 'the', 'a', 'an', 'for', 'with']
        const firstMeaningful = words.find((w) => !skipWords.includes(w) && w.length > 2) || words[0] || 'general'

        const existing = clusters.get(firstMeaningful) || []
        existing.push(kw)
        clusters.set(firstMeaningful, existing)
      }

      // Convert clusters to content gaps
      for (const [topic, clusterKeywords] of clusters) {
        if (clusterKeywords.length > 0) {
          const totalVolume = clusterKeywords.reduce((sum, k) => sum + k.searchVolume, 0)
          const avgScore = clusterKeywords.reduce((sum, k) => sum + k.opportunityScore, 0) / clusterKeywords.length

          gaps.push({
            topic: topic.charAt(0).toUpperCase() + topic.slice(1),
            keywords: clusterKeywords.map((k) => k.keyword),
            totalVolume,
            priority: avgScore >= 75 ? 'high' : avgScore >= 50 ? 'medium' : 'low',
            suggestedContentType: clusterKeywords.length >= 3 ? 'pillar' : 'cluster',
            reasoning: `${clusterKeywords.length} uncovered keywords with ${totalVolume} combined monthly searches`,
          })
        }
      }

      // Sort by total volume
      gaps.sort((a, b) => b.totalVolume - a.totalVolume)
    }

    // Add gaps from competitor content
    const competitorKeywordGaps = competitors
      .flatMap((c) => c.keywordGaps)
      .filter((kg) => !existingTopics.has(kg.toLowerCase()))

    if (competitorKeywordGaps.length > 0) {
      // Add competitor-driven gaps
      const uniqueCompetitorGaps = [...new Set(competitorKeywordGaps)].slice(0, 5)

      gaps.push({
        topic: 'Competitor Opportunities',
        keywords: uniqueCompetitorGaps,
        totalVolume: 0, // Unknown without API data
        priority: 'medium',
        suggestedContentType: 'cluster',
        reasoning: 'Keywords competitors rank for that we don\'t cover',
      })
    }

    return gaps.slice(0, 10) // Limit to top 10 gaps
  }

  /**
   * Run a quick analysis without full research
   *
   * Useful for quick checks or when research data is already available.
   */
  async createQuickPlan(input: AgencyInput): Promise<AgencyPlan> {
    console.log('  [agency] Creating quick plan (no research phase)...')

    const context: AgencyContext = {
      ...input,
      // No research data
    }

    return this.seoDirector.createPlan(context)
  }
}

/**
 * Create a new SEO Agency instance
 */
export function createSEOAgency(ai: AIClient, config?: AgencyConfig): SEOAgency {
  return new SEOAgency(ai, config)
}
