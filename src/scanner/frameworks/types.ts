/**
 * Framework handler interface for SEO operations
 * Each framework (Next.js, Astro, etc.) implements this interface
 * to provide framework-specific SEO code generation
 */

import type {
  FrameworkType,
  SitemapEntry,
  SchemaMarkup,
  BlogPost,
} from '../../types';

/**
 * Handler interface for framework-specific SEO operations
 * Implementations provide code generation for meta tags, sitemaps, etc.
 */
export interface IFrameworkHandler {
  /** The framework this handler is for */
  readonly framework: FrameworkType;

  /**
   * Get page files from a list of file paths
   * @param files - Array of file paths in the codebase
   * @returns Array of file paths that are pages
   */
  getPageFiles(files: string[]): string[];

  /**
   * Get layout files from a list of file paths
   * @param files - Array of file paths in the codebase
   * @returns Array of file paths that are layouts
   */
  getLayoutFiles(files: string[]): string[];

  /**
   * Extract meta information from page content
   * @param content - File content to parse
   * @returns Extracted title and description, or null if not found
   */
  extractMeta(content: string): Promise<ExtractedMeta | null>;

  /**
   * Generate code for meta tags
   * @param meta - Meta information to generate code for
   * @returns Generated code string
   */
  generateMetaCode(meta: MetaInput): string;

  /**
   * Generate sitemap code/content
   * @param pages - Array of sitemap entries
   * @returns Generated sitemap code or XML
   */
  generateSitemapCode(pages: SitemapEntry[]): string;

  /**
   * Generate robots.txt content or code
   * @param domain - Production domain
   * @returns Generated robots.txt content
   */
  generateRobotsCode(domain: string): string;

  /**
   * Generate schema markup code
   * @param schema - Schema markup to embed
   * @returns Generated code for embedding schema
   */
  generateSchemaCode(schema: SchemaMarkup): string;

  /**
   * Get the path where sitemap should be created
   * @returns File path for sitemap
   */
  getSitemapPath(): string;

  /**
   * Get the path where robots.txt should be created
   * @returns File path for robots.txt
   */
  getRobotsPath(): string;

  /**
   * Get where schema markup should be placed
   * @returns Location type for schema
   */
  getSchemaLocation(): SchemaLocation;

  /**
   * Get the directory where blog posts are stored
   * @returns Directory path for blog content
   */
  getBlogDirectory(): string;

  /**
   * Format a blog post for the framework
   * @param post - Blog post to format
   * @returns Formatted content ready to write
   */
  formatBlogPost(post: BlogPost): string;
}

/**
 * Extracted meta information from a page
 */
export interface ExtractedMeta {
  title?: string;
  description?: string;
}

/**
 * Input for generating meta code
 */
export interface MetaInput {
  title: string;
  description: string;
  ogImage: string | undefined;
  canonical: string | undefined;
  keywords: string[] | undefined;
}

/**
 * Where schema markup should be placed
 */
export type SchemaLocation = 'head' | 'component' | 'layout';

/**
 * Base class with common functionality for framework handlers
 */
export abstract class BaseFrameworkHandler implements IFrameworkHandler {
  abstract readonly framework: FrameworkType;

  abstract getPageFiles(files: string[]): string[];
  abstract getLayoutFiles(files: string[]): string[];
  abstract extractMeta(content: string): Promise<ExtractedMeta | null>;
  abstract generateMetaCode(meta: MetaInput): string;
  abstract generateSitemapCode(pages: SitemapEntry[]): string;
  abstract generateRobotsCode(domain: string): string;
  abstract generateSchemaCode(schema: SchemaMarkup): string;
  abstract getSitemapPath(): string;
  abstract getRobotsPath(): string;
  abstract getSchemaLocation(): SchemaLocation;
  abstract getBlogDirectory(): string;
  abstract formatBlogPost(post: BlogPost): string;

  /**
   * Convert URL path to route segments for matching
   */
  protected pathToSegments(path: string): string[] {
    return path.split('/').filter(Boolean);
  }

  /**
   * Generate frontmatter from key-value pairs
   */
  protected generateFrontmatter(data: Record<string, unknown>): string {
    const lines: string[] = ['---'];
    for (const [key, value] of Object.entries(data)) {
      if (value === undefined || value === null) continue;
      if (typeof value === 'string') {
        // Escape quotes in strings
        lines.push(`${key}: "${value.replace(/"/g, '\\"')}"`);
      } else if (Array.isArray(value)) {
        lines.push(`${key}:`);
        for (const item of value) {
          lines.push(`  - "${String(item).replace(/"/g, '\\"')}"`);
        }
      } else if (value instanceof Date) {
        lines.push(`${key}: ${value.toISOString()}`);
      } else {
        lines.push(`${key}: ${JSON.stringify(value)}`);
      }
    }
    lines.push('---');
    return lines.join('\n');
  }

  /**
   * Generate XML sitemap content
   */
  protected generateXMLSitemap(pages: SitemapEntry[]): string {
    const urlEntries = pages.map((page) => `  <url>
    <loc>${this.escapeXml(page.url)}</loc>
    <lastmod>${page.lastModified}</lastmod>
    <changefreq>${page.changeFrequency}</changefreq>
    <priority>${page.priority.toFixed(1)}</priority>
  </url>`);

    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlEntries.join('\n')}
</urlset>`;
  }

  /**
   * Generate standard robots.txt content
   */
  protected generateStandardRobots(domain: string, disallowPaths: string[] = []): string {
    const lines = [
      'User-agent: *',
      'Allow: /',
      ...disallowPaths.map((p) => `Disallow: ${p}`),
      '',
      `Sitemap: ${domain}/sitemap.xml`,
    ];
    return lines.join('\n');
  }

  /**
   * Escape special XML characters
   */
  protected escapeXml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}
