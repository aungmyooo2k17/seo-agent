/**
 * GitHub Client unit tests
 */

import * as fs from 'fs';
import * as path from 'path';
import { GitHubClient } from '../../src/github/client';
import { createTempDir, cleanupTempDir, createMockRepoConfig, createMockCodeFix } from '../helpers';

describe('GitHubClient', () => {
  let tempDir: string;
  let client: GitHubClient;

  beforeEach(() => {
    tempDir = createTempDir();
    client = new GitHubClient(tempDir);
  });

  afterEach(() => {
    cleanupTempDir(tempDir);
  });

  describe('writeFile', () => {
    it('writes a file to the repository', async () => {
      const repoPath = path.join(tempDir, 'test-repo');
      fs.mkdirSync(repoPath, { recursive: true });

      await client.writeFile(repoPath, 'test.txt', 'Hello World');

      const content = fs.readFileSync(path.join(repoPath, 'test.txt'), 'utf-8');
      expect(content).toBe('Hello World');
    });

    it('creates nested directories when writing', async () => {
      const repoPath = path.join(tempDir, 'test-repo');
      fs.mkdirSync(repoPath, { recursive: true });

      await client.writeFile(repoPath, 'deep/nested/path/file.txt', 'Content');

      expect(fs.existsSync(path.join(repoPath, 'deep/nested/path/file.txt'))).toBe(true);
      const content = fs.readFileSync(path.join(repoPath, 'deep/nested/path/file.txt'), 'utf-8');
      expect(content).toBe('Content');
    });

    it('writes buffer content correctly', async () => {
      const repoPath = path.join(tempDir, 'test-repo');
      fs.mkdirSync(repoPath, { recursive: true });

      const buffer = Buffer.from([0x48, 0x65, 0x6c, 0x6c, 0x6f]); // "Hello"
      await client.writeFile(repoPath, 'binary.bin', buffer);

      const content = fs.readFileSync(path.join(repoPath, 'binary.bin'));
      expect(content).toEqual(buffer);
    });
  });

  describe('readFile', () => {
    it('reads a file from the repository', async () => {
      const repoPath = path.join(tempDir, 'test-repo');
      fs.mkdirSync(repoPath, { recursive: true });
      fs.writeFileSync(path.join(repoPath, 'readme.md'), '# Hello');

      const content = await client.readFile(repoPath, 'readme.md');

      expect(content).toBe('# Hello');
    });

    it('throws error when file does not exist', async () => {
      const repoPath = path.join(tempDir, 'test-repo');
      fs.mkdirSync(repoPath, { recursive: true });

      await expect(client.readFile(repoPath, 'nonexistent.txt')).rejects.toThrow('File not found');
    });
  });

  describe('listFiles', () => {
    it('lists files matching a pattern', async () => {
      const repoPath = path.join(tempDir, 'test-repo');
      fs.mkdirSync(path.join(repoPath, 'src'), { recursive: true });
      fs.writeFileSync(path.join(repoPath, 'src/index.ts'), '');
      fs.writeFileSync(path.join(repoPath, 'src/utils.ts'), '');
      fs.writeFileSync(path.join(repoPath, 'package.json'), '');

      const files = await client.listFiles(repoPath, '**/*.ts');

      expect(files).toContain('src/index.ts');
      expect(files).toContain('src/utils.ts');
      expect(files).not.toContain('package.json');
    });

    it('excludes node_modules and .git directories', async () => {
      const repoPath = path.join(tempDir, 'test-repo');
      fs.mkdirSync(path.join(repoPath, 'node_modules/pkg'), { recursive: true });
      fs.mkdirSync(path.join(repoPath, '.git/objects'), { recursive: true });
      fs.mkdirSync(path.join(repoPath, 'src'), { recursive: true });
      fs.writeFileSync(path.join(repoPath, 'node_modules/pkg/index.js'), '');
      fs.writeFileSync(path.join(repoPath, '.git/objects/abc'), '');
      fs.writeFileSync(path.join(repoPath, 'src/app.ts'), '');

      const files = await client.listFiles(repoPath);

      expect(files).toContain('src/app.ts');
      expect(files.some(f => f.includes('node_modules'))).toBe(false);
      expect(files.some(f => f.includes('.git'))).toBe(false);
    });

    it('returns all files when no pattern specified', async () => {
      const repoPath = path.join(tempDir, 'test-repo');
      fs.mkdirSync(path.join(repoPath, 'src'), { recursive: true });
      fs.writeFileSync(path.join(repoPath, 'src/index.ts'), '');
      fs.writeFileSync(path.join(repoPath, 'package.json'), '');
      fs.writeFileSync(path.join(repoPath, 'README.md'), '');

      const files = await client.listFiles(repoPath);

      expect(files.length).toBe(3);
      expect(files).toContain('src/index.ts');
      expect(files).toContain('package.json');
      expect(files).toContain('README.md');
    });
  });

  describe('applyChanges', () => {
    it('applies create action', async () => {
      const repoPath = path.join(tempDir, 'test-repo');
      fs.mkdirSync(repoPath, { recursive: true });

      const fix = createMockCodeFix({
        action: 'create',
        file: 'new-file.ts',
        content: 'export const x = 1;',
      });

      await client.applyChanges(repoPath, [fix]);

      expect(fs.existsSync(path.join(repoPath, 'new-file.ts'))).toBe(true);
      const content = fs.readFileSync(path.join(repoPath, 'new-file.ts'), 'utf-8');
      expect(content).toBe('export const x = 1;');
    });

    it('applies create action with nested path', async () => {
      const repoPath = path.join(tempDir, 'test-repo');
      fs.mkdirSync(repoPath, { recursive: true });

      const fix = createMockCodeFix({
        action: 'create',
        file: 'src/components/Button.tsx',
        content: 'export function Button() {}',
      });

      await client.applyChanges(repoPath, [fix]);

      expect(fs.existsSync(path.join(repoPath, 'src/components/Button.tsx'))).toBe(true);
    });

    it('applies modify action', async () => {
      const repoPath = path.join(tempDir, 'test-repo');
      fs.mkdirSync(repoPath, { recursive: true });
      fs.writeFileSync(
        path.join(repoPath, 'page.tsx'),
        'export default function Page() { return <div>Hello</div> }'
      );

      const fix = createMockCodeFix({
        action: 'modify',
        file: 'page.tsx',
        search: 'Hello',
        replace: 'World',
      });

      await client.applyChanges(repoPath, [fix]);

      const content = fs.readFileSync(path.join(repoPath, 'page.tsx'), 'utf-8');
      expect(content).toContain('World');
      expect(content).not.toContain('Hello');
    });

    it('applies delete action', async () => {
      const repoPath = path.join(tempDir, 'test-repo');
      fs.mkdirSync(repoPath, { recursive: true });
      fs.writeFileSync(path.join(repoPath, 'to-delete.txt'), 'content');

      const fix = createMockCodeFix({
        action: 'delete',
        file: 'to-delete.txt',
      });

      await client.applyChanges(repoPath, [fix]);

      expect(fs.existsSync(path.join(repoPath, 'to-delete.txt'))).toBe(false);
    });

    it('handles missing file in modify gracefully', async () => {
      const repoPath = path.join(tempDir, 'test-repo');
      fs.mkdirSync(repoPath, { recursive: true });

      // Spy on console.warn
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const fix = createMockCodeFix({
        action: 'modify',
        file: 'nonexistent.ts',
        search: 'foo',
        replace: 'bar',
      });

      // Should not throw
      await client.applyChanges(repoPath, [fix]);

      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('File not found'));
      warnSpy.mockRestore();
    });

    it('handles search string not found gracefully', async () => {
      const repoPath = path.join(tempDir, 'test-repo');
      fs.mkdirSync(repoPath, { recursive: true });
      fs.writeFileSync(path.join(repoPath, 'file.ts'), 'const x = 1;');

      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const fix = createMockCodeFix({
        action: 'modify',
        file: 'file.ts',
        search: 'nonexistent string',
        replace: 'replacement',
      });

      await client.applyChanges(repoPath, [fix]);

      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Search string not found'));
      warnSpy.mockRestore();
    });

    it('handles delete of nonexistent file gracefully', async () => {
      const repoPath = path.join(tempDir, 'test-repo');
      fs.mkdirSync(repoPath, { recursive: true });

      const fix = createMockCodeFix({
        action: 'delete',
        file: 'does-not-exist.txt',
      });

      // Should not throw
      await expect(client.applyChanges(repoPath, [fix])).resolves.not.toThrow();
    });

    it('applies multiple changes in order', async () => {
      const repoPath = path.join(tempDir, 'test-repo');
      fs.mkdirSync(repoPath, { recursive: true });

      const fixes = [
        createMockCodeFix({
          action: 'create',
          file: 'step1.ts',
          content: 'step 1',
        }),
        createMockCodeFix({
          action: 'create',
          file: 'step2.ts',
          content: 'step 2',
        }),
        createMockCodeFix({
          action: 'modify',
          file: 'step1.ts',
          search: 'step 1',
          replace: 'step 1 modified',
        }),
      ];

      await client.applyChanges(repoPath, fixes);

      expect(fs.readFileSync(path.join(repoPath, 'step1.ts'), 'utf-8')).toBe('step 1 modified');
      expect(fs.readFileSync(path.join(repoPath, 'step2.ts'), 'utf-8')).toBe('step 2');
    });

    it('handles create action without content gracefully', async () => {
      const repoPath = path.join(tempDir, 'test-repo');
      fs.mkdirSync(repoPath, { recursive: true });

      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const fix = createMockCodeFix({
        action: 'create',
        file: 'empty.ts',
        content: undefined,
      });

      await client.applyChanges(repoPath, [fix]);

      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('No content provided'));
      expect(fs.existsSync(path.join(repoPath, 'empty.ts'))).toBe(false);
      warnSpy.mockRestore();
    });

    it('handles modify action without search/replace gracefully', async () => {
      const repoPath = path.join(tempDir, 'test-repo');
      fs.mkdirSync(repoPath, { recursive: true });
      fs.writeFileSync(path.join(repoPath, 'file.ts'), 'content');

      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const fix = createMockCodeFix({
        action: 'modify',
        file: 'file.ts',
        search: undefined,
        replace: undefined,
      });

      await client.applyChanges(repoPath, [fix]);

      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Missing search/replace'));
      warnSpy.mockRestore();
    });
  });

  describe('getRepoPath', () => {
    it('returns correct path for repo config', () => {
      const repo = createMockRepoConfig({ id: 'my-repo' });
      const result = client.getRepoPath(repo);

      expect(result).toBe(path.join(tempDir, 'repos', 'my-repo'));
    });
  });

  describe('isCloned', () => {
    it('returns false when repo does not exist', () => {
      const repo = createMockRepoConfig({ id: 'nonexistent' });
      expect(client.isCloned(repo)).toBe(false);
    });

    it('returns true when repo exists', () => {
      const repo = createMockRepoConfig({ id: 'existing' });
      const repoPath = path.join(tempDir, 'repos', 'existing', '.git');
      fs.mkdirSync(repoPath, { recursive: true });

      expect(client.isCloned(repo)).toBe(true);
    });
  });
});
