/**
 * Image optimization utilities using Sharp
 */

import sharp from 'sharp'

/**
 * Options for image optimization
 */
export interface OptimizeOptions {
  /** Target width in pixels */
  width: number
  /** Target height in pixels */
  height: number
  /** Output format */
  format: 'webp' | 'png' | 'jpeg'
  /** Quality setting (1-100) */
  quality: number
}

/**
 * Default optimization settings for blog images
 */
export const BLOG_IMAGE_DEFAULTS: OptimizeOptions = {
  width: 1200,
  height: 630,
  format: 'webp',
  quality: 85,
}

/**
 * Default optimization settings for OG images
 */
export const OG_IMAGE_DEFAULTS: OptimizeOptions = {
  width: 1200,
  height: 630,
  format: 'png',
  quality: 90,
}

/**
 * Optimize an image buffer with the specified options
 *
 * @param buffer - Input image data
 * @param options - Optimization settings
 * @returns Optimized image buffer
 */
export async function optimizeImage(
  buffer: Buffer,
  options: OptimizeOptions
): Promise<Buffer> {
  let pipeline = sharp(buffer).resize(options.width, options.height, {
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

/**
 * Get image metadata (dimensions, format, size)
 */
export async function getImageMetadata(
  buffer: Buffer
): Promise<{ width: number; height: number; format: string }> {
  const metadata = await sharp(buffer).metadata()
  return {
    width: metadata.width ?? 0,
    height: metadata.height ?? 0,
    format: metadata.format ?? 'unknown',
  }
}

/**
 * Add text overlay to an image (for OG images)
 *
 * @param buffer - Base image buffer
 * @param title - Text to overlay
 * @param options - Additional styling options
 * @returns Image buffer with text overlay
 */
export async function addTextOverlay(
  buffer: Buffer,
  title: string,
  options: {
    fontSize?: number
    fontColor?: string
    backgroundColor?: string
    padding?: number
  } = {}
): Promise<Buffer> {
  const {
    fontSize = 48,
    fontColor = '#ffffff',
    backgroundColor = 'rgba(0, 0, 0, 0.6)',
    padding = 40,
  } = options

  const metadata = await sharp(buffer).metadata()
  const width = metadata.width ?? 1200
  const height = metadata.height ?? 630

  // Escape special characters for SVG
  const escapedTitle = title
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

  // Word wrap the title for long text
  const maxCharsPerLine = Math.floor((width - padding * 2) / (fontSize * 0.6))
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

  // Calculate text block dimensions
  const lineHeight = fontSize * 1.3
  const textBlockHeight = lines.length * lineHeight + padding * 2
  const textY = (height - textBlockHeight) / 2 + padding

  // Create SVG with text
  const textElements = lines
    .map(
      (line, i) =>
        `<text x="${width / 2}" y="${textY + i * lineHeight + fontSize}" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="${fontSize}" font-weight="bold" fill="${fontColor}">${line}</text>`
    )
    .join('')

  const svg = `
    <svg width="${width}" height="${height}">
      <rect x="0" y="${textY - padding}" width="${width}" height="${textBlockHeight}" fill="${backgroundColor}" />
      ${textElements}
    </svg>
  `

  return sharp(buffer)
    .composite([
      {
        input: Buffer.from(svg),
        top: 0,
        left: 0,
      },
    ])
    .toBuffer()
}

/**
 * Create a solid color background image
 */
export async function createSolidBackground(
  width: number,
  height: number,
  color: string
): Promise<Buffer> {
  return sharp({
    create: {
      width,
      height,
      channels: 4,
      background: color,
    },
  })
    .png()
    .toBuffer()
}
