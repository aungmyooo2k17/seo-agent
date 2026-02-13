/**
 * Types for the SEO Agency - Runtime AI Team
 */

import type {
  CodebaseProfile,
  SEOIssue,
  DailyMetrics,
  Change,
  RepoSettings,
} from '../types'

// =============================================================================
// Research Data Types
// =============================================================================

/**
 * Keyword opportunity identified by the Keyword Researcher
 */
export interface KeywordOpportunity {
  /** The keyword phrase */
  keyword: string
  /** Estimated monthly search volume */
  searchVolume: number
  /** Difficulty score (0-100) */
  difficulty: number
  /** Current ranking position (null if not ranking) */
  currentPosition: number | null
  /** Search intent type */
  intent: 'informational' | 'navigational' | 'transactional' | 'commercial'
  /** Opportunity score (calculated) */
  opportunityScore: number
  /** Why this keyword is an opportunity */
  reasoning: string
}

/**
 * Competitor analysis data
 */
export interface CompetitorAnalysis {
  /** Competitor domain */
  domain: string
  /** Keywords they rank for that we don't */
  keywordGaps: string[]
  /** Their top-performing content */
  topContent: CompetitorContent[]
  /** Estimated monthly traffic */
  estimatedTraffic: number
  /** Domain authority (if available) */
  domainAuthority?: number
  /** Key strengths we can learn from */
  strengths: string[]
  /** Weaknesses we can exploit */
  weaknesses: string[]
}

/**
 * Competitor content analysis
 */
export interface CompetitorContent {
  /** URL of the content */
  url: string
  /** Title */
  title: string
  /** Primary keyword */
  primaryKeyword: string
  /** Estimated word count */
  wordCount: number
  /** Content type */
  contentType: 'blog' | 'landing' | 'product' | 'guide' | 'tool'
  /** What makes it rank well */
  rankingFactors: string[]
}

/**
 * Content gap analysis
 */
export interface ContentGap {
  /** Topic or keyword cluster */
  topic: string
  /** Keywords in this gap */
  keywords: string[]
  /** Combined search volume */
  totalVolume: number
  /** Priority level */
  priority: 'high' | 'medium' | 'low'
  /** Suggested content type */
  suggestedContentType: 'pillar' | 'cluster' | 'support'
  /** Reasoning for this gap */
  reasoning: string
}

// =============================================================================
// Agency Context Types
// =============================================================================

/**
 * Full context provided to the SEO Director for strategic planning
 */
export interface AgencyContext {
  /** Current codebase profile */
  profile: CodebaseProfile
  /** All detected SEO issues */
  issues: SEOIssue[]
  /** Recent performance metrics */
  recentMetrics: DailyMetrics[]
  /** Past changes and their impact */
  pastChanges: Change[]
  /** Repository settings */
  settings: RepoSettings
  /** Days since last content published */
  daysSinceLastContent: number | null
  /** Existing content count */
  existingContentCount: number

  // Research data (from research agents)
  /** Keyword opportunities */
  keywordOpportunities?: KeywordOpportunity[] | undefined
  /** Competitor analysis */
  competitorAnalysis?: CompetitorAnalysis[] | undefined
  /** Content gaps */
  contentGaps?: ContentGap[] | undefined
}

// =============================================================================
// Strategic Plan Types (Enhanced)
// =============================================================================

/**
 * Action executor assignment
 */
export type ActionExecutor =
  | 'technical-auditor'
  | 'content-writer'
  | 'link-optimizer'
  | 'manual'

/**
 * Strategic action with executor assignment
 */
export interface AgencyAction {
  /** Unique action ID */
  id: string
  /** Type of action */
  type: 'fix-issue' | 'create-content' | 'optimize-links' | 'investigate' | 'defer'
  /** Which agent should execute this */
  executor: ActionExecutor
  /** Priority (1 = highest) */
  priority: number
  /** Related issue ID (for fixes) */
  issueId?: string
  /** Content details (for content creation) */
  content?: {
    topic: string
    keyword: string
    contentType: 'blog' | 'landing' | 'guide'
    targetWordCount: number
  }
  /** Expected impact */
  expectedImpact: string
  /** Reasoning for this action */
  reasoning: string
  /** Effort level */
  effort: 'low' | 'medium' | 'high'
  /** Confidence level */
  confidence: 'high' | 'medium' | 'low'
  /** Dependencies (action IDs that must complete first) */
  dependsOn?: string[]
}

/**
 * Comprehensive strategic plan from SEO Director
 */
export interface AgencyPlan {
  /** Plan creation timestamp */
  createdAt: Date
  /** Overall SEO health assessment */
  overallAssessment: string
  /** Current SEO maturity level */
  maturityLevel: 'foundation' | 'growth' | 'optimization' | 'dominance'
  /** Key insights from all research */
  keyInsights: string[]
  /** Competitive position assessment */
  competitivePosition: string
  /** Strengths to leverage */
  strengths: string[]
  /** Weaknesses to address */
  weaknesses: string[]
  /** Opportunities identified */
  opportunities: string[]
  /** Threats to watch */
  threats: string[]
  /** Recommended focus area */
  focusArea: 'technical' | 'content' | 'authority' | 'user-experience' | 'balanced'
  /** Prioritized action plan */
  actions: AgencyAction[]
  /** Actions explicitly not taking and why */
  deferredActions: Array<{ description: string; reason: string }>
  /** 30-day goals */
  shortTermGoals: string[]
  /** 90-day goals */
  mediumTermGoals: string[]
  /** Overall confidence in the plan */
  confidence: 'high' | 'medium' | 'low'
  /** Strategic reasoning summary */
  strategicNarrative: string
}

// =============================================================================
// Agent Interfaces
// =============================================================================

/**
 * Base interface for all agency agents
 */
export interface IAgencyAgent {
  /** Agent name/role */
  readonly name: string
  /** Agent description */
  readonly description: string
}

/**
 * Research agent that gathers intelligence
 */
export interface IResearchAgent extends IAgencyAgent {
  /** Perform research and return findings */
  research(context: Partial<AgencyContext>): Promise<unknown>
}

/**
 * Execution agent that implements actions
 */
export interface IExecutionAgent extends IAgencyAgent {
  /** Execute an action from the plan */
  execute(action: AgencyAction, context: AgencyContext): Promise<void>
}

/**
 * The SEO Director that coordinates everything
 */
export interface ISEODirector extends IAgencyAgent {
  /** Create a comprehensive strategic plan */
  createPlan(context: AgencyContext): Promise<AgencyPlan>
}
