/**
 * Next.js Pages Router framework handler
 * Handles SEO operations for Next.js with the Pages Router
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
 * Handler for Next.js Pages Router
 * Uses next/head for meta tags and static files for sitemap/robots
 */
export class NextJSPagesHandler extends BaseFrameworkHandler {
  readonly framework: FrameworkType = 'nextjs-pages';

  /**
   * Get page files from Pages Router structure
   * Excludes _app, _document, _error, api routes
   */
  getPageFiles(files: string[]): string[] {
    return files.filter((f) => {
      // Must be in pages directory
      if (!f.match(/^(pages|src\/pages)\//)) return false;
      // Exclude special files
      if (f.includes('/_app.') || f.includes('/_document.') || f.includes('/_error.')) return false;
      // Exclude API routes
      if (f.includes('/api/')) return false;
      // Must be a JS/TS file
      return /\.(tsx|jsx|js)$/.test(f);
    });
  }

  /**
   * Get layout files (primarily _app.tsx)
   */
  getLayoutFiles(files: string[]): string[] {
    const layoutPattern = /^(pages|src\/pages)\/_app\.(tsx|jsx|js)$/;
    return files.filter((f) => layoutPattern.test(f));
  }

  /**
   * Extract meta from next/head usage in Pages Router
   * Supports: <Head><title>...</title></Head>
   */
  async extractMeta(content: string): Promise<ExtractedMeta | null> {
    const result: ExtractedMeta = {};

    // Check if file uses next/head
    if (!content.includes('next/head')) {
      return null;
    }

    // Extract title from <Head><title>...</title></Head>
    const titleMatch = content.match(/<title>([^<]+)<\/title>/);
    if (titleMatch?.[1]) {
      result.title = titleMatch[1].trim();
    }

    // Handle template literal in title
    const templateTitleMatch = content.match(/<title>\{[`']([^`']+)[`']\}<\/title>/);
    if (templateTitleMatch?.[1]) {
      result.title = templateTitleMatch[1].trim();
    }

    // Extract description from meta tag
    const descMatch = content.match(
      /<meta\s+name=["']description["']\s+content=["']([^"']+)["']/
    );
    if (descMatch?.[1]) {
      result.description = descMatch[1].trim();
    }

    // Alternative: content before name
    const descAltMatch = content.match(
      /<meta\s+content=["']([^"']+)["']\s+name=["']description["']/
    );
    if (descAltMatch?.[1] && !result.description) {
      result.description = descAltMatch[1].trim();
    }

    return result.title || result.description ? result : null;
  }

  /**
   * Generate JSX with next/head for meta tags
   */
  generateMetaCode(meta: MetaInput): string {
    const lines: string[] = [
      "import Head from 'next/head';",
      '',
      'export function PageHead() {',
      '  return (',
      '    <Head>',
      `      <title>${this.escapeHtml(meta.title)}</title>`,
      `      <meta name="description" content="${this.escapeHtml(meta.description)}" />`,
    ];

    if (meta.canonical) {
      lines.push(`      <link rel="canonical" href="${meta.canonical}" />`);
    }

    if (meta.keywords && meta.keywords.length > 0) {
      lines.push(`      <meta name="keywords" content="${meta.keywords.join(', ')}" />`);
    }

    // Open Graph tags
    lines.push(`      <meta property="og:title" content="${this.escapeHtml(meta.title)}" />`);
    lines.push(`      <meta property="og:description" content="${this.escapeHtml(meta.description)}" />`);
    lines.push('      <meta property="og:type" content="website" />');

    if (meta.ogImage) {
      lines.push(`      <meta property="og:image" content="${meta.ogImage}" />`);
      lines.push('      <meta property="og:image:width" content="1200" />');
      lines.push('      <meta property="og:image:height" content="630" />');
      lines.push('      <meta name="twitter:card" content="summary_large_image" />');
      lines.push(`      <meta name="twitter:image" content="${meta.ogImage}" />`);
    }

    lines.push('    </Head>');
    lines.push('  );');
    lines.push('}');

    return lines.join('\n');
  }

  /**
   * Generate XML sitemap content for public directory
   */
  generateSitemapCode(pages: SitemapEntry[]): string {
    return this.generateXMLSitemap(pages);
  }

  /**
   * Generate robots.txt content for public directory
   */
  generateRobotsCode(domain: string): string {
    return this.generateStandardRobots(domain, ['/api/', '/admin/']);
  }

  /**
   * Generate schema markup as a JSON-LD script component
   */
  generateSchemaCode(schema: SchemaMarkup): string {
    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': schema.type,
      ...schema.data,
    };

    return `import Head from 'next/head';

export function SchemaMarkup() {
  const schema = ${JSON.stringify(jsonLd, null, 2)};

  return (
    <Head>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
    </Head>
  );
}
`;
  }

  getSitemapPath(): string {
    return 'public/sitemap.xml';
  }

  getRobotsPath(): string {
    return 'public/robots.txt';
  }

  getSchemaLocation(): SchemaLocation {
    return 'component';
  }

  getBlogDirectory(): string {
    return 'pages/blog';
  }

  /**
   * Format blog post for Next.js Pages Router
   * Creates an MDX file with frontmatter
   */
  formatBlogPost(post: BlogPost): string {
    const frontmatter = this.generateFrontmatter({
      title: post.title,
      description: post.metaDescription,
      publishedAt: post.publishedAt,
      author: post.author,
      keywords: [post.targetKeyword, ...post.secondaryKeywords],
      image: post.featuredImage?.filename,
      ...post.frontmatter,
    });

    // For Pages Router, include Head import in the file
    return `${frontmatter}

import Head from 'next/head';

<Head>
  <title>${this.escapeHtml(post.title)}</title>
  <meta name="description" content="${this.escapeHtml(post.metaDescription)}" />
</Head>

${post.content}
`;
  }

  /**
   * Escape HTML entities for safe embedding
   */
  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}
