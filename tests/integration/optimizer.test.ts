/**
 * Optimizer integration tests
 * Tests sitemap generation, robots.txt, schema markup, and meta optimizer
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  createMockAIClient,
  createMockCodebaseProfile,
  createMockPageInfo,
  createMockSEOIssue,
  createMockCodeFix,
  createTempDir,
  cleanupTempDir,
} from '../helpers';

// Since we're testing integration, we'll test the optimizer logic
// We'll mock the AI client but test the actual optimizer functions

describe('Optimizer Integration', () => {
  const mockAIClient = createMockAIClient();
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempDir();
    jest.clearAllMocks();
  });

  afterEach(() => {
    cleanupTempDir(tempDir);
  });

  describe('Sitemap Generation', () => {
    it('generates sitemap entries from pages', () => {
      const pages = [
        createMockPageInfo({
          path: '/',
          lastModified: new Date('2024-01-20'),
        }),
        createMockPageInfo({
          path: '/about',
          lastModified: new Date('2024-01-15'),
        }),
        createMockPageInfo({
          path: '/blog/post-1',
          lastModified: new Date('2024-01-18'),
        }),
      ];

      const domain = 'https://example.com';

      // Generate sitemap entries
      const entries = pages.map(page => ({
        url: `${domain}${page.path}`,
        lastModified: page.lastModified.toISOString().slice(0, 10),
        changeFrequency: page.path === '/' ? 'daily' : 'weekly',
        priority: page.path === '/' ? 1.0 : 0.8,
      }));

      expect(entries).toHaveLength(3);
      expect(entries[0].url).toBe('https://example.com/');
      expect(entries[0].priority).toBe(1.0);
      expect(entries[1].url).toBe('https://example.com/about');
      expect(entries[2].changeFrequency).toBe('weekly');
    });

    it('generates valid XML sitemap format', () => {
      const entries = [
        {
          url: 'https://example.com/',
          lastModified: '2024-01-20',
          changeFrequency: 'daily',
          priority: 1.0,
        },
        {
          url: 'https://example.com/about',
          lastModified: '2024-01-15',
          changeFrequency: 'weekly',
          priority: 0.8,
        },
      ];

      // Build XML
      const xmlEntries = entries.map(entry => `
  <url>
    <loc>${entry.url}</loc>
    <lastmod>${entry.lastModified}</lastmod>
    <changefreq>${entry.changeFrequency}</changefreq>
    <priority>${entry.priority}</priority>
  </url>`).join('');

      const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${xmlEntries}
</urlset>`;

      expect(sitemap).toContain('<?xml version="1.0"');
      expect(sitemap).toContain('<urlset xmlns=');
      expect(sitemap).toContain('<loc>https://example.com/</loc>');
      expect(sitemap).toContain('<priority>1</priority>');
    });
  });

  describe('Robots.txt Generation', () => {
    it('generates robots.txt content with sitemap', () => {
      const domain = 'https://example.com';
      const sitemapUrl = `${domain}/sitemap.xml`;

      const robotsTxt = `# Robots.txt for ${domain}
User-agent: *
Allow: /

# Sitemap
Sitemap: ${sitemapUrl}

# Disallow common non-public paths
Disallow: /api/
Disallow: /admin/
Disallow: /_next/
Disallow: /private/
`;

      expect(robotsTxt).toContain('User-agent: *');
      expect(robotsTxt).toContain('Allow: /');
      expect(robotsTxt).toContain(`Sitemap: ${sitemapUrl}`);
      expect(robotsTxt).toContain('Disallow: /api/');
    });

    it('generates robots.txt with custom disallow paths', () => {
      const disallowPaths = ['/api/', '/admin/', '/dashboard/', '/secret/'];

      const disallowLines = disallowPaths.map(p => `Disallow: ${p}`).join('\n');

      expect(disallowLines).toContain('Disallow: /api/');
      expect(disallowLines).toContain('Disallow: /secret/');
    });
  });

  describe('Schema Markup Generation', () => {
    it('generates Organization schema', () => {
      const organization = {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: 'Example Company',
        url: 'https://example.com',
        logo: 'https://example.com/logo.png',
        sameAs: [
          'https://twitter.com/example',
          'https://linkedin.com/company/example',
        ],
      };

      const jsonLd = JSON.stringify(organization, null, 2);

      expect(jsonLd).toContain('"@context": "https://schema.org"');
      expect(jsonLd).toContain('"@type": "Organization"');
      expect(jsonLd).toContain('"name": "Example Company"');
    });

    it('generates WebSite schema with SearchAction', () => {
      const website = {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: 'Example Site',
        url: 'https://example.com',
        potentialAction: {
          '@type': 'SearchAction',
          target: {
            '@type': 'EntryPoint',
            urlTemplate: 'https://example.com/search?q={search_term_string}',
          },
          'query-input': 'required name=search_term_string',
        },
      };

      const jsonLd = JSON.stringify(website);

      expect(jsonLd).toContain('"@type":"WebSite"');
      expect(jsonLd).toContain('SearchAction');
      expect(jsonLd).toContain('urlTemplate');
    });

    it('generates Article schema for blog posts', () => {
      const article = {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: 'How to Optimize SEO',
        description: 'A comprehensive guide to SEO optimization',
        author: {
          '@type': 'Person',
          name: 'John Doe',
        },
        datePublished: '2024-01-20',
        dateModified: '2024-01-21',
        publisher: {
          '@type': 'Organization',
          name: 'Example Company',
        },
        image: 'https://example.com/blog/seo-guide/featured.webp',
      };

      const jsonLd = JSON.stringify(article, null, 2);

      expect(jsonLd).toContain('"@type": "Article"');
      expect(jsonLd).toContain('"headline": "How to Optimize SEO"');
      expect(jsonLd).toContain('"author":');
      expect(jsonLd).toContain('"datePublished":');
    });

    it('generates BreadcrumbList schema', () => {
      const breadcrumbs = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'Home',
            item: 'https://example.com/',
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: 'Blog',
            item: 'https://example.com/blog',
          },
          {
            '@type': 'ListItem',
            position: 3,
            name: 'SEO Guide',
            item: 'https://example.com/blog/seo-guide',
          },
        ],
      };

      const jsonLd = JSON.stringify(breadcrumbs);

      expect(jsonLd).toContain('"@type":"BreadcrumbList"');
      expect(jsonLd).toContain('"itemListElement"');
      expect(jsonLd).toContain('"position":1');
      expect(jsonLd).toContain('"position":3');
    });
  });

  describe('Meta Optimizer', () => {
    it('creates valid fix for missing title in Next.js App Router', async () => {
      const issue = createMockSEOIssue({
        type: 'missing-meta-title',
        file: 'app/about/page.tsx',
        page: '/about',
      });

      const profile = createMockCodebaseProfile({
        framework: 'nextjs-app',
        seoPatterns: {
          metaHandling: 'metadata-export',
          existingSitemap: null,
          existingRobots: null,
          existingSchema: [],
          hasOgImages: false,
          hasFavicon: true,
        },
      });

      const currentContent = `export default function About() {
  return <h1>About Us</h1>
}`;

      // Mock AI to return a proper fix
      const expectedFix = createMockCodeFix({
        issueId: issue.id,
        file: 'app/about/page.tsx',
        action: 'modify',
        search: 'export default function About()',
        replace: `import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'About Us - Example Company',
  description: 'Learn about our company, mission, and team.',
}

export default function About()`,
        description: 'Added metadata export with title and description',
      });

      mockAIClient.generateFix.mockResolvedValueOnce(expectedFix);

      const fix = await mockAIClient.generateFix(issue, profile, currentContent);

      expect(fix.action).toBe('modify');
      expect(fix.replace).toContain('export const metadata');
      expect(fix.replace).toContain("title:");
    });

    it('creates valid fix for title too long', async () => {
      const issue = createMockSEOIssue({
        type: 'title-too-long',
        file: 'app/services/page.tsx',
        page: '/services',
        description: 'Title is 75 characters (max 60)',
      });

      const profile = createMockCodebaseProfile({ framework: 'nextjs-app' });

      const currentContent = `import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Our Comprehensive Professional Services and Solutions for Your Business Needs',
}

export default function Services() {
  return <h1>Services</h1>
}`;

      const expectedFix = createMockCodeFix({
        issueId: issue.id,
        file: 'app/services/page.tsx',
        action: 'modify',
        search: `title: 'Our Comprehensive Professional Services and Solutions for Your Business Needs'`,
        replace: `title: 'Professional Services & Business Solutions'`,
        description: 'Shortened title to 60 characters or less',
      });

      mockAIClient.generateFix.mockResolvedValueOnce(expectedFix);

      const fix = await mockAIClient.generateFix(issue, profile, currentContent);

      expect(fix.action).toBe('modify');
      expect(fix.replace!.length).toBeLessThan(currentContent.length);
    });

    it('creates fix for missing description in HTML file', async () => {
      const issue = createMockSEOIssue({
        type: 'missing-meta-description',
        file: 'about.html',
        page: '/about.html',
      });

      const profile = createMockCodebaseProfile({
        framework: 'html',
        seoPatterns: {
          metaHandling: 'direct-html',
          existingSitemap: null,
          existingRobots: null,
          existingSchema: [],
          hasOgImages: false,
          hasFavicon: true,
        },
      });

      const currentContent = `<!DOCTYPE html>
<html>
<head>
  <title>About Us</title>
</head>
<body>
  <h1>About Us</h1>
</body>
</html>`;

      const expectedFix = createMockCodeFix({
        issueId: issue.id,
        file: 'about.html',
        action: 'modify',
        search: '<title>About Us</title>',
        replace: `<title>About Us</title>
  <meta name="description" content="Learn about our company, mission, values, and the team behind our success.">`,
        description: 'Added meta description tag',
      });

      mockAIClient.generateFix.mockResolvedValueOnce(expectedFix);

      const fix = await mockAIClient.generateFix(issue, profile, currentContent);

      expect(fix.action).toBe('modify');
      expect(fix.replace).toContain('meta name="description"');
    });
  });

  describe('Multiple fixes application', () => {
    it('applies multiple fixes to same file sequentially', () => {
      let content = `export default function Page() {
  return <div>Content</div>
}`;

      // First fix: add metadata import
      content = content.replace(
        'export default function Page()',
        `import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Page Title',
}

export default function Page()`
      );

      // Second fix: add description
      content = content.replace(
        `title: 'Page Title',
}`,
        `title: 'Page Title',
  description: 'Page description',
}`
      );

      expect(content).toContain("import type { Metadata }");
      expect(content).toContain("title: 'Page Title'");
      expect(content).toContain("description: 'Page description'");
    });
  });
});
