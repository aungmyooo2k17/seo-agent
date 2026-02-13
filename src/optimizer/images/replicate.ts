/**
 * Replicate API integration for AI image generation
 */

import Replicate from 'replicate'

/**
 * Mapping of friendly model names to Replicate model identifiers
 */
const MODEL_MAP: Record<string, string> = {
  'flux-schnell': 'black-forest-labs/flux-schnell',
  'flux-pro': 'black-forest-labs/flux-1.1-pro',
  'sdxl': 'stability-ai/sdxl',
}

/**
 * Replicate API client instance
 * Lazily initialized to avoid errors when token is not set
 */
let replicateClient: Replicate | null = null

/**
 * Check if Replicate API is configured
 */
export function isReplicateConfigured(): boolean {
  return !!process.env['REPLICATE_API_TOKEN']
}

/**
 * Get or create the Replicate client instance
 */
function getClient(): Replicate {
  if (!replicateClient) {
    const token = process.env['REPLICATE_API_TOKEN']
    if (!token) {
      throw new Error(
        'REPLICATE_API_TOKEN environment variable is required for image generation. ' +
        'Set IMAGE_GENERATION_ENABLED=false to disable image generation.'
      )
    }
    replicateClient = new Replicate({ auth: token })
  }
  return replicateClient
}

/**
 * Output type from Replicate - can be URL string, array of URLs, or other formats
 */
type ReplicateOutput = string | string[] | Record<string, unknown> | unknown

/**
 * Extract image URL from Replicate output
 */
function extractImageUrl(output: ReplicateOutput): string {
  if (typeof output === 'string') {
    return output
  }

  if (Array.isArray(output) && output.length > 0) {
    const first = output[0]
    if (typeof first === 'string') {
      return first
    }
  }

  // Some models return an object with a url property
  if (output && typeof output === 'object' && 'url' in output) {
    const url = (output as Record<string, unknown>)['url']
    if (typeof url === 'string') {
      return url
    }
  }

  throw new Error(`Unexpected Replicate output format: ${JSON.stringify(output)}`)
}

/**
 * Generate an image using the Replicate API
 *
 * @param prompt - The text prompt describing the image to generate
 * @param model - Model identifier (flux-schnell, flux-pro, sdxl)
 * @returns Buffer containing the generated image data
 * @throws Error if generation fails or API returns unexpected format
 */
export async function generateWithReplicate(
  prompt: string,
  model: string = 'flux-schnell'
): Promise<Buffer> {
  const client = getClient()
  const modelId = MODEL_MAP[model] || MODEL_MAP['flux-schnell']

  const output = await client.run(modelId as `${string}/${string}`, {
    input: {
      prompt,
      aspect_ratio: '16:9',
      output_format: 'webp',
      output_quality: 90,
    },
  })

  const imageUrl = extractImageUrl(output)

  const response = await fetch(imageUrl)
  if (!response.ok) {
    throw new Error(
      `Failed to download generated image: ${response.status} ${response.statusText}`
    )
  }

  return Buffer.from(await response.arrayBuffer())
}

/**
 * Check if a model identifier is valid
 */
export function isValidModel(model: string): boolean {
  return model in MODEL_MAP
}

/**
 * Get list of available models
 */
export function getAvailableModels(): string[] {
  return Object.keys(MODEL_MAP)
}
