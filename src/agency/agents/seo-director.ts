/**
 * SEO Director Agent
 *
 * The strategic leader of the SEO Agency.
 * Synthesizes research from all agents and creates comprehensive action plans.
 * Acts like a senior SEO director at a top agency.
 */

import type { AIClient } from '../../ai/client'
import type { MeasuredImpact, DailyMetrics, Change } from '../../types'
import type { AgencyContext, AgencyPlan, ISEODirector } from '../types'

const SEO_DIRECTOR_PROMPT = `You are the SEO Director at a top-tier SEO agency. You have 15+ years of experience leading SEO strategy for major brands.

You've just received research from your team:
- Keyword Researcher: Found keyword opportunities
- Competitor Analyst: Analyzed the competitive landscape
- Technical Auditor: Identified technical SEO issues

Your job is to synthesize all this information and create a comprehensive strategic plan.

## Your Leadership Style

1. **Data-Driven**: Every recommendation backed by research
2. **Strategic**: Focus on high-impact actions, not busywork
3. **Realistic**: Set achievable goals with clear timelines
4. **Prioritized**: Can't do everything; pick the battles that matter
5. **Accountable**: Clear ownership for every action

## SWOT Analysis

Assess the site's:
- **Strengths**: What advantages does this site have?
- **Weaknesses**: What's holding it back?
- **Opportunities**: What untapped potential exists?
- **Threats**: What risks should we monitor?

## Maturity Assessment

Classify the site's SEO maturity:
- **foundation**: Basic SEO not in place; focus on fundamentals
- **growth**: Fundamentals solid; focus on content and visibility
- **optimization**: Good performance; focus on incremental gains
- **dominance**: Category leader; focus on defending position

## Action Planning

For each action:
1. Assign to the right executor (technical-auditor, content-writer, link-optimizer, manual)
2. Set priority based on impact vs. effort
3. Explain the reasoning (why this, why now)
4. Define dependencies (what must happen first)
5. Set realistic expectations for impact

## Output Format

Return a JSON AgencyPlan object:
{
  "createdAt": "ISO date string",
  "overallAssessment": "2-3 sentence summary",
  "maturityLevel": "foundation|growth|optimization|dominance",
  "keyInsights": ["insight 1", "insight 2"],
  "competitivePosition": "How we compare to competitors",
  "strengths": ["strength 1"],
  "weaknesses": ["weakness 1"],
  "opportunities": ["opportunity 1"],
  "threats": ["threat 1"],
  "focusArea": "technical|content|authority|user-experience|balanced",
  "actions": [
    {
      "id": "action-1",
      "type": "fix-issue|create-content|optimize-links|investigate|defer",
      "executor": "technical-auditor|content-writer|link-optimizer|manual",
      "priority": 1,
      "issueId": "issue-id (if fixing)",
      "content": {
        "topic": "topic",
        "keyword": "target keyword",
        "contentType": "blog|landing|guide",
        "targetWordCount": 2000
      },
      "expectedImpact": "What we expect to achieve",
      "reasoning": "Why this action matters",
      "effort": "low|medium|high",
      "confidence": "high|medium|low",
      "dependsOn": ["action-id"]
    }
  ],
  "deferredActions": [
    {"description": "what we're not doing", "reason": "why"}
  ],
  "shortTermGoals": ["30-day goals"],
  "mediumTermGoals": ["90-day goals"],
  "confidence": "high|medium|low",
  "strategicNarrative": "Overall strategic story - what we're doing and why"
}

IMPORTANT: Return ONLY valid JSON, no markdown code blocks.
IMPORTANT: Limit actions to 5-10 maximum. Quality over quantity.
IMPORTANT: Every action needs clear reasoning.
IMPORTANT: Be specific and actionable, not generic.`

/**
 * SEO Director Agent
 *
 * Synthesizes research and creates comprehensive strategic plans.
 */
export class SEODirector implements ISEODirector {
  readonly name = 'SEO Director'
  readonly description = 'Strategic leader who creates comprehensive SEO plans'

  constructor(private readonly ai: AIClient) {}

  /**
   * Create a comprehensive strategic plan
   */
  async createPlan(context: AgencyContext): Promise<AgencyPlan> {
    const contextMessage = this.buildContextMessage(context)

    const response = await this.ai.chat(
      SEO_DIRECTOR_PROMPT,
      [
        {
          role: 'user',
          content: contextMessage,
        },
      ],
      {
        temperature: 0.5,
        maxTokens: 8192,
      }
    )

    return this.parseResponse(response)
  }

  /**
   * Build comprehensive context message
   */
  private buildContextMessage(context: AgencyContext): string {
    const {
      profile,
      issues,
      recentMetrics,
      pastChanges,
      settings,
      daysSinceLastContent,
      existingContentCount,
      keywordOpportunities,
      competitorAnalysis,
      contentGaps,
    } = context

    // Build each section
    const siteContext = this.buildSiteContext(profile, settings, existingContentCount, daysSinceLastContent)
    const metricsContext = this.buildMetricsContext(recentMetrics)
    const issuesContext = this.buildIssuesContext(issues)
    const changesContext = this.buildChangesContext(pastChanges)
    const researchContext = this.buildResearchContext(keywordOpportunities, competitorAnalysis, contentGaps)

    return `# SEO Director Briefing

${siteContext}

${metricsContext}

${issuesContext}

${changesContext}

${researchContext}

---

## Your Task

As SEO Director, create a comprehensive strategic plan that:
1. Synthesizes all research into actionable insights
2. Prioritizes the highest-impact actions
3. Assigns clear ownership to each action
4. Sets realistic goals for 30 and 90 days
5. Explains the strategic reasoning

Think like a senior agency director presenting to a client. Be specific, be strategic, be actionable.`
  }

  /**
   * Build site context section
   */
  private buildSiteContext(
    profile: typeof SEODirector.prototype.createPlan extends (ctx: infer C) => unknown
      ? C extends { profile: infer P } ? P : never
      : never,
    settings: typeof SEODirector.prototype.createPlan extends (ctx: infer C) => unknown
      ? C extends { settings: infer S } ? S : never
      : never,
    contentCount: number,
    daysSinceContent: number | null
  ): string {
    return `## Site Overview

**Framework**: ${profile.framework}
**Total Pages**: ${profile.pages.length}
**Published Content**: ${contentCount} pieces
**Days Since Last Content**: ${daysSinceContent ?? 'Never'}
**Target Topics**: ${settings.topics.join(', ')}
**Tone**: ${settings.tone}
**Content Frequency**: ${settings.contentFrequency}

**Technical Status**:
- Sitemap: ${profile.seoPatterns.existingSitemap ? 'Yes' : 'Missing'}
- Robots.txt: ${profile.seoPatterns.existingRobots ? 'Yes' : 'Missing'}
- Structured Data: ${profile.seoPatterns.existingSchema.length > 0 ? 'Yes' : 'Missing'}
- Meta Handling: ${profile.seoPatterns.metaHandling}`
  }

  /**
   * Build metrics context section
   */
  private buildMetricsContext(metrics: DailyMetrics[]): string {
    if (metrics.length === 0) {
      return `## Performance Metrics

No Search Console data available yet. Recommendations will focus on foundational SEO.`
    }

    const latest = metrics[0]!
    const oldest = metrics[metrics.length - 1]!

    const clicksTrend = metrics.length > 1
      ? ((latest.clicks - oldest.clicks) / Math.max(oldest.clicks, 1)) * 100
      : 0
    const impressionsTrend = metrics.length > 1
      ? ((latest.impressions - oldest.impressions) / Math.max(oldest.impressions, 1)) * 100
      : 0

    const topPages = latest.pages
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 5)
      .map((p) => `- ${p.page}: ${p.clicks} clicks, pos ${p.position.toFixed(1)}`)
      .join('\n')

    const topQueries = latest.queries
      .sort((a, b) => b.impressions - a.impressions)
      .slice(0, 5)
      .map((q) => `- "${q.query}": ${q.impressions} impr, ${q.clicks} clicks`)
      .join('\n')

    return `## Performance Metrics (${metrics.length} days)

**Current Performance**:
- Clicks: ${latest.clicks} (${clicksTrend > 0 ? '+' : ''}${clicksTrend.toFixed(1)}% trend)
- Impressions: ${latest.impressions} (${impressionsTrend > 0 ? '+' : ''}${impressionsTrend.toFixed(1)}% trend)
- CTR: ${(latest.ctr * 100).toFixed(2)}%
- Avg Position: ${latest.position.toFixed(1)}

**Top Pages**:
${topPages || 'No page data'}

**Top Queries**:
${topQueries || 'No query data'}`
  }

  /**
   * Build issues context section
   */
  private buildIssuesContext(
    issues: Array<{ id: string; type: string; severity: string; description: string; autoFixable: boolean }>
  ): string {
    const critical = issues.filter((i) => i.severity === 'critical')
    const warnings = issues.filter((i) => i.severity === 'warning')
    const autoFixable = issues.filter((i) => i.autoFixable)

    const issuesList = issues
      .slice(0, 15)
      .map((i) => `- [${i.severity.toUpperCase()}] ${i.type}: ${i.description.slice(0, 100)}`)
      .join('\n')

    return `## Technical Issues

**Summary**: ${issues.length} total (${critical.length} critical, ${warnings.length} warnings)
**Auto-fixable**: ${autoFixable.length}

**Top Issues**:
${issuesList}`
  }

  /**
   * Build changes context section
   */
  private buildChangesContext(changes: Change[]): string {
    if (changes.length === 0) {
      return `## Past Changes

No previous changes recorded. This appears to be the first optimization run.`
    }

    const withImpact = changes.filter((c) => c.measuredImpact)
    const pending = changes.filter((c) => !c.measuredImpact)

    let summary = `## Past Changes

**Total**: ${changes.length} changes
**Measured Impact**: ${withImpact.length}
**Pending Measurement**: ${pending.length}

`

    if (withImpact.length > 0) {
      const impactSummary = withImpact
        .slice(0, 5)
        .map((c) => {
          const impact = c.measuredImpact as MeasuredImpact
          const clicksChange = impact.clicksAfter - impact.clicksBefore
          return `- ${c.type}: ${clicksChange > 0 ? '+' : ''}${clicksChange} clicks`
        })
        .join('\n')

      summary += `**Recent Impact**:\n${impactSummary}`
    }

    return summary
  }

  /**
   * Build research context section
   */
  private buildResearchContext(
    keywords?: Array<{ keyword: string; searchVolume: number; opportunityScore: number; reasoning: string }>,
    competitors?: Array<{ domain: string; strengths: string[]; weaknesses: string[] }>,
    gaps?: Array<{ topic: string; keywords: string[]; priority: string }>
  ): string {
    let research = '## Research Findings\n\n'

    // Keyword opportunities
    if (keywords && keywords.length > 0) {
      const topKeywords = keywords
        .slice(0, 10)
        .map((k) => `- "${k.keyword}" (vol: ${k.searchVolume}, score: ${k.opportunityScore})`)
        .join('\n')

      research += `### Keyword Opportunities\n\n${topKeywords}\n\n`
    } else {
      research += `### Keyword Opportunities\n\nNo keyword research available.\n\n`
    }

    // Competitor analysis
    if (competitors && competitors.length > 0) {
      const competitorSummary = competitors
        .slice(0, 3)
        .map((c) => `- **${c.domain}**: Strengths: ${c.strengths.slice(0, 2).join(', ')}; Weaknesses: ${c.weaknesses.slice(0, 2).join(', ')}`)
        .join('\n')

      research += `### Competitive Landscape\n\n${competitorSummary}\n\n`
    } else {
      research += `### Competitive Landscape\n\nNo competitor analysis available.\n\n`
    }

    // Content gaps
    if (gaps && gaps.length > 0) {
      const gapSummary = gaps
        .slice(0, 5)
        .map((g) => `- **${g.topic}** [${g.priority}]: ${g.keywords.slice(0, 3).join(', ')}`)
        .join('\n')

      research += `### Content Gaps\n\n${gapSummary}`
    } else {
      research += `### Content Gaps\n\nNo content gap analysis available.`
    }

    return research
  }

  /**
   * Parse the AI response into AgencyPlan
   */
  private parseResponse(response: string): AgencyPlan {
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
      const plan = JSON.parse(cleaned) as AgencyPlan

      // Ensure createdAt is a Date
      plan.createdAt = new Date()

      return plan
    } catch (error) {
      const parseError = error as Error
      throw new Error(
        `Failed to parse agency plan: ${parseError.message}\nResponse: ${cleaned.slice(0, 500)}`
      )
    }
  }
}

/**
 * Create a new SEO Director agent
 */
export function createSEODirector(ai: AIClient): SEODirector {
  return new SEODirector(ai)
}
