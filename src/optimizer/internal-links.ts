/**
 * Internal link optimizer module
 * Analyzes and suggests internal linking improvements
 */

import type { PageInfo, IAIClient } from '../types';

/**
 * An opportunity to add an internal link
 */
export interface LinkOpportunity {
  /** Source page path */
  sourcePage: string;
  /** Source page file path */
  sourceFile: string;
  /** Target page to link to */
  targetPage: string;
  /** Suggested anchor text */
  anchorText: string;
  /** Context where the link could be added */
  context: string;
  /** Relevance score (0-1) */
  relevance: number;
  /** Reason for the suggestion */
  reason: string;
  /** Priority of this opportunity */
  priority: 'high' | 'medium' | 'low';
}

/**
 * Internal link analysis result
 */
export interface LinkAnalysis {
  /** Total number of internal links */
  totalLinks: number;
  /** Average links per page */
  averageLinksPerPage: number;
  /** Pages with no outgoing links */
  pagesWithNoLinks: PageInfo[];
  /** Orphan pages (no incoming links) */
  orphanPages: PageInfo[];
  /** Most linked pages */
  mostLinkedPages: Array<{ page: string; incomingLinks: number }>;
  /** Pages that could benefit from more links */
  underlinkedPages: PageInfo[];
}

/**
 * Configuration for link optimization
 */
export interface LinkOptimizerConfig {
  /** Minimum links a page should have */
  minLinksPerPage: number;
  /** Maximum relevance score threshold */
  relevanceThreshold: number;
  /** Enable AI-powered suggestions */
  enableAI: boolean;
  /** Maximum suggestions per page */
  maxSuggestionsPerPage: number;
}

const DEFAULT_CONFIG: LinkOptimizerConfig = {
  minLinksPerPage: 3,
  relevanceThreshold: 0.5,
  enableAI: true,
  maxSuggestionsPerPage: 5,
};

/**
 * Optimizes internal linking structure
 */
export class InternalLinkOptimizer {
  private aiClient: IAIClient | null;
  private config: LinkOptimizerConfig;

  constructor(aiClient: IAIClient | null = null, config: Partial<LinkOptimizerConfig> = {}) {
    this.aiClient = aiClient;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Analyze internal linking structure
   *
   * @param pages - Array of page information
   * @returns Link analysis results
   */
  analyze(pages: PageInfo[]): LinkAnalysis {
    // Count incoming links for each page
    const incomingLinks = new Map<string, number>();
    for (const page of pages) {
      incomingLinks.set(page.path, 0);
    }

    // Count links
    let totalLinks = 0;
    for (const page of pages) {
      for (const link of page.internalLinks) {
        totalLinks++;
        const current = incomingLinks.get(link) || 0;
        incomingLinks.set(link, current + 1);
      }
    }

    // Find pages with no outgoing links
    const pagesWithNoLinks = pages.filter(
      (p) => p.internalLinks.length === 0 && p.path !== '/'
    );

    // Find orphan pages (no incoming links except home)
    const orphanPages = pages.filter(
      (p) => (incomingLinks.get(p.path) || 0) === 0 && p.path !== '/'
    );

    // Find most linked pages
    const mostLinkedPages = Array.from(incomingLinks.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([page, count]) => ({ page, incomingLinks: count }));

    // Find underlinked pages
    const underlinkedPages = pages.filter(
      (p) => p.internalLinks.length < this.config.minLinksPerPage && p.path !== '/'
    );

    return {
      totalLinks,
      averageLinksPerPage: pages.length > 0 ? totalLinks / pages.length : 0,
      pagesWithNoLinks,
      orphanPages,
      mostLinkedPages,
      underlinkedPages,
    };
  }

  /**
   * Find opportunities for new internal links
   *
   * @param pages - Array of page information
   * @returns Array of link opportunities
   */
  async findOpportunities(pages: PageInfo[]): Promise<LinkOpportunity[]> {
    const opportunities: LinkOpportunity[] = [];

    // Rule-based opportunities
    const ruleBasedOpps = this.findRuleBasedOpportunities(pages);
    opportunities.push(...ruleBasedOpps);

    // AI-powered suggestions
    if (this.config.enableAI && this.aiClient) {
      const aiOpps = await this.findAIOpportunities(pages);
      opportunities.push(...aiOpps);
    }

    // Deduplicate and sort by priority and relevance
    const deduped = this.deduplicateOpportunities(opportunities);
    return deduped.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return b.relevance - a.relevance;
    });
  }

  /**
   * Find rule-based link opportunities
   */
  private findRuleBasedOpportunities(pages: PageInfo[]): LinkOpportunity[] {
    const opportunities: LinkOpportunity[] = [];

    // Build keyword/topic map from page titles
    const topicMap = this.buildTopicMap(pages);

    for (const page of pages) {
      // Skip if page already has many links
      if (page.internalLinks.length >= this.config.minLinksPerPage * 2) {
        continue;
      }

      // Find related pages based on path similarity
      const relatedByPath = this.findRelatedByPath(page, pages);
      for (const related of relatedByPath) {
        if (!page.internalLinks.includes(related.path)) {
          opportunities.push({
            sourcePage: page.path,
            sourceFile: page.filePath,
            targetPage: related.path,
            anchorText: related.title || this.pathToTitle(related.path),
            context: 'Related content based on URL structure',
            relevance: 0.7,
            reason: 'Pages share similar URL path structure',
            priority: 'medium',
          });
        }
      }

      // Find related pages based on title/topic similarity
      const relatedByTopic = this.findRelatedByTopic(page, topicMap, pages);
      for (const related of relatedByTopic) {
        if (!page.internalLinks.includes(related.path)) {
          opportunities.push({
            sourcePage: page.path,
            sourceFile: page.filePath,
            targetPage: related.path,
            anchorText: related.title || this.pathToTitle(related.path),
            context: 'Topically related content',
            relevance: 0.8,
            reason: 'Pages cover related topics',
            priority: 'high',
          });
        }
      }

      // Suggest linking to orphan pages
      const orphans = pages.filter((p) => {
        const hasIncoming = pages.some((other) => other.internalLinks.includes(p.path));
        return !hasIncoming && p.path !== '/' && p.path !== page.path;
      });

      for (const orphan of orphans.slice(0, 2)) {
        if (!page.internalLinks.includes(orphan.path)) {
          opportunities.push({
            sourcePage: page.path,
            sourceFile: page.filePath,
            targetPage: orphan.path,
            anchorText: orphan.title || this.pathToTitle(orphan.path),
            context: 'Help search engines discover this orphan page',
            relevance: 0.6,
            reason: 'Orphan page needs incoming links for discoverability',
            priority: 'high',
          });
        }
      }
    }

    return opportunities;
  }

  /**
   * Find AI-powered link opportunities
   */
  private async findAIOpportunities(pages: PageInfo[]): Promise<LinkOpportunity[]> {
    if (!this.aiClient) return [];

    const opportunities: LinkOpportunity[] = [];

    // Find pages that need more links
    const needsLinks = pages.filter(
      (p) => p.internalLinks.length < this.config.minLinksPerPage
    );

    for (const page of needsLinks.slice(0, 10)) {
      try {
        const suggestions = await this.getAISuggestions(page, pages);
        opportunities.push(...suggestions);
      } catch (error) {
        console.warn(`AI link suggestion failed for ${page.path}:`, error);
      }
    }

    return opportunities;
  }

  /**
   * Get AI-powered link suggestions for a page
   */
  private async getAISuggestions(
    page: PageInfo,
    allPages: PageInfo[]
  ): Promise<LinkOpportunity[]> {
    if (!this.aiClient) return [];

    const otherPages = allPages
      .filter((p) => p.path !== page.path && !page.internalLinks.includes(p.path))
      .slice(0, 20)
      .map((p) => ({
        path: p.path,
        title: p.title,
        description: p.description,
      }));

    const prompt = `Analyze this page and suggest internal link opportunities:

Source Page:
- Path: ${page.path}
- Title: ${page.title || 'Unknown'}
- Description: ${page.description || 'Unknown'}
- Current links: ${page.internalLinks.join(', ') || 'None'}

Available pages to link to:
${otherPages.map((p) => `- ${p.path}: ${p.title || 'Untitled'}`).join('\n')}

Suggest up to ${this.config.maxSuggestionsPerPage} internal links that would be valuable.

For each suggestion, respond in JSON format:
[
  {
    "targetPage": "/path",
    "anchorText": "suggested anchor text",
    "reason": "why this link is valuable"
  }
]`;

    const response = await this.aiClient.chat(
      'You are an SEO expert specializing in internal linking strategy.',
      [{ role: 'user', content: prompt }],
      { temperature: 0.3, maxTokens: 500 }
    );

    try {
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (!jsonMatch) return [];

      const suggestions = JSON.parse(jsonMatch[0]) as Array<{
        targetPage: string;
        anchorText: string;
        reason: string;
      }>;

      return suggestions.map((s) => ({
        sourcePage: page.path,
        sourceFile: page.filePath,
        targetPage: s.targetPage,
        anchorText: s.anchorText,
        context: 'AI-suggested contextual link',
        relevance: 0.85,
        reason: s.reason,
        priority: 'medium' as const,
      }));
    } catch {
      return [];
    }
  }

  /**
   * Build a map of topics/keywords to pages
   */
  private buildTopicMap(pages: PageInfo[]): Map<string, PageInfo[]> {
    const topicMap = new Map<string, PageInfo[]>();

    for (const page of pages) {
      // Extract keywords from title and path
      const keywords = this.extractKeywords(page);

      for (const keyword of keywords) {
        const existing = topicMap.get(keyword) || [];
        existing.push(page);
        topicMap.set(keyword, existing);
      }
    }

    return topicMap;
  }

  /**
   * Extract keywords from a page
   */
  private extractKeywords(page: PageInfo): string[] {
    const keywords: string[] = [];

    // From path
    const pathParts = page.path.split('/').filter(Boolean);
    for (const part of pathParts) {
      keywords.push(...part.split('-').filter((w) => w.length > 2));
    }

    // From title
    if (page.title) {
      keywords.push(
        ...page.title
          .toLowerCase()
          .split(/\s+/)
          .filter((w) => w.length > 3)
      );
    }

    return [...new Set(keywords)];
  }

  /**
   * Find pages related by URL path
   */
  private findRelatedByPath(page: PageInfo, allPages: PageInfo[]): PageInfo[] {
    const segments = page.path.split('/').filter(Boolean);
    if (segments.length === 0) return [];

    const parentPath = '/' + segments.slice(0, -1).join('/');

    return allPages.filter((p) => {
      if (p.path === page.path) return false;

      // Sibling pages (same parent)
      const pSegments = p.path.split('/').filter(Boolean);
      const pParentPath = '/' + pSegments.slice(0, -1).join('/');

      return pParentPath === parentPath;
    }).slice(0, 3);
  }

  /**
   * Find pages related by topic
   */
  private findRelatedByTopic(
    page: PageInfo,
    topicMap: Map<string, PageInfo[]>,
    allPages: PageInfo[]
  ): PageInfo[] {
    const pageKeywords = this.extractKeywords(page);
    const relatedPages = new Map<string, number>();

    for (const keyword of pageKeywords) {
      const pagesWithKeyword = topicMap.get(keyword) || [];
      for (const related of pagesWithKeyword) {
        if (related.path === page.path) continue;
        const current = relatedPages.get(related.path) || 0;
        relatedPages.set(related.path, current + 1);
      }
    }

    // Sort by number of shared keywords
    const sorted = Array.from(relatedPages.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    return sorted
      .map(([path]) => allPages.find((p) => p.path === path))
      .filter((p): p is PageInfo => p !== undefined);
  }

  /**
   * Convert URL path to title
   */
  private pathToTitle(path: string): string {
    const lastSegment = path.split('/').filter(Boolean).pop() || 'Home';
    return lastSegment
      .replace(/-/g, ' ')
      .split(' ')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }

  /**
   * Deduplicate link opportunities
   */
  private deduplicateOpportunities(opportunities: LinkOpportunity[]): LinkOpportunity[] {
    const seen = new Set<string>();
    const unique: LinkOpportunity[] = [];

    for (const opp of opportunities) {
      const key = `${opp.sourcePage}:${opp.targetPage}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(opp);
      }
    }

    return unique;
  }

  /**
   * Generate a report of linking improvements
   */
  generateReport(analysis: LinkAnalysis, opportunities: LinkOpportunity[]): string {
    const lines: string[] = [
      '# Internal Linking Analysis Report',
      '',
      '## Overview',
      `- Total internal links: ${analysis.totalLinks}`,
      `- Average links per page: ${analysis.averageLinksPerPage.toFixed(1)}`,
      `- Pages with no outgoing links: ${analysis.pagesWithNoLinks.length}`,
      `- Orphan pages (no incoming links): ${analysis.orphanPages.length}`,
      '',
    ];

    if (analysis.orphanPages.length > 0) {
      lines.push('## Orphan Pages (Need Incoming Links)');
      for (const page of analysis.orphanPages.slice(0, 10)) {
        lines.push(`- ${page.path}`);
      }
      lines.push('');
    }

    if (analysis.pagesWithNoLinks.length > 0) {
      lines.push('## Pages Without Outgoing Links');
      for (const page of analysis.pagesWithNoLinks.slice(0, 10)) {
        lines.push(`- ${page.path}`);
      }
      lines.push('');
    }

    if (opportunities.length > 0) {
      lines.push('## Link Opportunities');
      for (const opp of opportunities.slice(0, 20)) {
        lines.push(`- **${opp.sourcePage}** -> ${opp.targetPage}`);
        lines.push(`  - Anchor: "${opp.anchorText}"`);
        lines.push(`  - Reason: ${opp.reason}`);
        lines.push('');
      }
    }

    return lines.join('\n');
  }
}

/**
 * Convenience function to find link opportunities
 */
export async function findLinkOpportunities(
  pages: PageInfo[],
  aiClient?: IAIClient
): Promise<LinkOpportunity[]> {
  const optimizer = new InternalLinkOptimizer(aiClient || null);
  return optimizer.findOpportunities(pages);
}

/**
 * Convenience function to analyze internal linking
 */
export function analyzeLinking(pages: PageInfo[]): LinkAnalysis {
  const optimizer = new InternalLinkOptimizer();
  return optimizer.analyze(pages);
}
