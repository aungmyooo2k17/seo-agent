# Content Engineer — Agent Context

## Your Role

You are the **Content Engineer** responsible for:
- Blog post generation
- Image generation (featured images, OG images)
- Content formatting for different frameworks

You create the content that drives organic traffic.

---

## Your Responsibilities

1. **Content Generator** — Generate SEO-optimized blog posts
2. **Image Service** — Generate images via Replicate (Flux)
3. **Image Optimization** — Compress and format images

---

## Files You Own

```
/src/optimizer/
├── content.ts            # Blog generation logic
└── images/
    ├── index.ts          # Re-exports, main ImageService class
    ├── replicate.ts      # Replicate API integration
    └── optimizer.ts      # Sharp image optimization
```

---

## Implementation Requirements

### Content Generator (`/src/optimizer/content.ts`)

```typescript
import { IAIClient } from '@/types/services'
import { BlogPost, CodebaseProfile, RepoSettings, RepoConfig } from '@/types'
import { IFrameworkHandler } from '@/scanner/frameworks/types'
import { ImageService } from './images'

export class ContentGenerator {
  constructor(
    private ai: IAIClient,
    private imageService: ImageService
  ) {}

  /**
   * Check if content should be generated based on frequency setting
   */
  shouldGenerateContent(repo: RepoConfig, lastPublished: Date | null): boolean {
    if (!lastPublished) return true

    const daysSince = (Date.now() - lastPublished.getTime()) / (1000 * 60 * 60 * 24)

    switch (repo.settings.contentFrequency) {
      case 'daily': return daysSince >= 1
      case 'weekly': return daysSince >= 7
      case 'biweekly': return daysSince >= 14
      case 'monthly': return daysSince >= 30
      default: return false
    }
  }

  /**
   * Research and suggest topics based on site context
   */
  async suggestTopics(
    profile: CodebaseProfile,
    settings: RepoSettings,
    existingTitles: string[]
  ): Promise<string[]> {
    return this.ai.suggestTopics(profile, existingTitles, settings)
  }

  /**
   * Generate a complete blog post with featured image
   */
  async generatePost(
    topic: string,
    keyword: string,
    profile: CodebaseProfile,
    settings: RepoSettings,
    handler: IFrameworkHandler
  ): Promise<{ post: BlogPost; imageBuffer: Buffer; imagePath: string }> {
    // 1. Generate blog content via AI
    const post = await this.ai.generateBlog(topic, keyword, profile, settings)

    // 2. Determine file paths
    const blogDir = handler.getBlogDirectory()
    post.filePath = `${blogDir}/${post.slug}/page.tsx` // or .mdx based on framework
    post.format = 'mdx'

    // 3. Generate featured image
    const canGenerateImage = await this.imageService.canGenerate(profile.repoId)

    if (canGenerateImage) {
      const image = await this.imageService.generateBlogImage({
        title: post.title,
        topic,
        tone: settings.tone,
        slug: post.slug,
      })

      post.featuredImage = image

      // Update frontmatter with image
      post.frontmatter = {
        ...post.frontmatter,
        image: `/images/blog/${image.filename}`,
        imageAlt: image.altText,
      }

      return {
        post,
        imageBuffer: image.buffer,
        imagePath: `public/images/blog/${image.filename}`,
      }
    }

    return {
      post,
      imageBuffer: Buffer.from(''),
      imagePath: '',
    }
  }

  /**
   * Format blog post for the specific framework
   */
  formatForFramework(post: BlogPost, handler: IFrameworkHandler): string {
    return handler.formatBlogPost(post)
  }
}
```

### Image Service (`/src/optimizer/images/index.ts`)

```typescript
import { IAIClient, IImageService, BlogImageContext } from '@/types/services'
import { GeneratedImage, ImageOpportunity, PageInfo } from '@/types'
import { generateWithReplicate } from './replicate'
import { optimizeImage } from './optimizer'

export class ImageService implements IImageService {
  private ai: IAIClient
  private provider: string
  private model: string
  private maxPerDay: number
  private dailyCounts: Map<string, number> = new Map()

  constructor(ai: IAIClient) {
    this.ai = ai
    this.provider = process.env.IMAGE_PROVIDER || 'replicate'
    this.model = process.env.IMAGE_MODEL || 'flux-schnell'
    this.maxPerDay = parseInt(process.env.MAX_IMAGES_PER_DAY || '5')
  }

  async canGenerate(repoId: string): Promise<boolean> {
    const today = new Date().toISOString().split('T')[0]
    const key = `${repoId}-${today}`
    const count = this.dailyCounts.get(key) || 0
    return count < this.maxPerDay
  }

  private incrementCount(repoId: string): void {
    const today = new Date().toISOString().split('T')[0]
    const key = `${repoId}-${today}`
    const count = this.dailyCounts.get(key) || 0
    this.dailyCounts.set(key, count + 1)
  }

  async generateBlogImage(context: BlogImageContext): Promise<GeneratedImage> {
    // 1. Generate prompt using AI
    const prompt = await this.ai.generateImagePrompt({
      title: context.title,
      topic: context.topic,
      tone: context.tone,
    })

    // 2. Generate image
    const rawImage = await generateWithReplicate(prompt, this.model)

    // 3. Optimize image
    const optimized = await optimizeImage(rawImage, {
      width: 1200,
      height: 630,
      format: 'webp',
      quality: 85,
    })

    // 4. Generate alt text
    const altText = await this.ai.generateAltText(
      `Blog featured image for: ${context.title}. Generated from prompt: ${prompt}`,
      context.topic
    )

    // 5. Track usage
    this.incrementCount(context.slug.split('-')[0]) // Use first part as repoId proxy

    return {
      buffer: optimized,
      filename: `${context.slug}-featured.webp`,
      altText,
      prompt,
      provider: this.provider,
      model: this.model,
      dimensions: { width: 1200, height: 630 },
      sizeBytes: optimized.length,
    }
  }

  async generateOGImage(title: string, domain: string): Promise<Buffer> {
    // Generate a base image and add text overlay
    const prompt = 'Abstract professional gradient background, modern, clean, blue and purple tones, suitable for text overlay'

    const rawImage = await generateWithReplicate(prompt, this.model)

    // Add text overlay using sharp
    const withText = await this.addTextOverlay(rawImage, title, domain)

    return optimizeImage(withText, {
      width: 1200,
      height: 630,
      format: 'webp',
      quality: 90,
    })
  }

  private async addTextOverlay(
    image: Buffer,
    title: string,
    domain: string
  ): Promise<Buffer> {
    const sharp = (await import('sharp')).default

    const svg = `
      <svg width="1200" height="630">
        <style>
          .title { fill: white; font-size: 56px; font-family: sans-serif; font-weight: bold; }
          .domain { fill: rgba(255,255,255,0.8); font-size: 24px; font-family: sans-serif; }
        </style>
        <rect x="0" y="0" width="1200" height="630" fill="rgba(0,0,0,0.5)"/>
        <text x="60" y="480" class="title">${this.escapeXml(title.slice(0, 50))}</text>
        <text x="60" y="540" class="domain">${domain}</text>
      </svg>
    `

    return sharp(image)
      .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
      .toBuffer()
  }

  async findMissingImages(pages: PageInfo[]): Promise<ImageOpportunity[]> {
    const opportunities: ImageOpportunity[] = []

    for (const page of pages) {
      if (!page.hasOgImage) {
        opportunities.push({
          type: 'og',
          page: page.path,
          priority: 'high',
          reason: 'Missing Open Graph image for social sharing',
        })
      }

      for (const img of page.images) {
        if (!img.alt || img.alt.trim() === '') {
          opportunities.push({
            type: 'alt-text',
            page: page.path,
            image: img.src,
            priority: 'medium',
            reason: `Image ${img.src} missing alt text`,
          })
        }
      }
    }

    return opportunities
  }

  private escapeXml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
  }
}

export { ImageService }
```

### Replicate Integration (`/src/optimizer/images/replicate.ts`)

```typescript
import Replicate from 'replicate'

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
})

const MODEL_MAP: Record<string, string> = {
  'flux-schnell': 'black-forest-labs/flux-schnell',
  'flux-pro': 'black-forest-labs/flux-1.1-pro',
  'sdxl': 'stability-ai/sdxl',
}

export async function generateWithReplicate(
  prompt: string,
  model: string = 'flux-schnell'
): Promise<Buffer> {
  const modelId = MODEL_MAP[model] || MODEL_MAP['flux-schnell']

  const output = await replicate.run(modelId, {
    input: {
      prompt,
      aspect_ratio: '16:9',
      output_format: 'webp',
      output_quality: 90,
    },
  })

  // Output is URL or array of URLs
  const imageUrl = Array.isArray(output) ? output[0] : output

  if (typeof imageUrl !== 'string') {
    throw new Error('Unexpected Replicate output format')
  }

  const response = await fetch(imageUrl)
  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.status}`)
  }

  return Buffer.from(await response.arrayBuffer())
}
```

### Image Optimizer (`/src/optimizer/images/optimizer.ts`)

```typescript
import sharp from 'sharp'

interface OptimizeOptions {
  width: number
  height: number
  format: 'webp' | 'png' | 'jpeg'
  quality: number
}

export async function optimizeImage(
  buffer: Buffer,
  options: OptimizeOptions
): Promise<Buffer> {
  let pipeline = sharp(buffer)
    .resize(options.width, options.height, {
      fit: 'cover',
      position: 'center',
    })

  switch (options.format) {
    case 'webp':
      pipeline = pipeline.webp({ quality: options.quality })
      break
    case 'png':
      pipeline = pipeline.png({ quality: options.quality })
      break
    case 'jpeg':
      pipeline = pipeline.jpeg({ quality: options.quality })
      break
  }

  return pipeline.toBuffer()
}
```

---

## Dependencies

**NPM Packages:**
- `replicate` — Replicate API client
- `sharp` — Image processing

**Other Agents:**
- AI Client from AI Engineer
- Framework handlers from SEO Engineer
- Types from Backend Engineer

**Environment Variables:**
- `REPLICATE_API_TOKEN`
- `IMAGE_PROVIDER` (default: replicate)
- `IMAGE_MODEL` (default: flux-schnell)
- `MAX_IMAGES_PER_DAY` (default: 5)

---

## Quality Checklist

- [ ] Content generator produces valid markdown
- [ ] Image generation works with Replicate
- [ ] Images are properly optimized (WebP, correct dimensions)
- [ ] Alt text is generated for all images
- [ ] Daily limits are enforced
- [ ] Content formatted correctly for each framework
- [ ] JSDoc comments on public APIs
- [ ] Exports via index.ts
