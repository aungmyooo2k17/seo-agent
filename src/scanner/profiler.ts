/**
 * Codebase profiler module
 * Builds a complete profile of a codebase for SEO analysis
 */

import type {
  CodebaseProfile,
  CodebaseStructure,
  SEOPatterns,
  BuildSystem,
  PageInfo,
  ImageInfo,
} from '../types';
import { detectFramework, type DetectionResult } from './detector';
import { getHandler } from './frameworks';

/**
 * Options for profiling
 */
export interface ProfilerOptions {
  /** Repository ID */
  repoId: string;
  /** Current git commit hash */
  commitHash: string;
  /** Paths to exclude from analysis */
  excludePaths?: string[];
}

/**
 * File reader interface for dependency injection
 */
export interface IFileReader {
  readFile(path: string): Promise<string>;
  listFiles(pattern?: string): Promise<string[]>;
}

/**
 * Builds a complete codebase profile for SEO analysis
 */
export class CodebaseProfiler {
  private reader: IFileReader;
  private options: ProfilerOptions;

  constructor(reader: IFileReader, options: ProfilerOptions) {
    this.reader = reader;
    this.options = options;
  }

  /**
   * Build a complete codebase profile
   */
  async profile(): Promise<CodebaseProfile> {
    // Get all files
    const allFiles = await this.reader.listFiles();
    const files = this.filterExcludedPaths(allFiles);

    // Read package.json
    const packageJson = await this.safeReadFile('package.json');

    // Detect framework
    const detection = detectFramework(files, packageJson ?? undefined);

    // Build structure
    const structure = await this.buildStructure(files, detection);

    // Detect SEO patterns
    const seoPatterns = await this.detectSEOPatterns(files);

    // Detect build system
    const buildSystem = await this.detectBuildSystem(packageJson ?? undefined);

    // Scan pages
    const pages = await this.scanPages(files, detection);

    // Determine safe and danger zones
    const { safeZones, dangerZones } = this.categorizeZones(structure);

    const profile: CodebaseProfile = {
      repoId: this.options.repoId,
      scannedAt: new Date(),
      commitHash: this.options.commitHash,
      framework: detection.framework,
      structure,
      seoPatterns,
      buildSystem,
      pages,
      safeZones,
      dangerZones,
    };

    // Only add frameworkVersion if it exists
    if (detection.version) {
      profile.frameworkVersion = detection.version;
    }

    return profile;
  }

  /**
   * Filter out excluded paths
   */
  private filterExcludedPaths(files: string[]): string[] {
    const excludes = this.options.excludePaths ?? [];
    const excludePatterns = [
      ...excludes,
      'node_modules/',
      '.git/',
      '.next/',
      'dist/',
      'build/',
      '.cache/',
      'coverage/',
    ];

    return files.filter((f) =>
      !excludePatterns.some((pattern) => f.includes(pattern))
    );
  }

  /**
   * Build codebase structure
   */
  private async buildStructure(
    files: string[],
    detection: DetectionResult
  ): Promise<CodebaseStructure> {
    const handler = getHandler(detection.framework);

    // Detect pages directory
    const pagesDir = this.detectPagesDir(files, detection);

    // Detect components directory
    const componentsDir = this.detectComponentsDir(files);

    // Detect public/static directory
    const publicDir = this.detectPublicDir(files);

    // Detect content directory
    const contentDir = this.detectContentDir(files);

    // Get layout files
    const layoutFiles = handler.getLayoutFiles(files);

    // Get config files
    const configFiles = this.detectConfigFiles(files);

    const structure: CodebaseStructure = {
      pagesDir,
      componentsDir,
      publicDir,
      layoutFiles,
      configFiles,
    };

    // Only add contentDir if it exists
    if (contentDir) {
      structure.contentDir = contentDir;
    }

    return structure;
  }

  /**
   * Detect pages directory based on framework
   */
  private detectPagesDir(files: string[], detection: DetectionResult): string {
    switch (detection.framework) {
      case 'nextjs-app':
        if (files.some((f) => f.startsWith('src/app/'))) return 'src/app';
        return 'app';
      case 'nextjs-pages':
        if (files.some((f) => f.startsWith('src/pages/'))) return 'src/pages';
        return 'pages';
      case 'astro':
        return 'src/pages';
      case 'nuxt':
        return 'pages';
      case 'gatsby':
        return 'src/pages';
      case 'remix':
        return 'app/routes';
      case 'sveltekit':
        return 'src/routes';
      default:
        return '.';
    }
  }

  /**
   * Detect components directory
   */
  private detectComponentsDir(files: string[]): string {
    const componentDirs = [
      'src/components',
      'components',
      'src/ui',
      'app/components',
    ];

    for (const dir of componentDirs) {
      if (files.some((f) => f.startsWith(`${dir}/`))) {
        return dir;
      }
    }

    return 'components';
  }

  /**
   * Detect public/static assets directory
   */
  private detectPublicDir(files: string[]): string {
    if (files.some((f) => f.startsWith('public/'))) return 'public';
    if (files.some((f) => f.startsWith('static/'))) return 'static';
    return 'public';
  }

  /**
   * Detect content directory (for blogs, etc.)
   */
  private detectContentDir(files: string[]): string | undefined {
    const contentDirs = [
      'src/content',
      'content',
      'posts',
      'src/posts',
      '_posts',
      'data',
    ];

    for (const dir of contentDirs) {
      if (files.some((f) => f.startsWith(`${dir}/`))) {
        return dir;
      }
    }

    return undefined;
  }

  /**
   * Detect configuration files
   */
  private detectConfigFiles(files: string[]): string[] {
    const configPatterns = [
      'next.config.js',
      'next.config.mjs',
      'next.config.ts',
      'astro.config.mjs',
      'astro.config.ts',
      'nuxt.config.ts',
      'nuxt.config.js',
      'gatsby-config.js',
      'gatsby-config.ts',
      'vite.config.js',
      'vite.config.ts',
      'svelte.config.js',
      'tailwind.config.js',
      'tailwind.config.ts',
      'tsconfig.json',
      'package.json',
    ];

    return files.filter((f) => configPatterns.includes(f));
  }

  /**
   * Detect existing SEO patterns
   */
  private async detectSEOPatterns(files: string[]): Promise<SEOPatterns> {
    // Detect existing sitemap
    const existingSitemap = this.findSitemap(files);

    // Detect existing robots.txt
    const existingRobots = this.findRobots(files);

    // Detect schema markup files
    const existingSchema = this.findSchemaFiles(files);

    // Check for OG images
    const hasOgImages = files.some((f) =>
      f.includes('og-image') || f.includes('opengraph-image')
    );

    // Check for favicon
    const hasFavicon = files.some((f) =>
      f.includes('favicon') || f.includes('icon.')
    );

    // Detect meta handling approach (from framework detection)
    const packageJson = await this.safeReadFile('package.json');
    const detection = detectFramework(files, packageJson ?? undefined);

    return {
      metaHandling: detection.metaHandling,
      existingSitemap,
      existingRobots,
      existingSchema,
      hasOgImages,
      hasFavicon,
    };
  }

  /**
   * Find existing sitemap
   */
  private findSitemap(files: string[]): string | null {
    const sitemapPatterns = [
      'public/sitemap.xml',
      'sitemap.xml',
      'app/sitemap.ts',
      'app/sitemap.tsx',
      'src/app/sitemap.ts',
    ];

    for (const pattern of sitemapPatterns) {
      if (files.includes(pattern)) {
        return pattern;
      }
    }

    return null;
  }

  /**
   * Find existing robots.txt
   */
  private findRobots(files: string[]): string | null {
    const robotsPatterns = [
      'public/robots.txt',
      'robots.txt',
      'app/robots.ts',
      'app/robots.tsx',
      'src/app/robots.ts',
    ];

    for (const pattern of robotsPatterns) {
      if (files.includes(pattern)) {
        return pattern;
      }
    }

    return null;
  }

  /**
   * Find schema markup files
   */
  private findSchemaFiles(files: string[]): string[] {
    return files.filter((f) =>
      f.includes('schema') ||
      f.includes('jsonld') ||
      f.includes('json-ld') ||
      f.includes('structured-data')
    );
  }

  /**
   * Detect build system configuration
   */
  private async detectBuildSystem(packageJsonContent: string | undefined): Promise<BuildSystem> {
    // Detect package manager from lock files
    const files = await this.reader.listFiles();
    let packageManager: 'npm' | 'yarn' | 'pnpm' | 'bun' = 'npm';

    if (files.includes('pnpm-lock.yaml')) {
      packageManager = 'pnpm';
    } else if (files.includes('yarn.lock')) {
      packageManager = 'yarn';
    } else if (files.includes('bun.lockb')) {
      packageManager = 'bun';
    }

    // Parse package.json for scripts
    let buildCommand = `${packageManager} run build`;
    let devCommand = `${packageManager} run dev`;

    if (packageJsonContent) {
      try {
        const pkg = JSON.parse(packageJsonContent) as {
          scripts?: Record<string, string>;
        };
        if (pkg.scripts?.['build']) {
          buildCommand = `${packageManager} run build`;
        }
        if (pkg.scripts?.['dev']) {
          devCommand = `${packageManager} run dev`;
        } else if (pkg.scripts?.['start']) {
          devCommand = `${packageManager} run start`;
        }
      } catch {
        // Use defaults
      }
    }

    // Detect output directory
    const outDir = this.detectOutputDir(files);

    return {
      packageManager,
      buildCommand,
      devCommand,
      outDir,
    };
  }

  /**
   * Detect build output directory
   */
  private detectOutputDir(files: string[]): string {
    const outDirs = ['.next', 'dist', 'build', 'out', '.output', '.astro'];

    for (const dir of outDirs) {
      if (files.some((f) => f.startsWith(`${dir}/`))) {
        return dir;
      }
    }

    return 'dist';
  }

  /**
   * Scan all pages and extract info
   */
  private async scanPages(
    files: string[],
    detection: DetectionResult
  ): Promise<PageInfo[]> {
    const handler = getHandler(detection.framework);
    const pageFiles = handler.getPageFiles(files);
    const pages: PageInfo[] = [];

    for (const filePath of pageFiles) {
      const content = await this.safeReadFile(filePath);
      if (!content) continue;

      const meta = await handler.extractMeta(content);
      const images = this.extractImages(content);
      const internalLinks = this.extractInternalLinks(content);
      const wordCount = this.countWords(content);
      const urlPath = this.filePathToUrlPath(filePath, detection);

      const pageInfo: PageInfo = {
        path: urlPath,
        filePath,
        hasOgImage: this.hasOgImage(content),
        hasSchema: this.hasSchemaMarkup(content),
        images,
        internalLinks,
        wordCount,
        lastModified: new Date(), // Would ideally come from git
      };

      // Only add title and description if they exist
      if (meta?.title) {
        pageInfo.title = meta.title;
      }
      if (meta?.description) {
        pageInfo.description = meta.description;
      }

      pages.push(pageInfo);
    }

    return pages;
  }

  /**
   * Convert file path to URL path
   */
  private filePathToUrlPath(filePath: string, detection: DetectionResult): string {
    let path = filePath;

    // Remove directory prefix
    switch (detection.framework) {
      case 'nextjs-app':
        path = path.replace(/^(src\/)?app/, '');
        path = path.replace(/\/page\.(tsx|jsx|js)$/, '');
        break;
      case 'nextjs-pages':
        path = path.replace(/^(src\/)?pages/, '');
        path = path.replace(/\.(tsx|jsx|js)$/, '');
        break;
      case 'astro':
        path = path.replace(/^src\/pages/, '');
        path = path.replace(/\.astro$/, '');
        path = path.replace(/\.(md|mdx)$/, '');
        break;
      case 'html':
        path = path.replace(/\.html?$/, '');
        break;
      default:
        path = path.replace(/\.(tsx|jsx|js|vue|svelte)$/, '');
    }

    // Handle index files
    path = path.replace(/\/index$/, '');

    // Ensure starts with /
    if (!path.startsWith('/')) {
      path = `/${path}`;
    }

    // Handle root
    if (path === '') {
      path = '/';
    }

    return path;
  }

  /**
   * Extract images from content
   */
  private extractImages(content: string): ImageInfo[] {
    const images: ImageInfo[] = [];

    // Match img tags
    const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*(?:alt=["']([^"']*?)["'])?[^>]*>/gi;
    let match: RegExpExecArray | null;

    while ((match = imgRegex.exec(content)) !== null) {
      const src = match[1];
      const alt = match[2] ?? null;

      if (src) {
        images.push({
          src,
          alt,
          isLocal: !src.startsWith('http'),
        });
      }
    }

    // Match Next.js Image components
    const nextImageRegex = /<Image[^>]+src=["'{]([^"'}]+)["'}][^>]*(?:alt=["']([^"']*?)["'])?[^>]*>/gi;
    while ((match = nextImageRegex.exec(content)) !== null) {
      const src = match[1];
      const alt = match[2] ?? null;

      if (src) {
        images.push({
          src,
          alt,
          isLocal: !src.startsWith('http'),
        });
      }
    }

    return images;
  }

  /**
   * Extract internal links from content
   */
  private extractInternalLinks(content: string): string[] {
    const links: Set<string> = new Set();

    // Match href attributes
    const hrefRegex = /href=["']([^"']+)["']/gi;
    let match: RegExpExecArray | null;

    while ((match = hrefRegex.exec(content)) !== null) {
      const href = match[1];

      // Only internal links
      if (href && href.startsWith('/') && !href.startsWith('//')) {
        const cleanHref = href.split('#')[0]?.split('?')[0];
        if (cleanHref) {
          links.add(cleanHref);
        }
      }
    }

    // Match Next.js Link components
    const linkRegex = /<Link[^>]+href=["']([^"']+)["']/gi;
    while ((match = linkRegex.exec(content)) !== null) {
      const href = match[1];
      if (href && href.startsWith('/')) {
        const cleanHref = href.split('#')[0]?.split('?')[0];
        if (cleanHref) {
          links.add(cleanHref);
        }
      }
    }

    return Array.from(links);
  }

  /**
   * Count words in content (excluding code)
   */
  private countWords(content: string): number {
    // Remove code blocks
    let text = content.replace(/<code[^>]*>[\s\S]*?<\/code>/gi, '');
    text = content.replace(/```[\s\S]*?```/g, '');
    text = text.replace(/`[^`]+`/g, '');

    // Remove HTML tags
    text = text.replace(/<[^>]+>/g, ' ');

    // Remove JSX expressions
    text = text.replace(/\{[^}]+\}/g, ' ');

    // Count words
    const words = text.split(/\s+/).filter((w) => w.length > 0);
    return words.length;
  }

  /**
   * Check if content has OG image configured
   */
  private hasOgImage(content: string): boolean {
    return (
      content.includes('og:image') ||
      content.includes('openGraph') ||
      content.includes('opengraph-image')
    );
  }

  /**
   * Check if content has schema markup
   */
  private hasSchemaMarkup(content: string): boolean {
    return (
      content.includes('application/ld+json') ||
      content.includes('@context') ||
      content.includes('schema.org')
    );
  }

  /**
   * Categorize directories into safe and danger zones
   */
  private categorizeZones(
    structure: CodebaseStructure
  ): { safeZones: string[]; dangerZones: string[] } {
    // Safe zones: content directories, public assets, new files
    const safeZones = [
      structure.publicDir,
      structure.contentDir,
      'content',
      'posts',
      'blog',
    ].filter((z): z is string => Boolean(z));

    // Danger zones: config, core app files, node_modules
    const dangerZones = [
      ...structure.configFiles,
      'node_modules',
      '.git',
      'src/lib',
      'src/utils',
      'lib',
      'utils',
    ];

    return { safeZones, dangerZones };
  }

  /**
   * Safely read a file, returning null on error
   */
  private async safeReadFile(path: string): Promise<string | null> {
    try {
      return await this.reader.readFile(path);
    } catch {
      return null;
    }
  }
}

/**
 * Create a profile from a file reader
 */
export async function profileCodebase(
  reader: IFileReader,
  options: ProfilerOptions
): Promise<CodebaseProfile> {
  const profiler = new CodebaseProfiler(reader, options);
  return profiler.profile();
}
