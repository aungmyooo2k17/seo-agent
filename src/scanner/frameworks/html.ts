/**
 * Plain HTML framework handler
 * Handles SEO operations for static HTML sites
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
 * Handler for plain HTML sites
 * Uses direct HTML manipulation for all SEO elements
 */
export class HTMLHandler extends BaseFrameworkHandler {
  readonly framework: FrameworkType = 'html';

  /**
   * Get HTML files as pages
   */
  getPageFiles(files: string[]): string[] {
    return files.filter((f) => f.endsWith('.html') || f.endsWith('.htm'));
  }

  /**
   * HTML sites typically don't have layouts in the traditional sense
   * Look for common template patterns
   */
  getLayoutFiles(files: string[]): string[] {
    const layoutPatterns = [
      /layout\.html$/,
      /template\.html$/,
      /base\.html$/,
      /_layout\.html$/,
      /includes\/header\.html$/,
      /partials\/head\.html$/,
    ];

    return files.filter((f) => layoutPatterns.some((p) => p.test(f)));
  }

  /**
   * Extract meta from HTML <head> section
   */
  async extractMeta(content: string): Promise<ExtractedMeta | null> {
    const result: ExtractedMeta = {};

    // Extract title
    const titleMatch = content.match(/<title>([^<]+)<\/title>/i);
    if (titleMatch?.[1]) {
      result.title = this.decodeHtmlEntities(titleMatch[1].trim());
    }

    // Extract description - handle various formats
    const descPatterns = [
      /<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i,
      /<meta\s+content=["']([^"']+)["']\s+name=["']description["']/i,
    ];

    for (const pattern of descPatterns) {
      const match = content.match(pattern);
      if (match?.[1]) {
        result.description = this.decodeHtmlEntities(match[1].trim());
        break;
      }
    }

    return result.title || result.description ? result : null;
  }

  /**
   * Generate HTML meta tags
   */
  generateMetaCode(meta: MetaInput): string {
    const lines: string[] = [
      '<!-- SEO Meta Tags -->',
      `<title>${this.escapeHtml(meta.title)}</title>`,
      `<meta name="description" content="${this.escapeHtml(meta.description)}">`,
    ];

    if (meta.canonical) {
      lines.push(`<link rel="canonical" href="${meta.canonical}">`);
    }

    if (meta.keywords && meta.keywords.length > 0) {
      lines.push(`<meta name="keywords" content="${meta.keywords.join(', ')}">`);
    }

    // Open Graph
    lines.push('');
    lines.push('<!-- Open Graph -->');
    lines.push(`<meta property="og:title" content="${this.escapeHtml(meta.title)}">`);
    lines.push(`<meta property="og:description" content="${this.escapeHtml(meta.description)}">`);
    lines.push('<meta property="og:type" content="website">');

    if (meta.ogImage) {
      lines.push(`<meta property="og:image" content="${meta.ogImage}">`);
      lines.push('<meta property="og:image:width" content="1200">');
      lines.push('<meta property="og:image:height" content="630">');
      lines.push('');
      lines.push('<!-- Twitter -->');
      lines.push('<meta name="twitter:card" content="summary_large_image">');
      lines.push(`<meta name="twitter:title" content="${this.escapeHtml(meta.title)}">`);
      lines.push(`<meta name="twitter:description" content="${this.escapeHtml(meta.description)}">`);
      lines.push(`<meta name="twitter:image" content="${meta.ogImage}">`);
    }

    return lines.join('\n');
  }

  /**
   * Generate XML sitemap
   */
  generateSitemapCode(pages: SitemapEntry[]): string {
    return this.generateXMLSitemap(pages);
  }

  /**
   * Generate robots.txt
   */
  generateRobotsCode(domain: string): string {
    return this.generateStandardRobots(domain);
  }

  /**
   * Generate JSON-LD script tag for schema
   */
  generateSchemaCode(schema: SchemaMarkup): string {
    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': schema.type,
      ...schema.data,
    };

    return `<!-- Schema.org JSON-LD -->
<script type="application/ld+json">
${JSON.stringify(jsonLd, null, 2)}
</script>`;
  }

  getSitemapPath(): string {
    return 'sitemap.xml';
  }

  getRobotsPath(): string {
    return 'robots.txt';
  }

  getSchemaLocation(): SchemaLocation {
    return 'head';
  }

  getBlogDirectory(): string {
    return 'blog';
  }

  /**
   * Format blog post as HTML page
   */
  formatBlogPost(post: BlogPost): string {
    const meta = this.generateMetaCode({
      title: post.title,
      description: post.metaDescription,
      ogImage: post.featuredImage?.filename ?? undefined,
      canonical: undefined,
      keywords: [post.targetKeyword, ...post.secondaryKeywords],
    });

    const schema = this.generateSchemaCode({
      type: 'BlogPosting',
      data: {
        headline: post.title,
        description: post.metaDescription,
        author: {
          '@type': 'Person',
          name: post.author,
        },
        datePublished: post.publishedAt.toISOString(),
        image: post.featuredImage?.filename,
      },
    });

    // Convert markdown to basic HTML (simplified)
    const contentHtml = this.markdownToHtml(post.content);

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  ${meta}
  ${schema}
</head>
<body>
  <article>
    <header>
      <h1>${this.escapeHtml(post.title)}</h1>
      <p class="meta">
        By ${this.escapeHtml(post.author)} on ${post.publishedAt.toLocaleDateString()}
      </p>
    </header>
    ${post.featuredImage ? `<img src="${post.featuredImage.filename}" alt="${this.escapeHtml(post.featuredImage.altText)}">` : ''}
    <main>
      ${contentHtml}
    </main>
  </article>
</body>
</html>`;
  }

  /**
   * Simple markdown to HTML conversion
   */
  private markdownToHtml(markdown: string): string {
    return markdown
      // Headers
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^# (.+)$/gm, '<h1>$1</h1>')
      // Bold
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      // Italic
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      // Links
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
      // Paragraphs
      .replace(/\n\n/g, '</p><p>')
      .replace(/^(.+)$/gm, (match) => {
        if (match.startsWith('<')) return match;
        return `<p>${match}</p>`;
      })
      // Clean up
      .replace(/<p><\/p>/g, '')
      .replace(/<p>(<h[1-6]>)/g, '$1')
      .replace(/(<\/h[1-6]>)<\/p>/g, '$1');
  }

  /**
   * Escape HTML entities
   */
  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * Decode HTML entities
   */
  private decodeHtmlEntities(str: string): string {
    return str
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&#x27;/g, "'");
  }
}
