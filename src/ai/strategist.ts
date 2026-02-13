/**
 * SEO Strategist - AI-powered strategic planning for SEO optimization
 *
 * This module adds a "thinking" phase before executing SEO actions.
 * Instead of mechanically fixing issues, the strategist analyzes the full context
 * and creates a prioritized action plan with reasoning.
 */

import type {
  CodebaseProfile,
  SEOIssue,
  DailyMetrics,
  Change,
  RepoSettings,
  MeasuredImpact,
} from '../types'
import type { AIClient } from './client'

/**
 * Context provided to the strategist for analysis
 */
export interface StrategyContext {
  /** Current codebase profile */
  profile: CodebaseProfile
  /** All detected SEO issues */
  issues: SEOIssue[]
  /** Recent performance metrics (last 7-30 days) */
  recentMetrics: DailyMetrics[]
  /** Past changes and their measured impact */
  pastChanges: Change[]
  /** Repository settings and goals */
  settings: RepoSettings
  /** Days since last content was published */
  daysSinceLastContent: number | null
  /** Number of existing blog posts */
  existingContentCount: number
}

/**
 * A single action recommended by the strategist
 */
export interface StrategicAction {
  /** Type of action */
  type: 'fix-issue' | 'generate-content' | 'defer' | 'investigate' | 'skip'
  /** Priority (1 = highest) */
  priority: number
  /** Related issue ID (for fix-issue actions) */
  issueId?: string
  /** Suggested topic (for content generation) */
  topic?: string
  /** Keyword to target (for content generation) */
  keyword?: string
  /** Expected impact description */
  expectedImpact: string
  /** Reasoning for this action */
  reasoning: string
  /** Estimated effort level */
  effort: 'low' | 'medium' | 'high'
  /** Confidence level in this recommendation */
  confidence: 'high' | 'medium' | 'low'
}

/**
 * The complete strategic plan output
 */
export interface StrategicPlan {
  /** Overall assessment of the site's SEO health */
  overallAssessment: string
  /** Key insights from the analysis */
  keyInsights: string[]
  /** What's working well */
  strengths: string[]
  /** Areas needing improvement */
  weaknesses: string[]
  /** Prioritized list of recommended actions */
  actions: StrategicAction[]
  /** Actions explicitly skipped and why */
  skippedActions: Array<{ issueId: string; reason: string }>
  /** Overall confidence in the plan */
  confidence: 'high' | 'medium' | 'low'
  /** Strategic reasoning summary */
  strategicReasoning: string
  /** Recommended focus area for this run */
  focusArea: 'technical-seo' | 'content' | 'user-experience' | 'authority' | 'balanced'
}

/**
 * System prompt for the SEO strategist
 */
const STRATEGIST_PROMPT = `You are a senior SEO strategist with 15+ years of experience optimizing websites for search engines. You think deeply about SEO strategy, not just tactical fixes.

Your role is to analyze the complete SEO context and create a strategic action plan.

## Your Approach

1. **Analyze Before Acting**: Review all data thoroughly before making recommendations
2. **Think Holistically**: Consider how different SEO elements interact
3. **Prioritize by Impact**: Focus on changes that will move the needle
4. **Consider Timing**: Some changes need time to measure; don't change too many things at once
5. **Learn from History**: Past change impacts should inform future decisions

## Key Principles

- **Don't fix everything at once**: Pick 3-5 high-impact actions per run
- **Preserve what's working**: If something ranks well, be cautious about changing it
- **Content quality > quantity**: One great article beats five mediocre ones
- **Technical foundation first**: Fix critical technical issues before focusing on content
- **Data-driven decisions**: Use metrics to validate or adjust strategy

## What You Should Consider

1. **Current Performance**
   - Traffic trends (growing, declining, flat?)
   - Top performing pages and queries
   - CTR and position patterns

2. **Issue Severity vs. Effort**
   - Critical issues blocking indexing → fix immediately
   - Quick wins (high impact, low effort) → prioritize
   - Complex issues → may need investigation first

3. **Content Strategy**
   - When was content last published?
   - What topics are already covered?
   - What gaps exist based on keywords?

4. **Historical Impact**
   - Which past changes improved metrics?
   - Which had no effect or negative effect?
   - What patterns emerge?

## Output Format

Provide your strategic plan as a JSON object matching the StrategicPlan interface:
{
  "overallAssessment": "2-3 sentence summary of SEO health",
  "keyInsights": ["insight 1", "insight 2", "insight 3"],
  "strengths": ["what's working"],
  "weaknesses": ["what needs work"],
  "actions": [
    {
      "type": "fix-issue" | "generate-content" | "defer" | "investigate" | "skip",
      "priority": 1,
      "issueId": "issue-id (for fixes)",
      "topic": "topic (for content)",
      "keyword": "keyword (for content)",
      "expectedImpact": "what this should achieve",
      "reasoning": "why this action, why this priority",
      "effort": "low" | "medium" | "high",
      "confidence": "high" | "medium" | "low"
    }
  ],
  "skippedActions": [
    {"issueId": "id", "reason": "why skipping this"}
  ],
  "confidence": "high" | "medium" | "low",
  "strategicReasoning": "Overall strategic thinking behind this plan",
  "focusArea": "technical-seo" | "content" | "user-experience" | "authority" | "balanced"
}

IMPORTANT: Return ONLY valid JSON, no markdown code blocks.
IMPORTANT: Limit actions to 5-7 maximum per run. Quality over quantity.
IMPORTANT: Always include reasoning - explain WHY, not just WHAT.`

/**
 * SEO Strategist that creates intelligent action plans
 */
export class SEOStrategist {
  constructor(private readonly ai: AIClient) {}

  /**
   * Analyze the full SEO context and create a strategic action plan
   *
   * This is the "thinking" phase that happens before any SEO actions are taken.
   * It considers all available data and creates a prioritized, reasoned plan.
   *
   * @param context - Full context for strategic analysis
   * @returns Strategic plan with prioritized actions and reasoning
   */
  async createPlan(context: StrategyContext): Promise<StrategicPlan> {
    // Build the context message for Claude
    const contextMessage = this.buildContextMessage(context)

    const response = await this.ai.chat(
      STRATEGIST_PROMPT,
      [
        {
          role: 'user',
          content: contextMessage,
        },
      ],
      {
        temperature: 0.4, // Slightly creative but still analytical
        maxTokens: 4096,
      }
    )

    return this.parseStrategicPlan(response)
  }

  /**
   * Build a comprehensive context message for the strategist
   */
  private buildContextMessage(context: StrategyContext): string {
    const {
      profile,
      issues,
      recentMetrics,
      pastChanges,
      settings,
      daysSinceLastContent,
      existingContentCount,
    } = context

    // Summarize metrics trends
    const metricsSummary = this.summarizeMetrics(recentMetrics)

    // Summarize past changes and their impact
    const changesSummary = this.summarizeChanges(pastChanges)

    // Categorize issues
    const issuesSummary = this.summarizeIssues(issues)

    return `## Repository Context

**Framework**: ${profile.framework}
**Total Pages**: ${profile.pages.length}
**Content Directory**: ${profile.structure.contentDir ?? 'Not detected'}
**Has Sitemap**: ${profile.seoPatterns.existingSitemap ? 'Yes' : 'No'}
**Has Robots.txt**: ${profile.seoPatterns.existingRobots ? 'Yes' : 'No'}
**Has Structured Data**: ${profile.seoPatterns.existingSchema.length > 0 ? 'Yes' : 'No'}

## Content Settings

**Tone**: ${settings.tone}
**Target Topics**: ${settings.topics.join(', ')}
**Content Frequency**: ${settings.contentFrequency}
**Days Since Last Content**: ${daysSinceLastContent ?? 'Never published'}
**Existing Posts**: ${existingContentCount}
**Custom Instructions**: ${settings.customInstructions ?? 'None'}

## Performance Metrics (Recent)

${metricsSummary}

## Past Changes & Impact

${changesSummary}

## Current SEO Issues

${issuesSummary}

## Full Issue List

${JSON.stringify(issues, null, 2)}

---

Analyze this context and create a strategic action plan. Think carefully about:
1. What's the most impactful thing we can do right now?
2. What should we explicitly NOT do and why?
3. What's the overall strategic direction?

Remember: Quality over quantity. Recommend 5-7 actions maximum.`
  }

  /**
   * Summarize metrics trends
   */
  private summarizeMetrics(metrics: DailyMetrics[]): string {
    if (metrics.length === 0) {
      return 'No metrics data available yet. This may be a new site or Search Console is not connected.'
    }

    const latest = metrics[0]!
    const oldest = metrics[metrics.length - 1]!

    // Calculate trends
    const clicksTrend = metrics.length > 1
      ? ((latest.clicks - oldest.clicks) / Math.max(oldest.clicks, 1)) * 100
      : 0
    const impressionsTrend = metrics.length > 1
      ? ((latest.impressions - oldest.impressions) / Math.max(oldest.impressions, 1)) * 100
      : 0

    // Get top pages
    const topPages = latest.pages
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 5)
      .map((p) => `- ${p.page}: ${p.clicks} clicks, pos ${p.position.toFixed(1)}`)
      .join('\n')

    // Get top queries
    const topQueries = latest.queries
      .sort((a, b) => b.impressions - a.impressions)
      .slice(0, 5)
      .map((q) => `- "${q.query}": ${q.impressions} impr, ${q.clicks} clicks, pos ${q.position.toFixed(1)}`)
      .join('\n')

    return `**Period**: ${metrics.length} days of data
**Latest Metrics**: ${latest.clicks} clicks, ${latest.impressions} impressions, ${(latest.ctr * 100).toFixed(2)}% CTR, pos ${latest.position.toFixed(1)}
**Clicks Trend**: ${clicksTrend > 0 ? '+' : ''}${clicksTrend.toFixed(1)}%
**Impressions Trend**: ${impressionsTrend > 0 ? '+' : ''}${impressionsTrend.toFixed(1)}%

**Top Pages**:
${topPages || 'No page data'}

**Top Queries**:
${topQueries || 'No query data'}`
  }

  /**
   * Summarize past changes and their measured impact
   */
  private summarizeChanges(changes: Change[]): string {
    if (changes.length === 0) {
      return 'No previous changes recorded. This appears to be the first optimization run.'
    }

    const withImpact = changes.filter((c) => c.measuredImpact)
    const pending = changes.filter((c) => !c.measuredImpact)

    let summary = `**Total Changes**: ${changes.length}
**Measured**: ${withImpact.length}
**Pending Measurement**: ${pending.length}

`

    if (withImpact.length > 0) {
      summary += '**Impact Summary**:\n'

      // Group by type and calculate average impact
      const byType = new Map<string, { count: number; totalImpact: number }>()

      for (const change of withImpact) {
        const impact = change.measuredImpact as MeasuredImpact
        const clicksChange = impact.clicksAfter - impact.clicksBefore
        const current = byType.get(change.type) || { count: 0, totalImpact: 0 }
        current.count++
        current.totalImpact += clicksChange
        byType.set(change.type, current)
      }

      for (const [type, data] of byType) {
        const avgImpact = data.totalImpact / data.count
        summary += `- ${type}: ${data.count} changes, avg ${avgImpact > 0 ? '+' : ''}${avgImpact.toFixed(1)} clicks\n`
      }

      // Highlight best and worst
      const sorted = withImpact.sort((a, b) => {
        const impactA = (a.measuredImpact as MeasuredImpact).clicksAfter - (a.measuredImpact as MeasuredImpact).clicksBefore
        const impactB = (b.measuredImpact as MeasuredImpact).clicksAfter - (b.measuredImpact as MeasuredImpact).clicksBefore
        return impactB - impactA
      })

      if (sorted.length > 0) {
        const best = sorted[0]!
        const bestImpact = (best.measuredImpact as MeasuredImpact).clicksAfter - (best.measuredImpact as MeasuredImpact).clicksBefore
        summary += `\n**Best Performing Change**: ${best.description} (${bestImpact > 0 ? '+' : ''}${bestImpact} clicks)`
      }
    }

    return summary
  }

  /**
   * Summarize issues by category and severity
   */
  private summarizeIssues(issues: SEOIssue[]): string {
    const critical = issues.filter((i) => i.severity === 'critical')
    const warnings = issues.filter((i) => i.severity === 'warning')
    const info = issues.filter((i) => i.severity === 'info')
    const autoFixable = issues.filter((i) => i.autoFixable)

    // Group by type
    const byType = new Map<string, number>()
    for (const issue of issues) {
      byType.set(issue.type, (byType.get(issue.type) || 0) + 1)
    }

    const typeBreakdown = Array.from(byType.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([type, count]) => `- ${type}: ${count}`)
      .join('\n')

    return `**Total Issues**: ${issues.length}
**By Severity**: ${critical.length} critical, ${warnings.length} warnings, ${info.length} info
**Auto-fixable**: ${autoFixable.length}

**By Type**:
${typeBreakdown}`
  }

  /**
   * Parse the strategic plan from Claude's response
   */
  private parseStrategicPlan(response: string): StrategicPlan {
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
      return JSON.parse(cleaned) as StrategicPlan
    } catch (error) {
      const parseError = error as Error
      throw new Error(
        `Failed to parse strategic plan as JSON: ${parseError.message}\nResponse: ${cleaned.slice(0, 500)}`
      )
    }
  }
}

/**
 * Create a new SEO Strategist instance
 */
export function createStrategist(ai: AIClient): SEOStrategist {
  return new SEOStrategist(ai)
}
