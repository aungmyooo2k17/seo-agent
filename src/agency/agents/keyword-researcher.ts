/**
 * Keyword Researcher Agent
 *
 * Analyzes the site's niche and identifies keyword opportunities.
 * Uses AI to infer opportunities from existing content and settings.
 * Can be enhanced with external API data (SerpAPI, DataForSEO, etc.)
 */

import type { AIClient } from '../../ai/client'
import type { CodebaseProfile, RepoSettings, DailyMetrics } from '../../types'
import type { KeywordOpportunity, IResearchAgent } from '../types'

const KEYWORD_RESEARCHER_PROMPT = `You are a senior SEO keyword researcher with expertise in finding high-value keyword opportunities.

Your role is to analyze a website and identify keyword opportunities based on:
1. The site's existing content and structure
2. The niche/topics they cover
3. Current search performance (if available)
4. Gaps in their keyword coverage

## Your Approach

1. **Understand the Site**: What does this site do? Who is the audience?
2. **Identify Core Topics**: What are the main topic clusters?
3. **Find Opportunities**: Where can they rank with new or improved content?
4. **Assess Difficulty**: Which keywords are achievable vs. aspirational?
5. **Calculate Opportunity**: High volume + achievable difficulty = high opportunity

## Opportunity Scoring

Score each keyword 0-100 based on:
- Search volume (estimated based on topic popularity)
- Competition difficulty (based on likely competitors)
- Current ranking (if ranking, how much room to improve?)
- Relevance to site (how well does it fit?)
- Intent alignment (can the site serve this intent?)

## Output Format

Return a JSON array of KeywordOpportunity objects:
[
  {
    "keyword": "how to optimize next.js for seo",
    "searchVolume": 1200,
    "difficulty": 45,
    "currentPosition": null,
    "intent": "informational",
    "opportunityScore": 78,
    "reasoning": "High search volume, medium difficulty, directly relevant to site's Next.js focus, no current content covering this"
  }
]

IMPORTANT: Return ONLY valid JSON array, no markdown code blocks.
IMPORTANT: Provide 10-20 keyword opportunities, sorted by opportunityScore descending.
IMPORTANT: Be realistic about search volumes and difficulty - use your knowledge of typical search patterns.`

/**
 * Input context for keyword research
 */
interface KeywordResearchContext {
  profile: CodebaseProfile
  settings: RepoSettings
  recentMetrics?: DailyMetrics[]
}

/**
 * Keyword Researcher Agent
 *
 * Identifies keyword opportunities based on site analysis.
 * Currently uses AI inference; can be enhanced with API data.
 */
export class KeywordResearcher implements IResearchAgent {
  readonly name = 'Keyword Researcher'
  readonly description = 'Finds high-value keyword opportunities for SEO growth'

  constructor(private readonly ai: AIClient) {}

  /**
   * Research keyword opportunities for the site
   */
  async research(context: KeywordResearchContext): Promise<KeywordOpportunity[]> {
    const { profile, settings, recentMetrics } = context

    // Build context message
    const contextMessage = this.buildContextMessage(profile, settings, recentMetrics)

    const response = await this.ai.chat(
      KEYWORD_RESEARCHER_PROMPT,
      [
        {
          role: 'user',
          content: contextMessage,
        },
      ],
      {
        temperature: 0.6,
        maxTokens: 4096,
      }
    )

    return this.parseResponse(response)
  }

  /**
   * Build context message for the AI
   */
  private buildContextMessage(
    profile: CodebaseProfile,
    settings: RepoSettings,
    metrics?: DailyMetrics[]
  ): string {
    // Extract page topics from the profile
    const pageTopics = profile.pages
      .map((p) => `- ${p.path}: ${p.title || '(no title)'}`)
      .slice(0, 30)
      .join('\n')

    // Extract current queries if we have metrics
    let currentQueries = 'No search data available yet.'
    if (metrics && metrics.length > 0 && metrics[0]!.queries.length > 0) {
      const topQueries = metrics[0]!.queries
        .sort((a, b) => b.impressions - a.impressions)
        .slice(0, 20)
        .map((q) => `- "${q.query}": ${q.impressions} impressions, pos ${q.position.toFixed(1)}`)
        .join('\n')
      currentQueries = topQueries
    }

    return `## Site Analysis

**Framework**: ${profile.framework}
**Total Pages**: ${profile.pages.length}
**Niche/Topics**: ${settings.topics.join(', ')}
**Tone**: ${settings.tone}
**Custom Instructions**: ${settings.customInstructions || 'None'}

## Current Pages

${pageTopics}

## Current Search Performance

${currentQueries}

---

Based on this site, identify 10-20 keyword opportunities. Consider:
1. Keywords they should be targeting but aren't
2. Keywords where they rank but could improve
3. Long-tail variations of their core topics
4. Question-based keywords (how to, what is, etc.)
5. Comparison/alternative keywords if relevant

Remember to estimate realistic search volumes and difficulty scores.`
  }

  /**
   * Parse the AI response into KeywordOpportunity array
   */
  private parseResponse(response: string): KeywordOpportunity[] {
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
      const opportunities = JSON.parse(cleaned) as KeywordOpportunity[]

      // Sort by opportunity score descending
      return opportunities.sort((a, b) => b.opportunityScore - a.opportunityScore)
    } catch (error) {
      const parseError = error as Error
      throw new Error(
        `Failed to parse keyword opportunities: ${parseError.message}\nResponse: ${cleaned.slice(0, 500)}`
      )
    }
  }
}

/**
 * Create a new Keyword Researcher agent
 */
export function createKeywordResearcher(ai: AIClient): KeywordResearcher {
  return new KeywordResearcher(ai)
}
