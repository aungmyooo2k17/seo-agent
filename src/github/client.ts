/**
 * Main GitHub client implementation
 * Provides a unified interface for all git operations
 */

import simpleGit, { SimpleGit } from 'simple-git';
import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';
import type { IGitHubClient, RepoConfig, CodeFix } from '../types';
import { cloneOrPull, repositoryExists } from './clone';
import { getLatestCommitSha } from './commit';

/**
 * GitHub client for repository operations
 * Implements IGitHubClient interface for dependency injection
 */
export class GitHubClient implements IGitHubClient {
  private readonly dataDir: string;

  /**
   * Creates a new GitHubClient
   *
   * @param dataDir - Base directory for storing repositories (default: from DATA_DIR env or ./data)
   */
  constructor(dataDir?: string) {
    this.dataDir = dataDir ?? process.env['DATA_DIR'] ?? './data';
  }

  /**
   * Clones a repository or pulls latest changes if it already exists
   *
   * @param repo - Repository configuration
   * @returns Path to the local repository
   */
  async cloneOrPull(repo: RepoConfig): Promise<string> {
    return cloneOrPull(repo, this.dataDir);
  }

  /**
   * Gets the latest commit SHA
   *
   * @param repoPath - Local repository path
   * @returns The latest commit SHA
   */
  async getLatestCommit(repoPath: string): Promise<string> {
    return getLatestCommitSha(repoPath);
  }

  /**
   * Reads a file from the repository
   *
   * @param repoPath - Local repository path
   * @param filePath - Relative path to the file
   * @returns File contents as string
   * @throws Error if file does not exist
   */
  async readFile(repoPath: string, filePath: string): Promise<string> {
    const fullPath = path.join(repoPath, filePath);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`File not found: ${filePath}`);
    }
    return fs.readFileSync(fullPath, 'utf-8');
  }

  /**
   * Writes a file to the repository
   * Creates parent directories if they don't exist
   *
   * @param repoPath - Local repository path
   * @param filePath - Relative path to the file
   * @param content - Content to write (string or Buffer)
   */
  async writeFile(repoPath: string, filePath: string, content: string | Buffer): Promise<void> {
    const fullPath = path.join(repoPath, filePath);
    const dir = path.dirname(fullPath);
    fs.mkdirSync(dir, { recursive: true });

    if (typeof content === 'string') {
      fs.writeFileSync(fullPath, content, 'utf-8');
    } else {
      fs.writeFileSync(fullPath, content);
    }
  }

  /**
   * Lists files matching a glob pattern
   *
   * @param repoPath - Local repository path
   * @param pattern - Glob pattern (default: all files)
   * @returns Array of relative file paths
   */
  async listFiles(repoPath: string, pattern?: string): Promise<string[]> {
    const searchPattern = pattern ?? '**/*';
    const files = await glob(searchPattern, {
      cwd: repoPath,
      nodir: true,
      ignore: ['**/node_modules/**', '**/.git/**'],
    });
    return files;
  }

  /**
   * Applies multiple code fixes to the repository
   * Supports create, modify, and delete actions
   *
   * @param repoPath - Local repository path
   * @param changes - Array of code fixes to apply
   */
  async applyChanges(repoPath: string, changes: CodeFix[]): Promise<void> {
    for (const change of changes) {
      const filePath = path.join(repoPath, change.file);

      switch (change.action) {
        case 'create': {
          if (!change.content) {
            console.warn(`No content provided for create action on ${change.file}`);
            continue;
          }
          fs.mkdirSync(path.dirname(filePath), { recursive: true });
          fs.writeFileSync(filePath, change.content, 'utf-8');
          break;
        }

        case 'modify': {
          if (!change.search || change.replace === undefined) {
            console.warn(`Missing search/replace for modify action on ${change.file}`);
            continue;
          }
          if (!fs.existsSync(filePath)) {
            console.warn(`File not found for modify action: ${change.file}`);
            continue;
          }
          const content = fs.readFileSync(filePath, 'utf-8');
          if (!content.includes(change.search)) {
            console.warn(`Search string not found in ${change.file}`);
            continue;
          }
          const newContent = content.replace(change.search, change.replace);
          fs.writeFileSync(filePath, newContent, 'utf-8');
          break;
        }

        case 'delete': {
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
          break;
        }

        default: {
          // TypeScript exhaustive check
          const _exhaustive: never = change.action;
          console.warn(`Unknown action type: ${_exhaustive}`);
        }
      }
    }
  }

  /**
   * Commits all changes and pushes to the remote
   *
   * @param repoPath - Local repository path
   * @param message - Commit message
   * @param branch - Branch to push to (default: main)
   * @returns The commit SHA, or empty string if no changes
   */
  async commitAndPush(repoPath: string, message: string, branch: string = 'main'): Promise<string> {
    const git: SimpleGit = simpleGit(repoPath);

    // Stage all changes
    await git.add('-A');

    // Check if there are changes to commit
    const status = await git.status();
    if (status.files.length === 0) {
      return '';
    }

    // Commit
    const result = await git.commit(message);

    // Push
    await git.push('origin', branch);

    return result.commit;
  }

  /**
   * Gets the repository path for a given repo config
   *
   * @param repo - Repository configuration
   * @returns The local repository path
   */
  getRepoPath(repo: RepoConfig): string {
    return path.join(this.dataDir, 'repos', repo.id);
  }

  /**
   * Checks if a repository is already cloned locally
   *
   * @param repo - Repository configuration
   * @returns True if the repository exists locally
   */
  isCloned(repo: RepoConfig): boolean {
    return repositoryExists(this.getRepoPath(repo));
  }
}
