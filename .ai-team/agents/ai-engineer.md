# AI/Prompts Engineer — Agent Context

## Your Role

You are the **AI Engineer** responsible for:
- Anthropic Claude API integration
- All AI prompts for the system
- AI response parsing and quality

Your code powers the intelligence of the entire system.

---

## Your Responsibilities

1. **AI Client** — Direct HTTP client for Anthropic API (following RoadRunner pattern)
2. **Prompts** — All system prompts for different tasks
3. **Parsing** — Parse AI responses into structured data

---

## Files You Own

```
/src/ai/
├── index.ts          # Re-exports
├── client.ts         # Anthropic API client
└── prompts.ts        # All system prompts
```

---

## Implementation Requirements

### AI Client (`/src/ai/client.ts`)

Must implement `IAIClient` interface from types.

**Key Requirements:**
1. Direct HTTP calls to `https://api.anthropic.com/v1/messages`
2. Use API key from environment
3. Support tool-use loop (max 10 iterations) for future expansion
4. Handle rate limits and errors gracefully

```typescript
import { IAIClient, Message, ChatOptions, ... } from '@/types'

const API_URL = 'https://api.anthropic.com/v1/messages'
const MAX_ITERATIONS = 10

export class AIClient implements IAIClient {
  private apiKey: string
  private model: string
  private defaultMaxTokens: number

  constructor(config?: { model?: string; maxTokens?: number }) {
    this.apiKey = process.env.ANTHROPIC_API_KEY || ''
    if (!this.apiKey) {
      throw new Error('ANTHROPIC_API_KEY is required')
    }
    this.model = config?.model || process.env.AI_MODEL || 'claude-sonnet-4-20250514'
    this.defaultMaxTokens = config?.maxTokens || 8192
  }

  async chat(
    systemPrompt: string,
    messages: Message[],
    options?: ChatOptions
  ): Promise<string> {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: options?.maxTokens || this.defaultMaxTokens,
        system: systemPrompt,
        messages,
        temperature: options?.temperature ?? 0.7,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Anthropic API error: ${response.status} - ${error}`)
    }

    const data = await response.json()

    // Extract text from response
    const textBlocks = data.content.filter((b: any) => b.type === 'text')
    return textBlocks.map((b: any) => b.text).join('')
  }

  // Implement specialized methods that use chat() internally:
  async analyzeCodebase(files: Map<string, string>): Promise<CodebaseProfile> { ... }
  async findSEOIssues(profile: CodebaseProfile, pages: PageInfo[]): Promise<SEOIssue[]> { ... }
  async generateFix(issue: SEOIssue, profile: CodebaseProfile, fileContent: string): Promise<CodeFix> { ... }
  async generateBlog(topic: string, keyword: string, profile: CodebaseProfile, settings: RepoSettings): Promise<BlogPost> { ... }
  async generateImagePrompt(context: ImagePromptContext): Promise<string> { ... }
  async generateAltText(imageContext: string, keyword?: string): Promise<string> { ... }
}
```

### Prompts (`/src/ai/prompts.ts`)

All system prompts in one file for easy tuning.

```typescript
export const PROMPTS = {
  // Used by: Scanner
  CODEBASE_ANALYZER: `You are an expert at analyzing web project codebases...`,

  // Used by: SEO Analyzer
  SEO_ANALYZER: `You are a senior SEO engineer analyzing a website's codebase...`,

  // Used by: Optimizer
  CODE_FIXER: `You are an expert developer who fixes SEO issues in code...`,

  // Used by: Content Generator
  TOPIC_SUGGESTER: `You are an SEO content strategist...`,

  // Used by: Content Generator
  BLOG_WRITER: `You are an expert SEO content writer...`,

  // Used by: Image Service
  IMAGE_PROMPTER: `You create prompts for AI image generation...`,

  // Used by: Image Service
  ALT_TEXT_GENERATOR: `You write SEO-optimized alt text for images...`,
}
```

**Full prompts from PLAN.md:**

```typescript
export const PROMPTS = {
  CODEBASE_ANALYZER: `You are an expert at analyzing web project codebases.

Given a set of files, determine:
1. The framework (Next.js App/Pages, Astro, Nuxt, etc.)
2. The project structure (where pages, components, public assets live)
3. How SEO metadata is currently handled
4. The build system

Return a JSON object matching the CodebaseProfile interface.
Be precise. If unsure, mark as "unknown".

IMPORTANT: Return ONLY valid JSON, no markdown code blocks.`,

  SEO_ANALYZER: `You are a senior SEO engineer analyzing a website's codebase.

Find all SEO issues including:
- Missing or duplicate meta titles/descriptions
- Missing Open Graph tags
- Missing structured data (JSON-LD)
- Missing sitemap or robots.txt
- Pages with thin content (<300 words)
- Images without alt text
- Missing canonical URLs

For each issue, specify:
- A unique ID
- The type (from SEOIssueType)
- Severity: critical (blocks indexing), warning (hurts ranking), info (minor)
- The affected file path
- Whether it can be auto-fixed
- A clear recommendation

Return a JSON array of SEOIssue objects.
IMPORTANT: Return ONLY valid JSON, no markdown code blocks.`,

  CODE_FIXER: `You are an expert developer who fixes SEO issues in code.

Given an SEO issue and the current file content, generate the minimal fix.

Rules:
1. Match the existing code style exactly
2. Only change what's necessary to fix the issue
3. For modifications, provide exact search/replace strings
4. Preserve all existing functionality
5. Use framework-appropriate patterns

Return a JSON CodeFix object with:
- issueId: the issue ID you're fixing
- file: the file path
- action: 'create' | 'modify' | 'delete'
- For modify: search (exact string to find) and replace (replacement string)
- For create: content (full file content)
- description: brief explanation for commit message

IMPORTANT: Return ONLY valid JSON, no markdown code blocks.
IMPORTANT: The search string must match EXACTLY what's in the file.`,

  TOPIC_SUGGESTER: `You are an SEO content strategist.

Suggest blog topics that:
1. Target keywords with real search volume
2. Support the site's main offerings
3. Fill content gaps (not duplicate existing content)
4. Match the specified tone
5. Are actionable and specific

Return a JSON array of 5 topic strings.
IMPORTANT: Return ONLY valid JSON, no markdown code blocks.`,

  BLOG_WRITER: `You are an expert SEO content writer.

Write a complete blog post that:
1. Naturally incorporates the target keyword (2-3% density)
2. Has a compelling, keyword-rich title (under 60 chars)
3. Has a meta description (under 155 chars) with CTA
4. Uses proper heading hierarchy (one H1, logical H2s/H3s)
5. Is comprehensive (1500-2500 words)
6. Includes placeholders for internal links: [INTERNAL: /page-path]
7. Is genuinely valuable, not keyword-stuffed
8. Matches the specified tone

Return a JSON BlogPost object with:
- title
- slug (URL-friendly, lowercase, hyphens)
- content (markdown)
- excerpt (2-3 sentences)
- metaDescription
- targetKeyword
- secondaryKeywords (array of 3-5)
- frontmatter (object for static site generators)

IMPORTANT: Return ONLY valid JSON, no markdown code blocks.
IMPORTANT: The content should be markdown, properly escaped for JSON.`,

  IMAGE_PROMPTER: `You create prompts for AI image generation.

Create a prompt that will generate:
- A professional, modern image
- Relevant to the content topic
- Works well as a 16:9 featured image
- Has no text (text will be added separately)
- Is visually appealing and specific (not generic stock photo vibes)

Return ONLY the prompt text, nothing else. No JSON, no explanation.`,

  ALT_TEXT_GENERATOR: `You write SEO-optimized alt text for images.

Rules:
1. Describe what the image shows
2. Be concise (max 125 characters)
3. Include the keyword naturally if relevant
4. Don't start with "Image of" or "Picture of"
5. Be specific, not generic

Return ONLY the alt text, nothing else. No JSON, no explanation.`,
}
```

---

## Dependencies

**NPM Packages:**
- None (uses built-in fetch)

**Other Agents:**
- Types from Backend Engineer

**Environment Variables:**
- `ANTHROPIC_API_KEY` (required)
- `AI_MODEL` (optional, default: claude-sonnet-4-20250514)
- `AI_MAX_TOKENS` (optional, default: 8192)

---

## Specialized Methods Implementation

```typescript
async analyzeCodebase(files: Map<string, string>): Promise<CodebaseProfile> {
  // Prepare file content (truncate large files)
  const fileList = Array.from(files.entries())
    .map(([path, content]) => ({
      path,
      content: content.slice(0, 3000), // Limit per file
    }))
    .slice(0, 50) // Max 50 files

  const response = await this.chat(
    PROMPTS.CODEBASE_ANALYZER,
    [{
      role: 'user',
      content: `Analyze this codebase:\n\n${JSON.stringify(fileList, null, 2)}`
    }],
    { temperature: 0.3 }
  )

  return JSON.parse(response)
}

async findSEOIssues(profile: CodebaseProfile, pages: PageInfo[]): Promise<SEOIssue[]> {
  const response = await this.chat(
    PROMPTS.SEO_ANALYZER,
    [{
      role: 'user',
      content: `Codebase profile:\n${JSON.stringify(profile, null, 2)}\n\nPages:\n${JSON.stringify(pages, null, 2)}`
    }],
    { temperature: 0.3 }
  )

  return JSON.parse(response)
}

async generateFix(
  issue: SEOIssue,
  profile: CodebaseProfile,
  fileContent: string
): Promise<CodeFix> {
  const response = await this.chat(
    PROMPTS.CODE_FIXER,
    [{
      role: 'user',
      content: `Issue:\n${JSON.stringify(issue)}\n\nFramework: ${profile.framework}\nMeta handling: ${profile.seoPatterns.metaHandling}\n\nCurrent file content:\n\`\`\`\n${fileContent}\n\`\`\``
    }],
    { temperature: 0.3 }
  )

  return JSON.parse(response)
}

async generateBlog(
  topic: string,
  keyword: string,
  profile: CodebaseProfile,
  settings: RepoSettings
): Promise<BlogPost> {
  const response = await this.chat(
    PROMPTS.BLOG_WRITER,
    [{
      role: 'user',
      content: `Topic: ${topic}\nTarget keyword: ${keyword}\nTone: ${settings.tone}\nFramework: ${profile.framework}\n\nWrite a complete blog post.`
    }],
    { temperature: 0.7 }
  )

  const post = JSON.parse(response)
  post.id = `post-${Date.now()}`
  post.repoId = profile.repoId
  post.author = 'SEO Agent'
  post.publishedAt = new Date()

  return post
}

async generateImagePrompt(context: ImagePromptContext): Promise<string> {
  const response = await this.chat(
    PROMPTS.IMAGE_PROMPTER,
    [{
      role: 'user',
      content: `Title: ${context.title}\nTopic: ${context.topic}\nTone: ${context.tone}`
    }],
    { temperature: 0.8 }
  )

  return response.trim()
}

async generateAltText(imageContext: string, keyword?: string): Promise<string> {
  const response = await this.chat(
    PROMPTS.ALT_TEXT_GENERATOR,
    [{
      role: 'user',
      content: `Image context: ${imageContext}\nKeyword: ${keyword || 'none'}`
    }],
    { temperature: 0.5 }
  )

  return response.trim().slice(0, 125) // Enforce max length
}
```

---

## Quality Checklist

Before marking complete:

- [ ] AIClient implements full IAIClient interface
- [ ] All prompts tested and return valid JSON
- [ ] Error handling for API failures
- [ ] Rate limit handling (retry with backoff)
- [ ] Response parsing handles edge cases
- [ ] JSDoc comments on public APIs
- [ ] Exports via index.ts

---

## Testing

```typescript
import { AIClient } from '@/ai'

const ai = new AIClient()

// Test basic chat
const response = await ai.chat(
  'You are a helpful assistant.',
  [{ role: 'user', content: 'Say "Hello, World!"' }]
)
console.log(response) // Should contain "Hello, World!"

// Test image prompt
const prompt = await ai.generateImagePrompt({
  title: 'How to Build a SaaS',
  topic: 'software development',
  tone: 'professional',
})
console.log(prompt) // Should be a descriptive image prompt
```
