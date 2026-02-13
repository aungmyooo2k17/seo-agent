/**
 * Meta tag optimizer module
 * Generates and optimizes meta tags for SEO
 */

import type {
  CodebaseProfile,
  PageInfo,
  SEOIssue,
  CodeFix,
  IAIClient,
  RepoSettings,
} from '../types';
import { getHandler } from '../scanner/frameworks';

/**
 * Options for meta optimization
 */
export interface MetaOptimizerOptions {
  /** Maximum title length */
  maxTitleLength: number;
  /** Maximum description length */
  maxDescriptionLength: number;
  /** Include Open Graph tags */
  includeOG: boolean;
  /** Include Twitter card tags */
  includeTwitter: boolean;
}

const DEFAULT_OPTIONS: MetaOptimizerOptions = {
  maxTitleLength: 60,
  maxDescriptionLength: 155,
  includeOG: true,
  includeTwitter: true,
};

/**
 * Optimizes meta tags for SEO
 */
export class MetaOptimizer {
  private aiClient: IAIClient;
  private options: MetaOptimizerOptions;

  constructor(aiClient: IAIClient, options: Partial<MetaOptimizerOptions> = {}) {
    this.aiClient = aiClient;
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Fix a missing or poor meta tag issue
   *
   * @param issue - The SEO issue to fix
   * @param fileContent - Current content of the file
   * @param page - Page information
   * @param profile - Codebase profile
   * @param settings - Repository settings
   * @returns Code fix to apply
   */
  async fixMissingMeta(
    issue: SEOIssue,
    fileContent: string,
    page: PageInfo,
    profile: CodebaseProfile,
    settings: RepoSettings
  ): Promise<CodeFix> {
    const handler = getHandler(profile.framework);

    // Generate optimal meta using AI
    const generatedMeta = await this.generateOptimalMeta(
      page,
      fileContent,
      profile,
      settings
    );

    // Generate the meta code for this framework
    const metaCode = handler.generateMetaCode({
      title: generatedMeta.title,
      description: generatedMeta.description,
      ogImage: generatedMeta.ogImage ?? undefined,
      canonical: undefined,
      keywords: generatedMeta.keywords ?? undefined,
    });

    // Determine how to apply the fix based on framework
    return this.createMetaFix(
      issue,
      fileContent,
      metaCode,
      profile,
      page
    );
  }

  /**
   * Fix a title that's too long
   */
  async fixLongTitle(
    issue: SEOIssue,
    fileContent: string,
    page: PageInfo,
    profile: CodebaseProfile,
    settings: RepoSettings
  ): Promise<CodeFix> {
    if (!page.title) {
      throw new Error('Cannot fix long title: page has no title');
    }

    // Use AI to shorten the title while preserving meaning
    const shortenedTitle = await this.shortenTitle(
      page.title,
      this.options.maxTitleLength,
      settings
    );

    // Find and replace the title in the file
    const titlePattern = this.getTitlePattern(profile.framework);
    const oldTitle = this.findTitle(fileContent, titlePattern);

    if (!oldTitle) {
      throw new Error('Cannot find title in file content');
    }

    return {
      issueId: issue.id,
      file: page.filePath,
      action: 'modify',
      search: oldTitle,
      replace: oldTitle.replace(page.title, shortenedTitle),
      description: `Shortened title from ${page.title.length} to ${shortenedTitle.length} characters`,
    };
  }

  /**
   * Fix a description that's too long
   */
  async fixLongDescription(
    issue: SEOIssue,
    fileContent: string,
    page: PageInfo,
    profile: CodebaseProfile,
    settings: RepoSettings
  ): Promise<CodeFix> {
    if (!page.description) {
      throw new Error('Cannot fix long description: page has no description');
    }

    // Use AI to shorten the description
    const shortenedDesc = await this.shortenDescription(
      page.description,
      this.options.maxDescriptionLength,
      settings
    );

    // Find and replace the description in the file
    const descPattern = this.getDescriptionPattern(profile.framework);
    const oldDesc = this.findDescription(fileContent, descPattern);

    if (!oldDesc) {
      throw new Error('Cannot find description in file content');
    }

    return {
      issueId: issue.id,
      file: page.filePath,
      action: 'modify',
      search: oldDesc,
      replace: oldDesc.replace(page.description, shortenedDesc),
      description: `Shortened description from ${page.description.length} to ${shortenedDesc.length} characters`,
    };
  }

  /**
   * Generate optimal meta tags using AI
   */
  private async generateOptimalMeta(
    page: PageInfo,
    fileContent: string,
    _profile: CodebaseProfile,
    settings: RepoSettings
  ): Promise<{
    title: string;
    description: string;
    ogImage?: string;
    keywords?: string[];
  }> {
    // Extract context from the page content
    const pageContext = this.extractPageContext(fileContent);

    // Use AI to generate meta tags
    const prompt = this.buildMetaPrompt(page, pageContext, settings);
    const response = await this.aiClient.chat(
      'You are an SEO expert. Generate optimal meta tags for web pages.',
      [{ role: 'user', content: prompt }],
      { temperature: 0.3, maxTokens: 500 }
    );

    // Parse the AI response
    return this.parseMetaResponse(response);
  }

  /**
   * Extract context from page content for AI
   */
  private extractPageContext(content: string): string {
    // Remove code blocks
    let text = content.replace(/```[\s\S]*?```/g, '');
    text = text.replace(/<code[^>]*>[\s\S]*?<\/code>/gi, '');

    // Remove imports and exports
    text = text.replace(/^import .+$/gm, '');
    text = text.replace(/^export .+$/gm, '');

    // Remove JSX syntax (keep text content)
    text = text.replace(/<[^>]+>/g, ' ');

    // Clean up whitespace
    text = text.replace(/\s+/g, ' ').trim();

    // Limit length
    return text.slice(0, 2000);
  }

  /**
   * Build prompt for meta generation
   */
  private buildMetaPrompt(
    page: PageInfo,
    context: string,
    settings: RepoSettings
  ): string {
    return `Generate SEO-optimized meta tags for this page:

URL Path: ${page.path}
Tone: ${settings.tone}
${settings.topics.length > 0 ? `Topics: ${settings.topics.join(', ')}` : ''}
${settings.customInstructions ? `Custom instructions: ${settings.customInstructions}` : ''}

Page content summary:
${context}

Requirements:
- Title: Max ${this.options.maxTitleLength} characters, include primary keyword
- Description: Max ${this.options.maxDescriptionLength} characters, compelling and actionable
- Keywords: 3-5 relevant keywords

Respond in JSON format:
{
  "title": "...",
  "description": "...",
  "keywords": ["...", "..."]
}`;
  }

  /**
   * Parse AI response into meta object
   */
  private parseMetaResponse(response: string): {
    title: string;
    description: string;
    keywords?: string[];
  } {
    try {
      // Extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]) as {
        title?: string;
        description?: string;
        keywords?: string[];
      };

      if (!parsed.title || !parsed.description) {
        throw new Error('Missing required fields');
      }

      const result: { title: string; description: string; keywords?: string[] } = {
        title: parsed.title.slice(0, this.options.maxTitleLength),
        description: parsed.description.slice(0, this.options.maxDescriptionLength),
      };
      if (parsed.keywords) {
        result.keywords = parsed.keywords;
      }
      return result;
    } catch {
      // Fallback to generic meta
      return {
        title: 'Page Title',
        description: 'Page description goes here.',
      };
    }
  }

  /**
   * Shorten title using AI while preserving meaning
   */
  private async shortenTitle(
    title: string,
    maxLength: number,
    settings: RepoSettings
  ): Promise<string> {
    const prompt = `Shorten this page title to under ${maxLength} characters while preserving the key message and SEO value:

Current title (${title.length} chars): "${title}"

Requirements:
- Keep the most important keywords
- Maintain readability
- Tone: ${settings.tone}

Respond with ONLY the shortened title, nothing else.`;

    const response = await this.aiClient.chat(
      'You are an SEO expert.',
      [{ role: 'user', content: prompt }],
      { temperature: 0.3, maxTokens: 100 }
    );

    const shortened = response.trim().replace(/^["']|["']$/g, '');
    return shortened.slice(0, maxLength);
  }

  /**
   * Shorten description using AI
   */
  private async shortenDescription(
    description: string,
    maxLength: number,
    settings: RepoSettings
  ): Promise<string> {
    const prompt = `Shorten this meta description to under ${maxLength} characters while keeping it compelling:

Current description (${description.length} chars): "${description}"

Requirements:
- Include a call to action
- Keep the main value proposition
- Tone: ${settings.tone}

Respond with ONLY the shortened description, nothing else.`;

    const response = await this.aiClient.chat(
      'You are an SEO expert.',
      [{ role: 'user', content: prompt }],
      { temperature: 0.3, maxTokens: 200 }
    );

    const shortened = response.trim().replace(/^["']|["']$/g, '');
    return shortened.slice(0, maxLength);
  }

  /**
   * Create a code fix for adding/updating meta tags
   */
  private createMetaFix(
    issue: SEOIssue,
    fileContent: string,
    metaCode: string,
    profile: CodebaseProfile,
    page: PageInfo
  ): CodeFix {
    switch (profile.framework) {
      case 'nextjs-app':
        return this.createNextJSAppMetaFix(issue, fileContent, metaCode, page);
      case 'nextjs-pages':
        return this.createNextJSPagesMetaFix(issue, fileContent, metaCode, page);
      case 'astro':
        return this.createAstroMetaFix(issue, fileContent, metaCode, page);
      default:
        return this.createHTMLMetaFix(issue, fileContent, metaCode, page);
    }
  }

  /**
   * Create meta fix for Next.js App Router
   */
  private createNextJSAppMetaFix(
    issue: SEOIssue,
    fileContent: string,
    metaCode: string,
    page: PageInfo
  ): CodeFix {
    // Check if metadata export already exists
    const hasMetadata = /export\s+const\s+metadata/.test(fileContent);

    if (hasMetadata) {
      // Replace existing metadata
      const oldMetadata = fileContent.match(
        /export\s+const\s+metadata(?:\s*:\s*Metadata)?\s*=\s*\{[\s\S]*?\};/
      );

      if (oldMetadata) {
        return {
          issueId: issue.id,
          file: page.filePath,
          action: 'modify',
          search: oldMetadata[0],
          replace: metaCode,
          description: 'Updated metadata export with optimized meta tags',
        };
      }
    }

    // Add metadata export at the top (after imports)
    const importEndMatch = fileContent.match(/^(import[\s\S]*?\n)(?=\n|export|const|function|class)/m);

    if (importEndMatch) {
      return {
        issueId: issue.id,
        file: page.filePath,
        action: 'modify',
        search: importEndMatch[0],
        replace: `${importEndMatch[0]}\n${metaCode}\n`,
        description: 'Added metadata export for SEO',
      };
    }

    // Prepend to file
    return {
      issueId: issue.id,
      file: page.filePath,
      action: 'modify',
      search: fileContent.slice(0, 100),
      replace: `${metaCode}\n\n${fileContent.slice(0, 100)}`,
      description: 'Added metadata export for SEO',
    };
  }

  /**
   * Create meta fix for Next.js Pages Router
   */
  private createNextJSPagesMetaFix(
    issue: SEOIssue,
    fileContent: string,
    metaCode: string,
    page: PageInfo
  ): CodeFix {
    // Check if Head component is already used
    const hasHead = /<Head>/.test(fileContent);

    if (hasHead) {
      // Find and replace existing Head content
      const headMatch = fileContent.match(/<Head>[\s\S]*?<\/Head>/);
      if (headMatch) {
        // Extract just the meta component body
        const metaBody = metaCode
          .replace(/^import.*$/gm, '')
          .replace(/export function.*\{/g, '')
          .replace(/return \(/g, '')
          .replace(/\);?\s*\}$/g, '')
          .trim();

        return {
          issueId: issue.id,
          file: page.filePath,
          action: 'modify',
          search: headMatch[0],
          replace: metaBody,
          description: 'Updated Head component with optimized meta tags',
        };
      }
    }

    // Need to add Head component - create a separate component file
    const componentPath = page.filePath.replace(/\.([tj]sx?)$/, '.seo.$1');

    return {
      issueId: issue.id,
      file: componentPath,
      action: 'create',
      content: metaCode,
      description: 'Created SEO component with meta tags (import and use <PageHead /> in your component)',
    };
  }

  /**
   * Create meta fix for Astro
   */
  private createAstroMetaFix(
    issue: SEOIssue,
    fileContent: string,
    metaCode: string,
    page: PageInfo
  ): CodeFix {
    // Check if frontmatter exists
    const hasFrontmatter = fileContent.startsWith('---');

    if (hasFrontmatter) {
      // Add meta to existing frontmatter
      const frontmatterEnd = fileContent.indexOf('---', 3);
      const frontmatter = fileContent.slice(0, frontmatterEnd);

      // Extract variables from meta code
      const titleMatch = metaCode.match(/const title = ['"](.+)['"]/);
      const descMatch = metaCode.match(/const description = ['"](.+)['"]/);

      if (titleMatch && descMatch) {
        const newFrontmatter = `${frontmatter}
const title = '${titleMatch[1]}';
const description = '${descMatch[1]}';
`;
        return {
          issueId: issue.id,
          file: page.filePath,
          action: 'modify',
          search: frontmatter,
          replace: newFrontmatter,
          description: 'Added meta variables to frontmatter',
        };
      }
    }

    // Create SEO component
    const componentPath = 'src/components/SEO.astro';

    return {
      issueId: issue.id,
      file: componentPath,
      action: 'create',
      content: metaCode,
      description: 'Created SEO component (import and include in <head>)',
    };
  }

  /**
   * Create meta fix for HTML
   */
  private createHTMLMetaFix(
    issue: SEOIssue,
    fileContent: string,
    metaCode: string,
    page: PageInfo
  ): CodeFix {
    // Find <head> tag
    const headMatch = fileContent.match(/<head[^>]*>([\s\S]*?)<\/head>/i);

    if (headMatch) {
      const headContent = headMatch[1];
      const newHeadContent = `${headContent}\n${metaCode}`;

      return {
        issueId: issue.id,
        file: page.filePath,
        action: 'modify',
        search: headMatch[0],
        replace: `<head>${newHeadContent}</head>`,
        description: 'Added meta tags to <head>',
      };
    }

    // No head tag - add one
    const htmlMatch = fileContent.match(/<html[^>]*>/i);

    if (htmlMatch) {
      return {
        issueId: issue.id,
        file: page.filePath,
        action: 'modify',
        search: htmlMatch[0],
        replace: `${htmlMatch[0]}\n<head>\n${metaCode}\n</head>`,
        description: 'Added <head> section with meta tags',
      };
    }

    // Last resort - prepend
    return {
      issueId: issue.id,
      file: page.filePath,
      action: 'modify',
      search: fileContent.slice(0, 50),
      replace: `<!DOCTYPE html>\n<html>\n<head>\n${metaCode}\n</head>\n${fileContent.slice(0, 50)}`,
      description: 'Added HTML structure with meta tags',
    };
  }

  /**
   * Get title pattern for finding existing title
   */
  private getTitlePattern(framework: string): RegExp {
    switch (framework) {
      case 'nextjs-app':
        return /title:\s*['"`]([^'"`]+)['"`]/;
      case 'nextjs-pages':
        return /<title>([^<]+)<\/title>/;
      case 'astro':
        return /<title>([^<{]+)<\/title>/;
      default:
        return /<title>([^<]+)<\/title>/i;
    }
  }

  /**
   * Get description pattern
   */
  private getDescriptionPattern(framework: string): RegExp {
    switch (framework) {
      case 'nextjs-app':
        return /description:\s*['"`]([^'"`]+)['"`]/;
      default:
        return /<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i;
    }
  }

  /**
   * Find title in content
   */
  private findTitle(content: string, pattern: RegExp): string | null {
    const match = content.match(pattern);
    return match ? match[0] : null;
  }

  /**
   * Find description in content
   */
  private findDescription(content: string, pattern: RegExp): string | null {
    const match = content.match(pattern);
    return match ? match[0] : null;
  }
}

/**
 * Create a fix for a meta-related SEO issue
 */
export async function fixMetaIssue(
  issue: SEOIssue,
  fileContent: string,
  page: PageInfo,
  profile: CodebaseProfile,
  settings: RepoSettings,
  aiClient: IAIClient
): Promise<CodeFix> {
  const optimizer = new MetaOptimizer(aiClient);

  switch (issue.type) {
    case 'missing-meta-title':
    case 'missing-meta-description':
      return optimizer.fixMissingMeta(issue, fileContent, page, profile, settings);
    case 'title-too-long':
      return optimizer.fixLongTitle(issue, fileContent, page, profile, settings);
    case 'description-too-long':
      return optimizer.fixLongDescription(issue, fileContent, page, profile, settings);
    default:
      throw new Error(`Unsupported issue type: ${issue.type}`);
  }
}
