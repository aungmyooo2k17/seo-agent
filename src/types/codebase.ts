/**
 * Types for codebase analysis and structure detection
 */

/**
 * Supported web frameworks
 */
export type FrameworkType =
  | 'nextjs-app'
  | 'nextjs-pages'
  | 'astro'
  | 'nuxt'
  | 'gatsby'
  | 'remix'
  | 'sveltekit'
  | 'vite-react'
  | 'vite-vue'
  | 'html'
  | 'unknown';

/**
 * How the framework handles meta tags
 */
export type MetaHandlingType =
  | 'metadata-export'  // Next.js 13+ App Router
  | 'next-head'        // Next.js Pages Router
  | 'astro-head'       // Astro <head> component
  | 'nuxt-usehead'     // Nuxt useHead composable
  | 'react-helmet'     // React Helmet library
  | 'direct-html'      // Direct HTML manipulation
  | 'unknown';

/**
 * Complete profile of a scanned codebase
 */
export interface CodebaseProfile {
  /** Repository identifier */
  repoId: string;
  /** When the scan was performed */
  scannedAt: Date;
  /** Git commit hash at scan time */
  commitHash: string;
  /** Detected framework */
  framework: FrameworkType;
  /** Framework version if detected */
  frameworkVersion?: string;
  /** Directory structure information */
  structure: CodebaseStructure;
  /** Detected SEO patterns */
  seoPatterns: SEOPatterns;
  /** Build system configuration */
  buildSystem: BuildSystem;
  /** List of pages in the site */
  pages: PageInfo[];
  /** Paths safe for automated modification */
  safeZones: string[];
  /** Paths that should not be auto-modified */
  dangerZones: string[];
}

/**
 * Directory structure of the codebase
 */
export interface CodebaseStructure {
  /** Directory containing pages/routes */
  pagesDir: string;
  /** Directory containing components */
  componentsDir: string;
  /** Directory for static assets */
  publicDir: string;
  /** Directory for content (markdown, etc.) */
  contentDir?: string;
  /** Layout files (e.g., _app.tsx, layout.tsx) */
  layoutFiles: string[];
  /** Configuration files (next.config.js, etc.) */
  configFiles: string[];
}

/**
 * Detected SEO-related patterns in the codebase
 */
export interface SEOPatterns {
  /** How meta tags are handled */
  metaHandling: MetaHandlingType;
  /** Path to existing sitemap.xml if present */
  existingSitemap: string | null;
  /** Path to existing robots.txt if present */
  existingRobots: string | null;
  /** Existing schema markup files/patterns */
  existingSchema: string[];
  /** Whether OG images are configured */
  hasOgImages: boolean;
  /** Whether favicon is present */
  hasFavicon: boolean;
}

/**
 * Build system configuration
 */
export interface BuildSystem {
  /** Package manager in use */
  packageManager: 'npm' | 'yarn' | 'pnpm' | 'bun';
  /** Command to build the project */
  buildCommand: string;
  /** Command to run dev server */
  devCommand: string;
  /** Output directory for builds */
  outDir: string;
}

/**
 * Information about a single page
 */
export interface PageInfo {
  /** URL path (e.g., /about) */
  path: string;
  /** File path on disk */
  filePath: string;
  /** Page title if found */
  title?: string;
  /** Meta description if found */
  description?: string;
  /** Whether page has OG image configured */
  hasOgImage: boolean;
  /** Whether page has schema markup */
  hasSchema: boolean;
  /** Images used on the page */
  images: ImageInfo[];
  /** Internal links found on the page */
  internalLinks: string[];
  /** Approximate word count of content */
  wordCount: number;
  /** Last modification date */
  lastModified: Date;
}

/**
 * Information about an image on a page
 */
export interface ImageInfo {
  /** Image source URL or path */
  src: string;
  /** Alt text if present */
  alt: string | null;
  /** Whether image is hosted locally */
  isLocal: boolean;
  /** Image dimensions if known */
  dimensions?: { width: number; height: number };
}
