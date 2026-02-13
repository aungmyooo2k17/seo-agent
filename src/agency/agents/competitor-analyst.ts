/**
 * Competitor Analyst Agent
 *
 * Analyzes competitors to identify opportunities and threats.
 * Uses AI to infer competitive landscape from site context.
 * Can be enhanced with external data (Ahrefs, SEMrush APIs, etc.)
 */

import type { AIClient } from '../../ai/client'
import type { CodebaseProfile, RepoSettings } from '../../types'
import type { CompetitorAnalysis, IResearchAgent } from '../types'

const COMPETITOR_ANALYST_PROMPT = `You are a senior competitive intelligence analyst specializing in SEO and digital marketing.

Your role is to analyze a website's competitive landscape and identify:
1. Who the main competitors likely are
2. What they're doing well that we can learn from
3. Where they're weak and we can gain advantage
4. Content gaps we can exploit

## Your Approach

1. **Identify Competitors**: Based on the site's niche, who would they compete with?
2. **Analyze Strengths**: What makes competitors successful in search?
3. **Find Weaknesses**: Where are competitors vulnerable?
4. **Spot Opportunities**: What content/keywords are competitors missing?

## Output Format

Return a JSON array of CompetitorAnalysis objects:
[
  {
    "domain": "competitor.com",
    "keywordGaps": ["keywords they rank for that the site doesn't"],
    "topContent": [
      {
        "url": "/blog/example-post",
        "title": "Example Post Title",
        "primaryKeyword": "main keyword",
        "wordCount": 2500,
        "contentType": "blog",
        "rankingFactors": ["comprehensive coverage", "good internal linking"]
      }
    ],
    "estimatedTraffic": 50000,
    "domainAuthority": 55,
    "strengths": ["Strong technical SEO", "Regular content updates"],
    "weaknesses": ["Thin content on some pages", "Poor mobile experience"]
  }
]

IMPORTANT: Return ONLY valid JSON array, no markdown code blocks.
IMPORTANT: Provide 3-5 competitor analyses.
IMPORTANT: Be specific and actionable in strengths/weaknesses.
IMPORTANT: Infer realistic metrics based on typical sites in the niche.`

/**
 * Input context for competitor analysis
 */
interface CompetitorAnalysisContext {
  profile: CodebaseProfile
  settings: RepoSettings
}

/**
 * Competitor Analyst Agent
 *
 * Analyzes competitive landscape based on site context.
 * Currently uses AI inference; can be enhanced with API data.
 */
export class CompetitorAnalyst implements IResearchAgent {
  readonly name = 'Competitor Analyst'
  readonly description = 'Analyzes competitors to find opportunities and threats'

  constructor(private readonly ai: AIClient) {}

  /**
   * Analyze competitors for the site
   */
  async research(context: CompetitorAnalysisContext): Promise<CompetitorAnalysis[]> {
    const { profile, settings } = context

    const contextMessage = this.buildContextMessage(profile, settings)

    const response = await this.ai.chat(
      COMPETITOR_ANALYST_PROMPT,
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
  private buildContextMessage(profile: CodebaseProfile, settings: RepoSettings): string {
    // Extract content themes from pages
    const contentThemes = profile.pages
      .filter((p) => p.title)
      .map((p) => p.title)
      .slice(0, 20)
      .join('\n- ')

    return `## Site to Analyze

**Niche/Topics**: ${settings.topics.join(', ')}
**Tone**: ${settings.tone}
**Framework**: ${profile.framework}
**Total Pages**: ${profile.pages.length}

## Current Content Themes

- ${contentThemes || 'No content detected'}

## Custom Context

${settings.customInstructions || 'No additional context provided.'}

---

Based on this site's niche and content, analyze the competitive landscape:

1. Identify 3-5 likely competitors in this space
2. For each competitor, analyze:
   - What keywords they likely rank for that this site doesn't
   - Their top content that performs well
   - Their strengths to learn from
   - Their weaknesses to exploit

Be specific and actionable. Think about what a real SEO agency would discover when analyzing this market.`
  }

  /**
   * Parse the AI response into CompetitorAnalysis array
   */
  private parseResponse(response: string): CompetitorAnalysis[] {
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
      return JSON.parse(cleaned) as CompetitorAnalysis[]
    } catch (error) {
      const parseError = error as Error
      throw new Error(
        `Failed to parse competitor analysis: ${parseError.message}\nResponse: ${cleaned.slice(0, 500)}`
      )
    }
  }
}

/**
 * Create a new Competitor Analyst agent
 */
export function createCompetitorAnalyst(ai: AIClient): CompetitorAnalyst {
  return new CompetitorAnalyst(ai)
}
