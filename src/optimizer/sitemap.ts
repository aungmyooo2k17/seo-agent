/**
 * Sitemap generator module
 * Creates XML sitemaps for search engine indexing
 */

import type { PageInfo, SitemapEntry, CodebaseProfile } from '../types';
import { getHandler } from '../scanner/frameworks';

/**
 * Configuration for sitemap generation
 */
export interface SitemapConfig {
  /** Base domain URL */
  domain: string;
  /** Default change frequency */
  defaultChangeFreq: SitemapEntry['changeFrequency'];
  /** Whether to include lastmod */
  includeLastMod: boolean;
  /** Paths to exclude from sitemap */
  excludePaths: string[];
  /** Custom priority overrides by path pattern */
  priorityOverrides: Map<string, number>;
}

const DEFAULT_CONFIG: Omit<SitemapConfig, 'domain'> = {
  defaultChangeFreq: 'weekly',
  includeLastMod: true,
  excludePaths: ['/api/', '/admin/', '/login', '/signup', '/404', '/500'],
  priorityOverrides: new Map(),
};

/**
 * Generates XML sitemaps
 */
export class SitemapGenerator {
  private config: SitemapConfig;

  constructor(domain: string, config: Partial<Omit<SitemapConfig, 'domain'>> = {}) {
    this.config = {
      domain: domain.replace(/\/$/, ''), // Remove trailing slash
      ...DEFAULT_CONFIG,
      ...config,
      priorityOverrides: config.priorityOverrides || DEFAULT_CONFIG.priorityOverrides,
    };
  }

  /**
   * Generate sitemap entries from page info
   *
   * @param pages - Array of page information
   * @returns Array of sitemap entries
   */
  generate(pages: PageInfo[]): SitemapEntry[] {
    const entries: SitemapEntry[] = [];

    for (const page of pages) {
      // Skip excluded paths
      if (this.shouldExclude(page.path)) {
        continue;
      }

      // Skip dynamic routes (contain brackets)
      if (page.path.includes('[') || page.path.includes(']')) {
        continue;
      }

      const lastMod = this.config.includeLastMod
        ? page.lastModified.toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0];

      const entry: SitemapEntry = {
        url: `${this.config.domain}${page.path}`,
        lastModified: lastMod ?? new Date().toISOString().split('T')[0] ?? '',
        changeFrequency: this.getChangeFrequency(page),
        priority: this.getPriority(page),
      };

      entries.push(entry);
    }

    // Sort by priority (descending) then by URL
    entries.sort((a, b) => {
      if (b.priority !== a.priority) {
        return b.priority - a.priority;
      }
      return a.url.localeCompare(b.url);
    });

    return entries;
  }

  /**
   * Generate XML sitemap content
   *
   * @param entries - Sitemap entries
   * @returns XML string
   */
  toXML(entries: SitemapEntry[]): string {
    const urlEntries = entries.map((entry) => `  <url>
    <loc>${this.escapeXml(entry.url)}</loc>
    <lastmod>${entry.lastModified}</lastmod>
    <changefreq>${entry.changeFrequency}</changefreq>
    <priority>${entry.priority.toFixed(1)}</priority>
  </url>`);

    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlEntries.join('\n')}
</urlset>`;
  }

  /**
   * Generate sitemap index for large sites
   *
   * @param sitemapUrls - URLs of individual sitemaps
   * @returns XML string for sitemap index
   */
  toSitemapIndex(sitemapUrls: string[]): string {
    const sitemapEntries = sitemapUrls.map((url) => `  <sitemap>
    <loc>${this.escapeXml(url)}</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
  </sitemap>`);

    return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapEntries.join('\n')}
</sitemapindex>`;
  }

  /**
   * Generate framework-specific sitemap code
   *
   * @param entries - Sitemap entries
   * @param profile - Codebase profile
   * @returns Generated code string
   */
  generateCode(entries: SitemapEntry[], profile: CodebaseProfile): string {
    const handler = getHandler(profile.framework);
    return handler.generateSitemapCode(entries);
  }

  /**
   * Get the file path where sitemap should be saved
   *
   * @param profile - Codebase profile
   * @returns File path
   */
  getSitemapPath(profile: CodebaseProfile): string {
    const handler = getHandler(profile.framework);
    return handler.getSitemapPath();
  }

  /**
   * Check if a path should be excluded from sitemap
   */
  private shouldExclude(path: string): boolean {
    return this.config.excludePaths.some((exclude) => path.includes(exclude));
  }

  /**
   * Get change frequency for a page
   */
  private getChangeFrequency(page: PageInfo): SitemapEntry['changeFrequency'] {
    // Blog posts change less frequently
    if (page.path.includes('/blog/')) {
      return 'monthly';
    }

    // Home page changes more frequently
    if (page.path === '/') {
      return 'daily';
    }

    // Documentation might change weekly
    if (page.path.includes('/docs/')) {
      return 'weekly';
    }

    return this.config.defaultChangeFreq;
  }

  /**
   * Get priority for a page
   *
   * Priority rules:
   * - Home page: 1.0
   * - Top-level pages: 0.8
   * - Blog index: 0.7
   * - Blog posts: 0.6
   * - Deep pages: 0.5
   * - Others: 0.5
   */
  private getPriority(page: PageInfo): number {
    // Check for custom overrides
    for (const [pattern, priority] of this.config.priorityOverrides) {
      if (page.path.match(new RegExp(pattern))) {
        return priority;
      }
    }

    const path = page.path;

    // Home page
    if (path === '/') {
      return 1.0;
    }

    // Count path depth
    const depth = path.split('/').filter(Boolean).length;

    // Top-level pages (e.g., /about, /contact)
    if (depth === 1) {
      return 0.8;
    }

    // Blog index
    if (path === '/blog' || path === '/blog/') {
      return 0.7;
    }

    // Blog posts
    if (path.startsWith('/blog/')) {
      return 0.6;
    }

    // Documentation
    if (path.startsWith('/docs/')) {
      return depth === 2 ? 0.7 : 0.6;
    }

    // Deep pages (3+ levels)
    if (depth >= 3) {
      return 0.4;
    }

    // Default
    return 0.5;
  }

  /**
   * Escape special XML characters
   */
  private escapeXml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * Split entries into multiple sitemaps (max 50,000 URLs per sitemap)
   *
   * @param entries - All sitemap entries
   * @param maxPerSitemap - Maximum entries per sitemap
   * @returns Array of sitemap entry arrays
   */
  splitForLargeSites(
    entries: SitemapEntry[],
    maxPerSitemap: number = 50000
  ): SitemapEntry[][] {
    const chunks: SitemapEntry[][] = [];

    for (let i = 0; i < entries.length; i += maxPerSitemap) {
      chunks.push(entries.slice(i, i + maxPerSitemap));
    }

    return chunks;
  }

  /**
   * Add additional URLs that might not be in pages
   * (e.g., dynamically generated pages, external resources)
   *
   * @param entries - Existing entries
   * @param additionalUrls - URLs to add
   * @returns Combined entries
   */
  addAdditionalUrls(
    entries: SitemapEntry[],
    additionalUrls: Array<{
      url: string;
      priority?: number;
      changeFrequency?: SitemapEntry['changeFrequency'];
    }>
  ): SitemapEntry[] {
    const existingUrls = new Set(entries.map((e) => e.url));
    const newEntries: SitemapEntry[] = additionalUrls
      .filter((item) => !existingUrls.has(item.url))
      .map((item) => ({
        url: item.url,
        lastModified: new Date().toISOString().split('T')[0] ?? '',
        changeFrequency: item.changeFrequency ?? this.config.defaultChangeFreq,
        priority: item.priority ?? 0.5,
      }));

    return [...entries, ...newEntries];
  }
}

/**
 * Convenience function to generate sitemap entries
 */
export function generateSitemap(pages: PageInfo[], domain: string): SitemapEntry[] {
  const generator = new SitemapGenerator(domain);
  return generator.generate(pages);
}

/**
 * Convenience function to generate sitemap XML
 */
export function generateSitemapXML(pages: PageInfo[], domain: string): string {
  const generator = new SitemapGenerator(domain);
  const entries = generator.generate(pages);
  return generator.toXML(entries);
}
