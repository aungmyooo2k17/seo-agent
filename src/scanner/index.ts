/**
 * Scanner module
 * Provides framework detection, codebase profiling, and SEO analysis
 */

// Re-export detector
export {
  FrameworkDetector,
  detectFramework,
  type DetectionResult,
} from './detector';

// Re-export profiler
export {
  CodebaseProfiler,
  profileCodebase,
  type ProfilerOptions,
  type IFileReader,
} from './profiler';

// Re-export SEO analyzer
export {
  SEOAnalyzer,
  analyzeForSEO,
  type SEOAnalyzerConfig,
} from './seo-analyzer';

// Re-export framework handlers
export {
  getHandler,
  hasHandler,
  getSupportedFrameworks,
  registerHandler,
  type IFrameworkHandler,
  type ExtractedMeta,
  type MetaInput,
  type SchemaLocation,
  NextJSAppHandler,
  NextJSPagesHandler,
  AstroHandler,
  HTMLHandler,
} from './frameworks';
