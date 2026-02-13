/**
 * Framework handlers module
 * Provides framework-specific SEO handlers
 */

export type { IFrameworkHandler, ExtractedMeta, MetaInput, SchemaLocation } from './types';
export { BaseFrameworkHandler } from './types';
export { NextJSAppHandler } from './nextjs-app';
export { NextJSPagesHandler } from './nextjs-pages';
export { AstroHandler } from './astro';
export { HTMLHandler } from './html';

import type { FrameworkType } from '../../types';
import type { IFrameworkHandler } from './types';
import { NextJSAppHandler } from './nextjs-app';
import { NextJSPagesHandler } from './nextjs-pages';
import { AstroHandler } from './astro';
import { HTMLHandler } from './html';

/**
 * Supported handler framework types
 */
type HandlerFrameworkType = 'nextjs-app' | 'nextjs-pages' | 'astro' | 'html';

/**
 * Handler registry mapping framework types to handler instances
 */
const handlers = new Map<HandlerFrameworkType, IFrameworkHandler>([
  ['nextjs-app', new NextJSAppHandler()],
  ['nextjs-pages', new NextJSPagesHandler()],
  ['astro', new AstroHandler()],
  ['html', new HTMLHandler()],
]);

/**
 * Check if a framework type is a supported handler type
 */
function isHandlerFramework(framework: FrameworkType): framework is HandlerFrameworkType {
  return ['nextjs-app', 'nextjs-pages', 'astro', 'html'].includes(framework);
}

/**
 * Get the appropriate handler for a framework type
 * Falls back to HTML handler for unknown/unsupported frameworks
 *
 * @param framework - The framework type to get a handler for
 * @returns The framework handler
 */
export function getHandler(framework: FrameworkType): IFrameworkHandler {
  if (isHandlerFramework(framework)) {
    const handler = handlers.get(framework);
    if (handler) {
      return handler;
    }
  }

  // For unsupported frameworks, fall back to HTML handler
  // This provides basic SEO support for any framework
  console.warn(
    `No specific handler for framework "${framework}", falling back to HTML handler`
  );
  const htmlHandler = handlers.get('html');
  if (!htmlHandler) {
    throw new Error('HTML handler not found');
  }
  return htmlHandler;
}

/**
 * Check if a framework has a dedicated handler
 *
 * @param framework - The framework type to check
 * @returns True if a dedicated handler exists
 */
export function hasHandler(framework: FrameworkType): boolean {
  return isHandlerFramework(framework) && handlers.has(framework);
}

/**
 * Get all supported framework types
 *
 * @returns Array of supported framework types
 */
export function getSupportedFrameworks(): HandlerFrameworkType[] {
  return Array.from(handlers.keys());
}

/**
 * Register a custom framework handler
 * Use this to add support for additional frameworks
 *
 * @param framework - The framework type to register
 * @param handler - The handler instance
 */
export function registerHandler(
  framework: HandlerFrameworkType,
  handler: IFrameworkHandler
): void {
  handlers.set(framework, handler);
}
