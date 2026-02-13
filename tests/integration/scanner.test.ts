/**
 * Scanner integration tests
 * Tests framework detection and codebase profiling
 */

import * as fs from 'fs';
import * as path from 'path';
import { FrameworkDetector, detectFramework } from '../../src/scanner/detector';
import { createTempDir, cleanupTempDir, createFixtureFiles } from '../helpers';

describe('Scanner Integration', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempDir();
  });

  afterEach(() => {
    cleanupTempDir(tempDir);
  });

  describe('Framework Detection', () => {
    describe('Next.js App Router', () => {
      it('detects Next.js App Router', () => {
        const files = [
          'package.json',
          'app/layout.tsx',
          'app/page.tsx',
          'app/about/page.tsx',
          'next.config.js',
        ];

        const packageJson = JSON.stringify({
          dependencies: { next: '14.0.0', react: '18.0.0' },
        });

        const result = detectFramework(files, packageJson);

        expect(result.framework).toBe('nextjs-app');
        expect(result.metaHandling).toBe('metadata-export');
        expect(result.version).toBe('14.0.0');
        expect(result.confidence).toBe('high');
      });

      it('detects Next.js App Router in src directory', () => {
        const files = [
          'package.json',
          'src/app/layout.tsx',
          'src/app/page.tsx',
          'next.config.js',
        ];

        const packageJson = JSON.stringify({
          dependencies: { next: '14.1.0', react: '18.0.0' },
        });

        const result = detectFramework(files, packageJson);

        expect(result.framework).toBe('nextjs-app');
        expect(result.confidence).toBe('high');
      });
    });

    describe('Next.js Pages Router', () => {
      it('detects Next.js Pages Router', () => {
        const files = [
          'package.json',
          'pages/index.tsx',
          'pages/about.tsx',
          'pages/_app.tsx',
          'next.config.js',
        ];

        const packageJson = JSON.stringify({
          dependencies: { next: '12.0.0', react: '17.0.0' },
        });

        const result = detectFramework(files, packageJson);

        expect(result.framework).toBe('nextjs-pages');
        expect(result.metaHandling).toBe('next-head');
        expect(result.version).toBe('12.0.0');
      });

      it('detects Pages Router in src directory', () => {
        const files = [
          'package.json',
          'src/pages/index.tsx',
          'src/pages/_app.tsx',
        ];

        const packageJson = JSON.stringify({
          dependencies: { next: '12.3.0', react: '17.0.0' },
        });

        const result = detectFramework(files, packageJson);

        expect(result.framework).toBe('nextjs-pages');
      });
    });

    describe('Astro', () => {
      it('detects Astro by dependency', () => {
        const files = [
          'package.json',
          'src/pages/index.astro',
          'astro.config.mjs',
        ];

        const packageJson = JSON.stringify({
          dependencies: { astro: '4.0.0' },
        });

        const result = detectFramework(files, packageJson);

        expect(result.framework).toBe('astro');
        expect(result.metaHandling).toBe('astro-head');
        expect(result.version).toBe('4.0.0');
        expect(result.confidence).toBe('high');
      });

      it('detects Astro by config file', () => {
        const files = [
          'package.json',
          'astro.config.mjs',
          'src/pages/index.astro',
        ];

        const packageJson = JSON.stringify({
          devDependencies: { astro: '3.5.0' },
        });

        const result = detectFramework(files, packageJson);

        expect(result.framework).toBe('astro');
      });

      it('detects Astro with TypeScript config', () => {
        const files = [
          'package.json',
          'astro.config.ts',
          'src/pages/index.astro',
        ];

        const packageJson = JSON.stringify({
          dependencies: { astro: '4.1.0' },
        });

        const result = detectFramework(files, packageJson);

        expect(result.framework).toBe('astro');
      });
    });

    describe('Plain HTML', () => {
      it('detects plain HTML site', () => {
        const files = ['index.html', 'about.html', 'contact.html', 'css/style.css'];

        const result = detectFramework(files);

        expect(result.framework).toBe('html');
        expect(result.metaHandling).toBe('direct-html');
        expect(result.confidence).toBe('high');
      });

      it('detects HTML with package.json but no framework', () => {
        const files = ['index.html', 'about.html', 'package.json'];

        const packageJson = JSON.stringify({
          dependencies: { 'some-utility': '1.0.0' },
        });

        const result = detectFramework(files, packageJson);

        expect(result.framework).toBe('html');
        expect(result.confidence).toBe('medium');
      });
    });

    describe('Unknown Framework', () => {
      it('returns unknown for empty directory', () => {
        const files: string[] = [];

        const result = detectFramework(files);

        expect(result.framework).toBe('unknown');
        expect(result.metaHandling).toBe('unknown');
        expect(result.confidence).toBe('low');
      });

      it('returns unknown for unrecognized structure', () => {
        const files = ['src/main.rs', 'Cargo.toml'];

        const result = detectFramework(files);

        expect(result.framework).toBe('unknown');
      });
    });

    describe('Other Frameworks', () => {
      it('detects Nuxt', () => {
        const files = ['package.json', 'nuxt.config.ts', 'pages/index.vue'];

        const packageJson = JSON.stringify({
          dependencies: { nuxt: '3.0.0' },
        });

        const result = detectFramework(files, packageJson);

        expect(result.framework).toBe('nuxt');
        expect(result.metaHandling).toBe('nuxt-usehead');
      });

      it('detects Gatsby', () => {
        const files = ['package.json', 'gatsby-config.js', 'src/pages/index.js'];

        const packageJson = JSON.stringify({
          dependencies: { gatsby: '5.0.0', react: '18.0.0' },
        });

        const result = detectFramework(files, packageJson);

        expect(result.framework).toBe('gatsby');
        expect(result.metaHandling).toBe('react-helmet');
      });

      it('detects Remix', () => {
        const files = ['package.json', 'app/root.tsx', 'app/routes/index.tsx'];

        const packageJson = JSON.stringify({
          dependencies: { '@remix-run/react': '2.0.0', '@remix-run/node': '2.0.0' },
        });

        const result = detectFramework(files, packageJson);

        expect(result.framework).toBe('remix');
      });

      it('detects SvelteKit', () => {
        const files = ['package.json', 'svelte.config.js', 'src/routes/+page.svelte'];

        const packageJson = JSON.stringify({
          devDependencies: { '@sveltejs/kit': '2.0.0' },
        });

        const result = detectFramework(files, packageJson);

        expect(result.framework).toBe('sveltekit');
      });

      it('detects Vite + React', () => {
        const files = ['package.json', 'vite.config.ts', 'src/App.tsx', 'index.html'];

        const packageJson = JSON.stringify({
          dependencies: { react: '18.0.0', 'react-dom': '18.0.0' },
          devDependencies: { vite: '5.0.0' },
        });

        const result = detectFramework(files, packageJson);

        expect(result.framework).toBe('vite-react');
      });

      it('detects Vite + Vue', () => {
        const files = ['package.json', 'vite.config.ts', 'src/App.vue', 'index.html'];

        const packageJson = JSON.stringify({
          dependencies: { vue: '3.0.0' },
          devDependencies: { vite: '5.0.0' },
        });

        const result = detectFramework(files, packageJson);

        expect(result.framework).toBe('vite-vue');
      });
    });
  });

  describe('FrameworkDetector class', () => {
    it('handles malformed package.json gracefully', () => {
      const files = ['package.json', 'index.html'];
      const malformedJson = '{ not valid json }}}';

      const detector = new FrameworkDetector(files, malformedJson);
      const result = detector.detect();

      // Should fall back to HTML detection
      expect(result.framework).toBe('html');
    });

    it('extracts version without prefix', () => {
      const files = ['package.json', 'app/layout.tsx'];
      const packageJson = JSON.stringify({
        dependencies: { next: '^14.0.0' },
      });

      const result = detectFramework(files, packageJson);

      expect(result.version).toBe('14.0.0'); // Without ^
    });

    it('extracts version with tilde prefix', () => {
      const files = ['package.json', 'astro.config.mjs'];
      const packageJson = JSON.stringify({
        dependencies: { astro: '~4.1.2' },
      });

      const result = detectFramework(files, packageJson);

      expect(result.version).toBe('4.1.2');
    });
  });

  describe('Codebase profiling with fixture files', () => {
    it('builds codebase profile with pages', async () => {
      // Create a realistic Next.js app structure
      createFixtureFiles(tempDir, {
        'package.json': JSON.stringify({
          name: 'test-app',
          dependencies: { next: '14.0.0', react: '18.0.0' },
        }),
        'app/layout.tsx': `
          export default function RootLayout({ children }) {
            return <html><body>{children}</body></html>
          }
        `,
        'app/page.tsx': `
          export const metadata = {
            title: 'Home',
            description: 'Welcome home',
          }
          export default function Home() {
            return <h1>Home</h1>
          }
        `,
        'app/about/page.tsx': `
          export const metadata = {
            title: 'About',
            description: 'About us',
          }
          export default function About() {
            return <h1>About</h1>
          }
        `,
        'next.config.js': 'module.exports = {}',
      });

      const files = fs.readdirSync(tempDir, { recursive: true })
        .filter(f => typeof f === 'string' && !f.includes('node_modules'))
        .map(f => f as string);

      const packageJson = fs.readFileSync(path.join(tempDir, 'package.json'), 'utf-8');

      const result = detectFramework(files, packageJson);

      expect(result.framework).toBe('nextjs-app');
      expect(result.metaHandling).toBe('metadata-export');
    });
  });
});
