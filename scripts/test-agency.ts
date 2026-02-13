#!/usr/bin/env npx ts-node
/**
 * Test script for the SEO Agency
 *
 * This script tests the agency's research and planning capabilities
 * without making any actual changes to repositories.
 *
 * Usage:
 *   npx ts-node scripts/test-agency.ts
 *
 * Environment:
 *   Requires ANTHROPIC_API_KEY or CLAUDE_CODE_OAUTH_TOKEN
 */

import { AIClient } from '../src/ai'
import { SEOAgency } from '../src/agency'
import type { CodebaseProfile, SEOIssue, RepoSettings } from '../src/types'

// Mock data for testing
const mockProfile: CodebaseProfile = {
  repoId: 'test-repo',
  scannedAt: new Date(),
  commitHash: 'abc123',
  framework: 'nextjs-app',
  structure: {
    pagesDir: 'app',
    componentsDir: 'components',
    publicDir: 'public',
    contentDir: 'content/blog',
    layoutFiles: ['app/layout.tsx'],
    configFiles: ['next.config.js'],
  },
  seoPatterns: {
    metaHandling: 'metadata-export',
    existingSitemap: null,
    existingRobots: null,
    existingSchema: [],
    hasOgImages: false,
    hasFavicon: true,
  },
  buildSystem: {
    packageManager: 'npm',
    buildCommand: 'npm run build',
    devCommand: 'npm run dev',
    outDir: '.next',
  },
  pages: [
    {
      path: '/',
      filePath: 'app/page.tsx',
      title: 'Home - My SaaS',
      description: 'Welcome to My SaaS',
      hasOgImage: false,
      hasSchema: false,
      images: [],
      internalLinks: ['/about', '/pricing'],
      wordCount: 500,
      lastModified: new Date(),
    },
    {
      path: '/about',
      filePath: 'app/about/page.tsx',
      title: 'About Us',
      hasOgImage: false,
      hasSchema: false,
      images: [],
      internalLinks: ['/'],
      wordCount: 300,
      lastModified: new Date(),
    },
    {
      path: '/pricing',
      filePath: 'app/pricing/page.tsx',
      title: 'Pricing',
      hasOgImage: false,
      hasSchema: false,
      images: [],
      internalLinks: ['/'],
      wordCount: 200,
      lastModified: new Date(),
    },
  ],
  safeZones: ['content/', 'public/'],
  dangerZones: ['app/api/', 'lib/'],
}

const mockIssues: SEOIssue[] = [
  {
    id: 'missing-sitemap',
    type: 'missing-sitemap',
    severity: 'critical',
    description: 'No sitemap.xml found',
    recommendation: 'Generate a sitemap.xml in the public directory',
    autoFixable: true,
  },
  {
    id: 'missing-robots',
    type: 'missing-robots',
    severity: 'critical',
    description: 'No robots.txt found',
    recommendation: 'Create a robots.txt file',
    autoFixable: true,
  },
  {
    id: 'missing-og-home',
    type: 'missing-og-tags',
    severity: 'warning',
    page: '/',
    file: 'app/page.tsx',
    description: 'Homepage missing Open Graph tags',
    recommendation: 'Add og:title, og:description, og:image',
    autoFixable: true,
  },
  {
    id: 'thin-content-about',
    type: 'thin-content',
    severity: 'warning',
    page: '/about',
    file: 'app/about/page.tsx',
    description: 'About page has only 300 words',
    recommendation: 'Expand content to at least 500 words',
    autoFixable: false,
  },
]

const mockSettings: RepoSettings = {
  contentFrequency: 'weekly',
  tone: 'professional',
  topics: ['SaaS', 'productivity', 'startup'],
  maxBlogsPerWeek: 2,
  maxImagesPerDay: 5,
  excludePaths: ['node_modules/', '.next/'],
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗')
  console.log('║              SEO AGENCY TEST - DRY RUN                      ║')
  console.log('╚════════════════════════════════════════════════════════════╝')
  console.log('')

  // Check for API credentials
  const hasApiKey = !!process.env['ANTHROPIC_API_KEY']
  const hasOAuthToken = !!process.env['CLAUDE_CODE_OAUTH_TOKEN']

  if (!hasApiKey && !hasOAuthToken) {
    console.error('ERROR: No API credentials found.')
    console.error('Set either ANTHROPIC_API_KEY or CLAUDE_CODE_OAUTH_TOKEN')
    process.exit(1)
  }

  console.log(`[auth] Using ${hasApiKey ? 'API Key' : 'OAuth Token'}`)
  console.log('')

  // Initialize AI and Agency
  console.log('[init] Initializing AI Client...')
  const ai = new AIClient()

  console.log('[init] Initializing SEO Agency...')
  const agency = new SEOAgency(ai, {
    enableKeywordResearch: true,
    enableCompetitorAnalysis: true,
    enableContentGapAnalysis: true,
  })

  console.log('')
  console.log('┌────────────────────────────────────────────────────────────┐')
  console.log('│                    RUNNING AGENCY TEST                      │')
  console.log('└────────────────────────────────────────────────────────────┘')
  console.log('')

  const startTime = Date.now()

  try {
    const plan = await agency.createStrategicPlan({
      profile: mockProfile,
      issues: mockIssues,
      recentMetrics: [], // No metrics for test
      pastChanges: [], // No past changes
      settings: mockSettings,
      daysSinceLastContent: null, // Never published
      existingContentCount: 0,
    })

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)

    console.log('')
    console.log('╔════════════════════════════════════════════════════════════╗')
    console.log('║                    STRATEGIC PLAN RESULTS                   ║')
    console.log('╚════════════════════════════════════════════════════════════╝')
    console.log('')
    console.log(`Duration: ${elapsed}s`)
    console.log('')
    console.log('─── ASSESSMENT ───')
    console.log(plan.overallAssessment)
    console.log('')
    console.log(`Maturity Level: ${plan.maturityLevel}`)
    console.log(`Focus Area: ${plan.focusArea}`)
    console.log(`Confidence: ${plan.confidence}`)
    console.log('')
    console.log('─── SWOT ───')
    console.log('Strengths:', plan.strengths.join(', '))
    console.log('Weaknesses:', plan.weaknesses.join(', '))
    console.log('Opportunities:', plan.opportunities.join(', '))
    console.log('Threats:', plan.threats.join(', '))
    console.log('')
    console.log('─── KEY INSIGHTS ───')
    for (const insight of plan.keyInsights) {
      console.log(`  • ${insight}`)
    }
    console.log('')
    console.log('─── ACTIONS ───')
    for (const action of plan.actions) {
      console.log(`  [${action.priority}] ${action.type.toUpperCase()}`)
      console.log(`      Executor: ${action.executor}`)
      console.log(`      Reasoning: ${action.reasoning}`)
      console.log(`      Expected Impact: ${action.expectedImpact}`)
      console.log(`      Effort: ${action.effort}, Confidence: ${action.confidence}`)
      if (action.content) {
        console.log(`      Content: "${action.content.topic}" (${action.content.keyword})`)
      }
      console.log('')
    }
    console.log('─── DEFERRED ───')
    for (const deferred of plan.deferredActions) {
      console.log(`  ⏸ ${deferred.description}`)
      console.log(`      Reason: ${deferred.reason}`)
    }
    console.log('')
    console.log('─── GOALS ───')
    console.log('30-Day:')
    for (const goal of plan.shortTermGoals) {
      console.log(`  → ${goal}`)
    }
    console.log('90-Day:')
    for (const goal of plan.mediumTermGoals) {
      console.log(`  → ${goal}`)
    }
    console.log('')
    console.log('─── STRATEGIC NARRATIVE ───')
    console.log(plan.strategicNarrative)
    console.log('')
    console.log('╔════════════════════════════════════════════════════════════╗')
    console.log('║                      TEST COMPLETED                         ║')
    console.log('╚════════════════════════════════════════════════════════════╝')
  } catch (error) {
    const errMessage = error instanceof Error ? error.message : String(error)
    console.error('')
    console.error('╔════════════════════════════════════════════════════════════╗')
    console.error('║                       TEST FAILED                           ║')
    console.error('╚════════════════════════════════════════════════════════════╝')
    console.error('')
    console.error(`Error: ${errMessage}`)
    if (error instanceof Error && error.stack) {
      console.error('')
      console.error('Stack trace:')
      console.error(error.stack)
    }
    process.exit(1)
  }
}

main()
