/**
 * Git clone and pull operations
 */

import simpleGit, { SimpleGit } from 'simple-git';
import * as fs from 'fs';
import * as path from 'path';
import type { RepoConfig } from '../types';

/**
 * Get authenticated URL by injecting GitHub token into HTTPS URLs
 * Converts: https://github.com/user/repo.git
 * To: https://<token>@github.com/user/repo.git
 */
function getAuthenticatedUrl(url: string): string {
  const token = process.env['GITHUB_TOKEN'];

  if (!token) {
    return url;
  }

  // Only modify HTTPS URLs
  if (url.startsWith('https://github.com/')) {
    return url.replace('https://github.com/', `https://${token}@github.com/`);
  }

  if (url.startsWith('https://')) {
    // Generic HTTPS URL - try to inject token
    return url.replace('https://', `https://${token}@`);
  }

  // SSH URLs - return as-is (requires SSH key)
  return url;
}

/**
 * Clones a repository to the specified path
 * Uses shallow clone with single branch for efficiency
 *
 * @param repo - Repository configuration
 * @param repoPath - Local path to clone to
 */
export async function cloneRepository(repo: RepoConfig, repoPath: string): Promise<void> {
  const parentDir = path.dirname(repoPath);
  fs.mkdirSync(parentDir, { recursive: true });

  const authUrl = getAuthenticatedUrl(repo.url);
  const git = simpleGit();

  await git.clone(authUrl, repoPath, [
    '--branch',
    repo.branch,
    '--single-branch',
    '--depth',
    '1',
  ]);
}

/**
 * Pulls latest changes from remote
 * Fetches from origin and performs a hard reset to match remote state
 *
 * @param repoPath - Local repository path
 * @param branch - Branch name to pull
 */
export async function pullRepository(repoPath: string, branch: string): Promise<void> {
  const git: SimpleGit = simpleGit(repoPath);
  await git.fetch('origin', branch);
  await git.reset(['--hard', `origin/${branch}`]);
}

/**
 * Checks if a repository exists locally
 *
 * @param repoPath - Path to check
 * @returns True if the repository exists and is a git repository
 */
export function repositoryExists(repoPath: string): boolean {
  const gitDir = path.join(repoPath, '.git');
  return fs.existsSync(repoPath) && fs.existsSync(gitDir);
}

/**
 * Clones a repository or pulls latest changes if it already exists
 *
 * @param repo - Repository configuration
 * @param dataDir - Base data directory
 * @returns The local path to the repository
 */
export async function cloneOrPull(repo: RepoConfig, dataDir: string): Promise<string> {
  const repoPath = path.join(dataDir, 'repos', repo.id);

  if (repositoryExists(repoPath)) {
    await pullRepository(repoPath, repo.branch);
  } else {
    await cloneRepository(repo, repoPath);
  }

  return repoPath;
}
