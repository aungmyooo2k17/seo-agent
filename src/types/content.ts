/**
 * Types for content generation and management
 */

import type { GeneratedImage } from './services';

export type { GeneratedImage };

/**
 * A generated blog post
 */
export interface BlogPost {
  /** Unique identifier */
  id: string;
  /** Repository this post belongs to */
  repoId: string;
  /** Post title */
  title: string;
  /** URL slug */
  slug: string;
  /** Full content (markdown/mdx) */
  content: string;
  /** Short excerpt for listings */
  excerpt: string;
  /** Primary target keyword */
  targetKeyword: string;
  /** Secondary keywords to include */
  secondaryKeywords: string[];
  /** Meta description for SEO */
  metaDescription: string;
  /** Featured image if generated */
  featuredImage?: GeneratedImage;
  /** Author attribution */
  author: string;
  /** Publication date */
  publishedAt: Date;
  /** Frontmatter fields for the content file */
  frontmatter: Record<string, unknown>;
  /** Where to save the file */
  filePath: string;
  /** Content format */
  format: 'mdx' | 'md' | 'html';
}

/**
 * An opportunity to add/improve an image
 */
export interface ImageOpportunity {
  /** Type of image opportunity */
  type: 'featured' | 'og' | 'alt-text' | 'hero';
  /** Page where the opportunity exists */
  page: string;
  /** Existing image path if relevant */
  image?: string;
  /** How important this opportunity is */
  priority: 'high' | 'medium' | 'low';
  /** Why this is an opportunity */
  reason: string;
}

/**
 * A scheduled content item
 */
export interface ContentCalendarEntry {
  /** Unique identifier */
  id: string;
  /** Repository this entry is for */
  repoId: string;
  /** Topic to write about */
  topic: string;
  /** Target keyword for the content */
  targetKeyword: string;
  /** When to generate/publish */
  scheduledFor: Date;
  /** Current status */
  status: 'scheduled' | 'generated' | 'published' | 'cancelled';
  /** ID of generated content if available */
  contentId?: string;
}
