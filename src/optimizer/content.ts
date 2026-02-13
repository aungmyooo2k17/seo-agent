/**
 * Content generation engine for SEO-optimized blog posts
 *
 * Orchestrates AI content generation with image creation
 * and framework-specific formatting.
 */

import type {
  IAIClient,
  BlogPost,
  CodebaseProfile,
  RepoSettings,
  RepoConfig,
} from '../types'
import { ImageService } from './images'

/**
 * Framework handler interface for content formatting
 *
 * Each supported framework implements this to handle
 * framework-specific content file generation.
 */
export interface IFrameworkHandler {
  /** Framework identifier */
  readonly framework: string

  /** Get the content directory path */
  getContentDir(profile: CodebaseProfile): string

  /** Get the file extension for content files */
  getContentExtension(): 'mdx' | 'md' | 'html'

  /** Format frontmatter for the framework */
  formatFrontmatter(post: BlogPost): string

  /** Get the full file path for a post */
  getFilePath(profile: CodebaseProfile, slug: string): string

  /** Get the public URL path for the post */
  getUrlPath(slug: string): string
}

/**
 * Content generator for blog posts and related content
 *
 * Features:
 * - AI-powered blog post generation
 * - Automatic featured image generation
 * - Framework-aware content formatting
 * - Publishing frequency management
 */
export class ContentGenerator {
  constructor(
    private ai: IAIClient,
    private imageService: ImageService
  ) {}

  /**
   * Check if content should be generated based on frequency setting
   *
   * Compares time since last publication against configured frequency.
   *
   * @param repo - Repository configuration
   * @param lastPublished - Date of last published content (null if never)
   * @returns true if enough time has passed to publish new content
   */
  shouldGenerateContent(repo: RepoConfig, lastPublished: Date | null): boolean {
    // Always generate if no content has been published yet
    if (!lastPublished) {
      return true
    }

    const daysSince =
      (Date.now() - lastPublished.getTime()) / (1000 * 60 * 60 * 24)

    switch (repo.settings.contentFrequency) {
      case 'daily':
        return daysSince >= 1
      case 'weekly':
        return daysSince >= 7
      case 'biweekly':
        return daysSince >= 14
      case 'monthly':
        return daysSince >= 30
      default:
        // Unknown frequency - don't generate
        return false
    }
  }

  /**
   * Get days until next content should be generated
   */
  getDaysUntilNextContent(
    repo: RepoConfig,
    lastPublished: Date | null
  ): number {
    if (!lastPublished) {
      return 0
    }

    const frequencyDays: Record<string, number> = {
      daily: 1,
      weekly: 7,
      biweekly: 14,
      monthly: 30,
    }

    const targetDays = frequencyDays[repo.settings.contentFrequency] ?? 7
    const daysSince =
      (Date.now() - lastPublished.getTime()) / (1000 * 60 * 60 * 24)

    return Math.max(0, Math.ceil(targetDays - daysSince))
  }

  /**
   * Generate a complete blog post with featured image
   *
   * Pipeline:
   * 1. Generate blog content via AI
   * 2. Generate featured image
   * 3. Format for target framework
   *
   * @param topic - Topic to write about
   * @param keyword - Target SEO keyword
   * @param profile - Codebase profile for context
   * @param settings - Repository settings
   * @param handler - Framework handler for formatting
   * @returns Generated post, image buffer, and target file path
   */
  async generatePost(
    topic: string,
    keyword: string,
    profile: CodebaseProfile,
    settings: RepoSettings,
    handler: IFrameworkHandler
  ): Promise<{ post: BlogPost; imageBuffer: Buffer; imagePath: string }> {
    // Step 1: Generate the blog post content via AI
    const post = await this.ai.generateBlog(topic, keyword, profile, settings)

    // Step 2: Set the file path based on framework
    post.filePath = handler.getFilePath(profile, post.slug)
    post.format = handler.getContentExtension()

    // Step 3: Generate featured image if quota allows
    let imageBuffer: Buffer
    let imagePath: string

    const canGenerateImage = await this.imageService.canGenerate(profile.repoId)

    if (canGenerateImage) {
      const generatedImage = await this.imageService.generateBlogImage({
        title: post.title,
        topic,
        tone: settings.tone,
        slug: post.slug,
      })

      imageBuffer = generatedImage.buffer
      imagePath = this.getImagePath(profile, post.slug, handler)
      post.featuredImage = generatedImage
    } else {
      // Create a placeholder - no image generated
      imageBuffer = Buffer.alloc(0)
      imagePath = ''
    }

    return { post, imageBuffer, imagePath }
  }

  /**
   * Format a blog post for the specific framework
   *
   * Combines frontmatter with content in framework-appropriate format.
   *
   * @param post - Blog post to format
   * @param handler - Framework handler
   * @returns Complete file content ready to write
   */
  formatForFramework(post: BlogPost, handler: IFrameworkHandler): string {
    const frontmatter = handler.formatFrontmatter(post)
    return `${frontmatter}\n\n${post.content}`
  }

  /**
   * Get the image path for a blog post
   */
  private getImagePath(
    profile: CodebaseProfile,
    slug: string,
    handler: IFrameworkHandler
  ): string {
    const contentDir = handler.getContentDir(profile)
    // Images typically go in public or alongside content
    const safeSlug = slug.replace(/[^a-z0-9-]/gi, '-')

    // If there's a public directory, use it
    if (profile.structure.publicDir) {
      return `${profile.structure.publicDir}/images/blog/${safeSlug}-featured.webp`
    }

    // Otherwise place alongside content
    return `${contentDir}/${safeSlug}/featured.webp`
  }

  /**
   * Generate a slug from a title
   */
  static generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 60)
  }

  /**
   * Check if a topic has already been covered
   *
   * Useful for avoiding duplicate content.
   */
  static isTopicCovered(
    topic: string,
    existingTitles: string[],
    threshold: number = 0.7
  ): boolean {
    const normalizedTopic = topic.toLowerCase().trim()

    for (const title of existingTitles) {
      const normalizedTitle = title.toLowerCase().trim()

      // Check for exact match
      if (normalizedTitle.includes(normalizedTopic)) {
        return true
      }

      // Check for significant word overlap
      const topicWords = new Set(normalizedTopic.split(/\s+/))
      const titleWords = normalizedTitle.split(/\s+/)
      const matchingWords = titleWords.filter((w) => topicWords.has(w))

      if (matchingWords.length / topicWords.size >= threshold) {
        return true
      }
    }

    return false
  }

  /**
   * Estimate reading time for content
   */
  static estimateReadingTime(content: string): number {
    const wordsPerMinute = 200
    const wordCount = content.split(/\s+/).length
    return Math.ceil(wordCount / wordsPerMinute)
  }

  /**
   * Extract keywords from content for internal linking
   */
  static extractKeywords(content: string, maxKeywords: number = 10): string[] {
    // Remove markdown syntax
    const plainText = content
      .replace(/```[\s\S]*?```/g, '')
      .replace(/`[^`]+`/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/[#*_~]/g, '')
      .toLowerCase()

    // Count word frequencies (excluding common words)
    const stopWords = new Set([
      'the',
      'a',
      'an',
      'and',
      'or',
      'but',
      'in',
      'on',
      'at',
      'to',
      'for',
      'of',
      'with',
      'by',
      'from',
      'is',
      'are',
      'was',
      'were',
      'be',
      'been',
      'being',
      'have',
      'has',
      'had',
      'do',
      'does',
      'did',
      'will',
      'would',
      'could',
      'should',
      'may',
      'might',
      'can',
      'this',
      'that',
      'these',
      'those',
      'it',
      'its',
      'you',
      'your',
      'we',
      'our',
      'they',
      'their',
      'what',
      'which',
      'who',
      'when',
      'where',
      'why',
      'how',
      'all',
      'each',
      'every',
      'both',
      'few',
      'more',
      'most',
      'other',
      'some',
      'such',
      'no',
      'not',
      'only',
      'same',
      'so',
      'than',
      'too',
      'very',
      'just',
      'also',
    ])

    const words = plainText.match(/\b[a-z]{4,}\b/g) || []
    const wordCounts = new Map<string, number>()

    for (const word of words) {
      if (!stopWords.has(word)) {
        wordCounts.set(word, (wordCounts.get(word) || 0) + 1)
      }
    }

    // Sort by frequency and return top keywords
    return Array.from(wordCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, maxKeywords)
      .map(([word]) => word)
  }
}

/**
 * Default framework handler for MDX-based frameworks
 *
 * Works with Next.js, Astro, and similar frameworks
 * that use MDX files with YAML frontmatter.
 */
export class DefaultFrameworkHandler implements IFrameworkHandler {
  readonly framework = 'default'

  getContentDir(profile: CodebaseProfile): string {
    return profile.structure.contentDir || 'content/blog'
  }

  getContentExtension(): 'mdx' | 'md' | 'html' {
    return 'mdx'
  }

  formatFrontmatter(post: BlogPost): string {
    const fm: Record<string, unknown> = {
      title: post.title,
      slug: post.slug,
      description: post.metaDescription,
      author: post.author,
      publishedAt: post.publishedAt.toISOString(),
      ...post.frontmatter,
    }

    if (post.featuredImage) {
      fm['image'] = `/images/blog/${post.featuredImage.filename}`
      fm['imageAlt'] = post.featuredImage.altText
    }

    const lines = ['---']
    for (const [key, value] of Object.entries(fm)) {
      if (typeof value === 'string') {
        // Escape quotes in string values
        lines.push(`${key}: "${value.replace(/"/g, '\\"')}"`)
      } else if (value instanceof Date) {
        lines.push(`${key}: "${value.toISOString()}"`)
      } else if (Array.isArray(value)) {
        lines.push(`${key}:`)
        for (const item of value) {
          lines.push(`  - "${String(item).replace(/"/g, '\\"')}"`)
        }
      } else {
        lines.push(`${key}: ${JSON.stringify(value)}`)
      }
    }
    lines.push('---')

    return lines.join('\n')
  }

  getFilePath(profile: CodebaseProfile, slug: string): string {
    const contentDir = this.getContentDir(profile)
    return `${contentDir}/${slug}.mdx`
  }

  getUrlPath(slug: string): string {
    return `/blog/${slug}`
  }
}
