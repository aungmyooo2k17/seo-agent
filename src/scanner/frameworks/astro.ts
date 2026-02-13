/**
 * Astro framework handler
 * Handles SEO operations for Astro sites
 */

import type {
  FrameworkType,
  SitemapEntry,
  SchemaMarkup,
  BlogPost,
} from '../../types';
import {
  BaseFrameworkHandler,
  type ExtractedMeta,
  type MetaInput,
  type SchemaLocation,
} from './types';

/**
 * Handler for Astro framework
 * Uses Astro components, frontmatter, and integrations
 */
export class AstroHandler extends BaseFrameworkHandler {
  readonly framework: FrameworkType = 'astro';

  /**
   * Get page files from Astro pages directory
   * Matches .astro files and content collection routes
   */
  getPageFiles(files: string[]): string[] {
    const pagePattern = /^src\/pages\/.*\.astro$/;
    const mdPattern = /^src\/pages\/.*\.(md|mdx)$/;

    return files.filter((f) => pagePattern.test(f) || mdPattern.test(f));
  }

  /**
   * Get layout files from Astro layouts directory
   */
  getLayoutFiles(files: string[]): string[] {
    const layoutPattern = /^src\/layouts\/.*\.astro$/;
    return files.filter((f) => layoutPattern.test(f));
  }

  /**
   * Extract meta from Astro frontmatter and <head> content
   */
  async extractMeta(content: string): Promise<ExtractedMeta | null> {
    const result: ExtractedMeta = {};

    // Extract from frontmatter (between ---)
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (frontmatterMatch) {
      const frontmatter = frontmatterMatch[1] ?? '';

      // Extract title from frontmatter
      const titleMatch = frontmatter.match(/title:\s*["']?([^"'\n]+)["']?/);
      if (titleMatch?.[1]) {
        result.title = titleMatch[1].trim();
      }

      // Extract description from frontmatter
      const descMatch = frontmatter.match(/description:\s*["']?([^"'\n]+)["']?/);
      if (descMatch?.[1]) {
        result.description = descMatch[1].trim();
      }
    }

    // Extract from template <title> tag if not in frontmatter
    if (!result.title) {
      const titleTagMatch = content.match(/<title>([^<{]+)<\/title>/);
      if (titleTagMatch?.[1]) {
        result.title = titleTagMatch[1].trim();
      }

      // Handle dynamic title: <title>{title}</title>
      const dynamicTitleMatch = content.match(/<title>\{([^}]+)\}<\/title>/);
      if (dynamicTitleMatch?.[1]) {
        // Check if we can resolve from frontmatter
        const varName = dynamicTitleMatch[1].trim();
        if (varName === 'title' && result.title) {
          // Already extracted
        } else if (varName.includes('frontmatter.title') && result.title) {
          // Already extracted from frontmatter
        }
      }
    }

    // Extract meta description from template
    if (!result.description) {
      const metaDescMatch = content.match(
        /<meta\s+name=["']description["']\s+content=["']([^"']+)["']/
      );
      if (metaDescMatch?.[1]) {
        result.description = metaDescMatch[1].trim();
      }
    }

    return result.title || result.description ? result : null;
  }

  /**
   * Generate Astro component code for meta tags
   */
  generateMetaCode(meta: MetaInput): string {
    const lines: string[] = [
      '---',
      "// SEO Meta Tags Component",
      `const title = '${this.escapeString(meta.title)}';`,
      `const description = '${this.escapeString(meta.description)}';`,
    ];

    if (meta.ogImage) {
      lines.push(`const ogImage = '${meta.ogImage}';`);
    }

    if (meta.canonical) {
      lines.push(`const canonical = '${meta.canonical}';`);
    }

    lines.push('---');
    lines.push('');
    lines.push('<title>{title}</title>');
    lines.push('<meta name="description" content={description} />');

    if (meta.canonical) {
      lines.push('<link rel="canonical" href={canonical} />');
    }

    if (meta.keywords && meta.keywords.length > 0) {
      lines.push(`<meta name="keywords" content="${meta.keywords.join(', ')}" />`);
    }

    // Open Graph
    lines.push('');
    lines.push('<!-- Open Graph -->');
    lines.push('<meta property="og:title" content={title} />');
    lines.push('<meta property="og:description" content={description} />');
    lines.push('<meta property="og:type" content="website" />');

    if (meta.ogImage) {
      lines.push('<meta property="og:image" content={ogImage} />');
      lines.push('<meta property="og:image:width" content="1200" />');
      lines.push('<meta property="og:image:height" content="630" />');
      lines.push('');
      lines.push('<!-- Twitter -->');
      lines.push('<meta name="twitter:card" content="summary_large_image" />');
      lines.push('<meta name="twitter:title" content={title} />');
      lines.push('<meta name="twitter:description" content={description} />');
      lines.push('<meta name="twitter:image" content={ogImage} />');
    }

    return lines.join('\n');
  }

  /**
   * Generate Astro config addition for sitemap integration
   * Note: Astro uses @astrojs/sitemap integration
   */
  generateSitemapCode(pages: SitemapEntry[]): string {
    // Generate astro.config.mjs addition for sitemap integration
    const customPages = pages
      .filter((p) => !p.url.includes('['))
      .map((p) => `    '${p.url}'`)
      .join(',\n');

    return `// Add to astro.config.mjs:
// npm install @astrojs/sitemap

import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: '${pages[0]?.url.replace(/\/[^/]*$/, '') || 'https://example.com'}',
  integrations: [
    sitemap({
      changefreq: 'weekly',
      priority: 0.7,
      lastmod: new Date(),
      customPages: [
${customPages}
      ],
    }),
  ],
});
`;
  }

  /**
   * Generate robots.txt content
   */
  generateRobotsCode(domain: string): string {
    return this.generateStandardRobots(domain, ['/api/', '/_astro/']);
  }

  /**
   * Generate schema markup as an Astro component
   */
  generateSchemaCode(schema: SchemaMarkup): string {
    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': schema.type,
      ...schema.data,
    };

    return `---
// Schema.org JSON-LD Component
const schema = ${JSON.stringify(jsonLd, null, 2)};
---

<script type="application/ld+json" set:html={JSON.stringify(schema)} />
`;
  }

  getSitemapPath(): string {
    return 'astro.config.mjs';
  }

  getRobotsPath(): string {
    return 'public/robots.txt';
  }

  getSchemaLocation(): SchemaLocation {
    return 'head';
  }

  getBlogDirectory(): string {
    // Check for content collections first, fallback to pages
    return 'src/content/blog';
  }

  /**
   * Format blog post for Astro
   * Uses content collections format with frontmatter
   */
  formatBlogPost(post: BlogPost): string {
    const frontmatter = this.generateFrontmatter({
      title: post.title,
      description: post.metaDescription,
      pubDate: post.publishedAt,
      author: post.author,
      keywords: [post.targetKeyword, ...post.secondaryKeywords],
      heroImage: post.featuredImage?.filename,
      ...post.frontmatter,
    });

    return `${frontmatter}

${post.content}
`;
  }

  /**
   * Escape single quotes for Astro strings
   */
  private escapeString(str: string): string {
    return str.replace(/'/g, "\\'").replace(/\n/g, '\\n');
  }
}
