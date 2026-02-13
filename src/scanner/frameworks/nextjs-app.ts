/**
 * Next.js App Router framework handler
 * Handles SEO operations for Next.js 13+ with the App Router
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
 * Handler for Next.js App Router (Next.js 13+)
 * Uses metadata export, generateMetadata, and MetadataRoute types
 */
export class NextJSAppHandler extends BaseFrameworkHandler {
  readonly framework: FrameworkType = 'nextjs-app';

  /**
   * Get page files from App Router structure
   * Matches page.tsx, page.jsx, page.js in app directory
   */
  getPageFiles(files: string[]): string[] {
    const pagePattern = /^(app|src\/app)\/.+\/page\.(tsx|jsx|js)$|^(app|src\/app)\/page\.(tsx|jsx|js)$/;
    return files.filter((f) => pagePattern.test(f));
  }

  /**
   * Get layout files from App Router structure
   */
  getLayoutFiles(files: string[]): string[] {
    const layoutPattern = /^(app|src\/app)\/.+\/layout\.(tsx|jsx|js)$|^(app|src\/app)\/layout\.(tsx|jsx|js)$/;
    return files.filter((f) => layoutPattern.test(f));
  }

  /**
   * Extract meta from Next.js App Router metadata export
   * Supports: export const metadata = { ... }
   */
  async extractMeta(content: string): Promise<ExtractedMeta | null> {
    const result: ExtractedMeta = {};

    // Match: export const metadata = { title: '...', description: '...' }
    // Also handles Metadata type annotation
    const metadataMatch = content.match(
      /export\s+const\s+metadata(?:\s*:\s*Metadata)?\s*=\s*\{([^}]+)\}/s
    );

    if (metadataMatch) {
      const metadataBlock = metadataMatch[1] ?? '';

      // Extract title
      const titleMatch = metadataBlock.match(/title\s*:\s*['"`]([^'"`]+)['"`]/);
      if (titleMatch?.[1]) {
        result.title = titleMatch[1];
      }

      // Extract description
      const descMatch = metadataBlock.match(/description\s*:\s*['"`]([^'"`]+)['"`]/);
      if (descMatch?.[1]) {
        result.description = descMatch[1];
      }
    }

    // Check for generateMetadata function (dynamic metadata)
    const generateMetadataMatch = content.match(
      /export\s+(?:async\s+)?function\s+generateMetadata/
    );
    if (generateMetadataMatch && !result.title) {
      // Dynamic metadata - we can't extract static values
      return null;
    }

    return result.title || result.description ? result : null;
  }

  /**
   * Generate TypeScript metadata export code
   */
  generateMetaCode(meta: MetaInput): string {
    const lines: string[] = [
      "import type { Metadata } from 'next';",
      '',
      'export const metadata: Metadata = {',
      `  title: '${this.escapeString(meta.title)}',`,
      `  description: '${this.escapeString(meta.description)}',`,
    ];

    // Add Open Graph if image provided
    if (meta.ogImage) {
      lines.push('  openGraph: {');
      lines.push(`    title: '${this.escapeString(meta.title)}',`);
      lines.push(`    description: '${this.escapeString(meta.description)}',`);
      lines.push('    images: [');
      lines.push('      {');
      lines.push(`        url: '${meta.ogImage}',`);
      lines.push('        width: 1200,');
      lines.push('        height: 630,');
      lines.push(`        alt: '${this.escapeString(meta.title)}',`);
      lines.push('      },');
      lines.push('    ],');
      lines.push('  },');
      lines.push('  twitter: {');
      lines.push("    card: 'summary_large_image',");
      lines.push(`    title: '${this.escapeString(meta.title)}',`);
      lines.push(`    description: '${this.escapeString(meta.description)}',`);
      lines.push(`    images: ['${meta.ogImage}'],`);
      lines.push('  },');
    }

    if (meta.canonical) {
      lines.push('  alternates: {');
      lines.push(`    canonical: '${meta.canonical}',`);
      lines.push('  },');
    }

    if (meta.keywords && meta.keywords.length > 0) {
      lines.push(`  keywords: [${meta.keywords.map((k) => `'${this.escapeString(k)}'`).join(', ')}],`);
    }

    lines.push('};');

    return lines.join('\n');
  }

  /**
   * Generate TypeScript sitemap function for Next.js App Router
   */
  generateSitemapCode(pages: SitemapEntry[]): string {
    const entries = pages.map((page) => `    {
      url: '${page.url}',
      lastModified: '${page.lastModified}',
      changeFrequency: '${page.changeFrequency}',
      priority: ${page.priority},
    }`);

    return `import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
${entries.join(',\n')}
  ];
}
`;
  }

  /**
   * Generate TypeScript robots function for Next.js App Router
   */
  generateRobotsCode(domain: string): string {
    return `import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/admin/'],
    },
    sitemap: '${domain}/sitemap.xml',
  };
}
`;
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

    return `export function JsonLd() {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(${JSON.stringify(jsonLd, null, 2).split('\n').join('\n        ')})
      }}
    />
  );
}
`;
  }

  getSitemapPath(): string {
    return 'app/sitemap.ts';
  }

  getRobotsPath(): string {
    return 'app/robots.ts';
  }

  getSchemaLocation(): SchemaLocation {
    return 'layout';
  }

  getBlogDirectory(): string {
    return 'app/blog';
  }

  /**
   * Format blog post for Next.js App Router
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

    return `${frontmatter}

${post.content}
`;
  }

  /**
   * Escape single quotes and backslashes for JavaScript strings
   */
  private escapeString(str: string): string {
    return str.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  }
}
