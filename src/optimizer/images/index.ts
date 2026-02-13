/**
 * Image generation and optimization service
 *
 * Provides AI-powered image generation with rate limiting,
 * optimization, and SEO-focused features like alt text generation.
 */

import type {
  IAIClient,
  IImageService,
  BlogImageContext,
  GeneratedImage,
  ImageOpportunity,
  PageInfo,
} from '../../types'
import { generateWithReplicate } from './replicate'
import { optimizeImage, BLOG_IMAGE_DEFAULTS } from './optimizer'

// Re-export utilities for direct access
export { generateWithReplicate, isValidModel, getAvailableModels } from './replicate'
export {
  optimizeImage,
  addTextOverlay,
  createSolidBackground,
  getImageMetadata,
  BLOG_IMAGE_DEFAULTS,
  OG_IMAGE_DEFAULTS,
} from './optimizer'
export type { OptimizeOptions } from './optimizer'

/**
 * Image service for generating and optimizing images for SEO
 *
 * Features:
 * - AI-powered image generation via Replicate
 * - Daily rate limiting per repository
 * - Automatic optimization (resize, format conversion)
 * - Alt text generation for accessibility and SEO
 * - OG image generation with text overlays
 */
export class ImageService implements IImageService {
  private ai: IAIClient
  private provider: string
  private model: string
  private maxPerDay: number

  /**
   * Track daily image generation counts per repo
   * Key format: `${repoId}-${YYYY-MM-DD}`
   */
  private dailyCounts: Map<string, number> = new Map()

  constructor(ai: IAIClient) {
    this.ai = ai
    this.provider = process.env['IMAGE_PROVIDER'] || 'replicate'
    this.model = process.env['IMAGE_MODEL'] || 'flux-schnell'
    this.maxPerDay = parseInt(process.env['MAX_IMAGES_PER_DAY'] || '5', 10)
  }

  /**
   * Get the cache key for daily count tracking
   */
  private getDailyKey(repoId: string): string {
    const today = new Date().toISOString().split('T')[0]
    return `${repoId}-${today}`
  }

  /**
   * Increment the daily count for a repository
   */
  private incrementCount(repoId: string): void {
    const key = this.getDailyKey(repoId)
    const current = this.dailyCounts.get(key) || 0
    this.dailyCounts.set(key, current + 1)
  }

  /**
   * Check if more images can be generated today for a repository
   *
   * @param repoId - Repository identifier
   * @returns true if under the daily limit
   */
  async canGenerate(repoId: string): Promise<boolean> {
    const key = this.getDailyKey(repoId)
    const count = this.dailyCounts.get(key) || 0
    return count < this.maxPerDay
  }

  /**
   * Get remaining image quota for today
   */
  getRemainingQuota(repoId: string): number {
    const key = this.getDailyKey(repoId)
    const count = this.dailyCounts.get(key) || 0
    return Math.max(0, this.maxPerDay - count)
  }

  /**
   * Generate a featured image for a blog post
   *
   * Pipeline:
   * 1. Generate prompt using AI based on blog context
   * 2. Generate raw image via Replicate
   * 3. Optimize to target dimensions and format
   * 4. Generate SEO-friendly alt text
   *
   * @param context - Blog post context for image generation
   * @returns Generated image with metadata
   * @throws Error if rate limited or generation fails
   */
  async generateBlogImage(context: BlogImageContext): Promise<GeneratedImage> {
    // Rate limit check - extract repoId from slug or use a default tracking
    const trackingId = context.slug.split('/')[0] || 'default'

    if (!(await this.canGenerate(trackingId))) {
      throw new Error(
        `Daily image limit (${this.maxPerDay}) reached for ${trackingId}`
      )
    }

    // Step 1: Generate image prompt using AI
    const prompt = await this.ai.generateImagePrompt({
      title: context.title,
      topic: context.topic,
      tone: context.tone,
    })

    // Step 2: Generate raw image with Replicate
    const rawImage = await generateWithReplicate(prompt, this.model)

    // Step 3: Optimize for web
    const optimized = await optimizeImage(rawImage, {
      width: BLOG_IMAGE_DEFAULTS.width,
      height: BLOG_IMAGE_DEFAULTS.height,
      format: BLOG_IMAGE_DEFAULTS.format,
      quality: BLOG_IMAGE_DEFAULTS.quality,
    })

    // Step 4: Generate alt text
    const altText = await this.ai.generateAltText(
      `Blog post titled "${context.title}" about ${context.topic}`,
      context.topic
    )

    // Step 5: Track usage
    this.incrementCount(trackingId)

    // Step 6: Build filename from slug
    const filename = `${context.slug.replace(/[^a-z0-9-]/gi, '-')}-featured.webp`

    return {
      buffer: optimized,
      filename,
      altText,
      prompt,
      provider: this.provider,
      model: this.model,
      dimensions: {
        width: BLOG_IMAGE_DEFAULTS.width,
        height: BLOG_IMAGE_DEFAULTS.height,
      },
      sizeBytes: optimized.length,
    }
  }

  /**
   * Generate an Open Graph image with title overlay
   *
   * Creates a branded OG image suitable for social sharing.
   * Uses a gradient background with text overlay.
   *
   * @param title - Page title to display
   * @param domain - Domain for branding
   * @returns PNG buffer optimized for OG image specs
   */
  async generateOGImage(title: string, domain: string): Promise<Buffer> {
    // Create a gradient background
    // Using a dark blue to purple gradient via SVG
    const width = 1200
    const height = 630

    const gradientSvg = `
      <svg width="${width}" height="${height}">
        <defs>
          <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#1a1a2e;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#16213e;stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#grad)" />
      </svg>
    `

    const { default: sharp } = await import('sharp')
    const baseImage = await sharp(Buffer.from(gradientSvg)).png().toBuffer()

    // Escape special characters
    const escapedTitle = title
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')

    const escapedDomain = domain
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')

    // Word wrap title
    const maxCharsPerLine = 30
    const words = escapedTitle.split(' ')
    const lines: string[] = []
    let currentLine = ''

    for (const word of words) {
      if ((currentLine + ' ' + word).trim().length <= maxCharsPerLine) {
        currentLine = (currentLine + ' ' + word).trim()
      } else {
        if (currentLine) lines.push(currentLine)
        currentLine = word
      }
    }
    if (currentLine) lines.push(currentLine)

    // Limit to 3 lines
    if (lines.length > 3) {
      lines.length = 3
      const thirdLine = lines[2]
      if (thirdLine) {
        lines[2] = thirdLine.slice(0, -3) + '...'
      }
    }

    const fontSize = 56
    const lineHeight = 70
    const startY = (height - lines.length * lineHeight) / 2

    const textElements = lines
      .map(
        (line, i) =>
          `<text x="${width / 2}" y="${startY + i * lineHeight + fontSize}" text-anchor="middle" font-family="system-ui, -apple-system, BlinkMacSystemFont, sans-serif" font-size="${fontSize}" font-weight="bold" fill="#ffffff">${line}</text>`
      )
      .join('')

    // Add domain at bottom
    const domainY = height - 40
    const domainElement = `<text x="${width / 2}" y="${domainY}" text-anchor="middle" font-family="system-ui, sans-serif" font-size="24" fill="#888888">${escapedDomain}</text>`

    const overlaySvg = `
      <svg width="${width}" height="${height}">
        ${textElements}
        ${domainElement}
      </svg>
    `

    return sharp(baseImage)
      .composite([
        {
          input: Buffer.from(overlaySvg),
          top: 0,
          left: 0,
        },
      ])
      .png({ quality: 90 })
      .toBuffer()
  }

  /**
   * Find pages with missing or improvable images
   *
   * Analyzes pages to find:
   * - Missing OG images (high priority)
   * - Images without alt text (medium priority)
   * - Pages without featured images (medium priority)
   *
   * @param pages - List of pages to analyze
   * @returns Sorted list of image opportunities
   */
  async findMissingImages(pages: PageInfo[]): Promise<ImageOpportunity[]> {
    const opportunities: ImageOpportunity[] = []

    for (const page of pages) {
      // Check for missing OG image
      if (!page.hasOgImage) {
        opportunities.push({
          type: 'og',
          page: page.path,
          priority: 'high',
          reason: 'Page is missing Open Graph image for social sharing',
        })
      }

      // Check for images missing alt text
      for (const image of page.images) {
        if (!image.alt || image.alt.trim() === '') {
          opportunities.push({
            type: 'alt-text',
            page: page.path,
            image: image.src,
            priority: 'medium',
            reason: 'Image is missing alt text for accessibility and SEO',
          })
        }
      }

      // Check if blog/content page lacks featured image
      // Heuristic: content pages have significant word count and /blog or /posts in path
      const isContentPage =
        page.wordCount > 500 &&
        (page.path.includes('/blog') ||
          page.path.includes('/posts') ||
          page.path.includes('/articles'))

      if (isContentPage && page.images.length === 0) {
        opportunities.push({
          type: 'featured',
          page: page.path,
          priority: 'medium',
          reason: 'Content page has no images - adding a featured image improves engagement',
        })
      }
    }

    // Sort by priority: high > medium > low
    const priorityOrder: Record<'high' | 'medium' | 'low', number> = {
      high: 0,
      medium: 1,
      low: 2,
    }

    return opportunities.sort(
      (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]
    )
  }

  /**
   * Reset daily counts (useful for testing)
   */
  resetCounts(): void {
    this.dailyCounts.clear()
  }
}
