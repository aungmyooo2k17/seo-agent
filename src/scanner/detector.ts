/**
 * Framework detection module
 * Analyzes codebase to determine the web framework in use
 */

import type { FrameworkType, MetaHandlingType } from '../types';

/**
 * Package.json dependencies structure
 */
interface PackageJson {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

/**
 * Result of framework detection
 */
export interface DetectionResult {
  framework: FrameworkType;
  metaHandling: MetaHandlingType;
  version: string | undefined;
  confidence: 'high' | 'medium' | 'low';
}

/**
 * Detects the web framework used in a codebase
 */
export class FrameworkDetector {
  private files: string[];
  private packageJson: PackageJson | null;
  private fileSet: Set<string>;

  constructor(files: string[], packageJsonContent?: string) {
    this.files = files;
    this.fileSet = new Set(files);
    this.packageJson = packageJsonContent
      ? this.parsePackageJson(packageJsonContent)
      : null;
  }

  /**
   * Detect the framework and meta handling approach
   */
  detect(): DetectionResult {
    const deps = this.getAllDependencies();

    // Next.js detection
    if (deps.includes('next')) {
      return this.detectNextJSVariant(deps);
    }

    // Astro detection
    if (deps.includes('astro') || this.hasFile('astro.config.mjs') || this.hasFile('astro.config.ts')) {
      return {
        framework: 'astro',
        metaHandling: 'astro-head',
        version: this.getVersion('astro'),
        confidence: 'high',
      };
    }

    // Nuxt detection
    if (deps.includes('nuxt') || this.hasFile('nuxt.config.ts') || this.hasFile('nuxt.config.js')) {
      return {
        framework: 'nuxt',
        metaHandling: 'nuxt-usehead',
        version: this.getVersion('nuxt'),
        confidence: 'high',
      };
    }

    // Gatsby detection
    if (deps.includes('gatsby')) {
      return {
        framework: 'gatsby',
        metaHandling: 'react-helmet',
        version: this.getVersion('gatsby'),
        confidence: 'high',
      };
    }

    // Remix detection
    if (deps.includes('@remix-run/react') || deps.includes('@remix-run/node')) {
      return {
        framework: 'remix',
        metaHandling: 'direct-html',
        version: this.getVersion('@remix-run/react'),
        confidence: 'high',
      };
    }

    // SvelteKit detection
    if (deps.includes('@sveltejs/kit')) {
      return {
        framework: 'sveltekit',
        metaHandling: 'direct-html',
        version: this.getVersion('@sveltejs/kit'),
        confidence: 'high',
      };
    }

    // Vite + React
    if (deps.includes('vite') && deps.includes('react')) {
      return {
        framework: 'vite-react',
        metaHandling: deps.includes('react-helmet') || deps.includes('react-helmet-async')
          ? 'react-helmet'
          : 'unknown',
        version: this.getVersion('vite'),
        confidence: 'medium',
      };
    }

    // Vite + Vue
    if (deps.includes('vite') && deps.includes('vue')) {
      return {
        framework: 'vite-vue',
        metaHandling: 'unknown',
        version: this.getVersion('vite'),
        confidence: 'medium',
      };
    }

    // Plain HTML (no package.json or no framework deps)
    if (this.hasFile('index.html') || this.hasAnyHtmlFile()) {
      return {
        framework: 'html',
        metaHandling: 'direct-html',
        version: undefined,
        confidence: this.packageJson ? 'medium' : 'high',
      };
    }

    return {
      framework: 'unknown',
      metaHandling: 'unknown',
      version: undefined,
      confidence: 'low',
    };
  }

  /**
   * Detect Next.js variant (App Router vs Pages Router)
   */
  private detectNextJSVariant(_deps: string[]): DetectionResult {
    const version = this.getVersion('next');
    const majorVersion = version ? parseInt(version.split('.')[0] ?? '0', 10) : 0;

    // App Router indicators
    const hasAppLayout = this.hasFile('app/layout.tsx') ||
      this.hasFile('app/layout.jsx') ||
      this.hasFile('app/layout.js') ||
      this.hasFile('src/app/layout.tsx') ||
      this.hasFile('src/app/layout.jsx') ||
      this.hasFile('src/app/layout.js');

    const hasAppDir = this.hasDir('app') || this.hasDir('src/app');

    // Pages Router indicators
    const hasPagesDir = this.hasDir('pages') || this.hasDir('src/pages');
    const hasPagesIndex = this.hasFile('pages/index.tsx') ||
      this.hasFile('pages/index.jsx') ||
      this.hasFile('pages/index.js') ||
      this.hasFile('src/pages/index.tsx') ||
      this.hasFile('src/pages/index.jsx') ||
      this.hasFile('src/pages/index.js');

    // App Router takes precedence if both exist
    if (hasAppLayout || (hasAppDir && majorVersion >= 13)) {
      return {
        framework: 'nextjs-app',
        metaHandling: 'metadata-export',
        version,
        confidence: hasAppLayout ? 'high' : 'medium',
      };
    }

    if (hasPagesDir || hasPagesIndex) {
      return {
        framework: 'nextjs-pages',
        metaHandling: 'next-head',
        version,
        confidence: 'high',
      };
    }

    // Default for Next.js 13+ without clear indicators
    if (majorVersion >= 13) {
      return {
        framework: 'nextjs-app',
        metaHandling: 'metadata-export',
        version,
        confidence: 'low',
      };
    }

    return {
      framework: 'nextjs-pages',
      metaHandling: 'next-head',
      version,
      confidence: 'low',
    };
  }

  /**
   * Parse package.json content safely
   */
  private parsePackageJson(content: string): PackageJson | null {
    try {
      return JSON.parse(content) as PackageJson;
    } catch {
      return null;
    }
  }

  /**
   * Get all dependencies from package.json
   */
  private getAllDependencies(): string[] {
    if (!this.packageJson) return [];

    const deps = Object.keys(this.packageJson.dependencies || {});
    const devDeps = Object.keys(this.packageJson.devDependencies || {});

    return [...deps, ...devDeps];
  }

  /**
   * Get version of a specific package
   */
  private getVersion(pkg: string): string | undefined {
    if (!this.packageJson) return undefined;

    const version = this.packageJson.dependencies?.[pkg] ||
      this.packageJson.devDependencies?.[pkg];

    if (!version) return undefined;

    // Strip version prefix (^, ~, etc.)
    return version.replace(/^[\^~>=<]+/, '');
  }

  /**
   * Check if a specific file exists
   */
  private hasFile(path: string): boolean {
    return this.fileSet.has(path);
  }

  /**
   * Check if any file exists in a directory
   */
  private hasDir(dir: string): boolean {
    const prefix = dir.endsWith('/') ? dir : `${dir}/`;
    return this.files.some((f) => f.startsWith(prefix));
  }

  /**
   * Check if any HTML file exists in root
   */
  private hasAnyHtmlFile(): boolean {
    return this.files.some((f) => f.endsWith('.html') && !f.includes('/'));
  }
}

/**
 * Convenience function to detect framework from file list and package.json
 *
 * @param files - List of file paths in the codebase
 * @param packageJsonContent - Content of package.json if available
 * @returns Detection result
 */
export function detectFramework(
  files: string[],
  packageJsonContent?: string
): DetectionResult {
  const detector = new FrameworkDetector(files, packageJsonContent);
  return detector.detect();
}
