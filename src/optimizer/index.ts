/**
 * Optimizer module
 * Provides SEO optimization utilities
 */

// Re-export meta optimizer
export {
  MetaOptimizer,
  fixMetaIssue,
  type MetaOptimizerOptions,
} from './meta';

// Re-export schema generator
export {
  SchemaGenerator,
  generateOrganizationSchema,
  generateWebSiteSchema,
  generateBlogPostingSchema,
  generateBreadcrumbSchema,
  type OrganizationData,
  type WebSiteData,
  type BreadcrumbItem,
  type ProductData,
  type FAQData,
} from './schema';

// Re-export sitemap generator
export {
  SitemapGenerator,
  generateSitemap,
  generateSitemapXML,
  type SitemapConfig,
} from './sitemap';

// Re-export robots generator
export {
  RobotsGenerator,
  generateRobots,
  generateRobotsWithAIBlock,
  type RobotsConfig,
} from './robots';

// Re-export internal link optimizer
export {
  InternalLinkOptimizer,
  findLinkOpportunities,
  analyzeLinking,
  type LinkOpportunity,
  type LinkAnalysis,
  type LinkOptimizerConfig,
} from './internal-links';
