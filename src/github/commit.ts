/**
 * Git commit operations
 */

import simpleGit, { SimpleGit, StatusResult } from 'simple-git';

/**
 * Result of a commit operation
 */
export interface CommitResult {
  /** The commit SHA, empty if no changes to commit */
  sha: string;
  /** Number of files changed */
  filesChanged: number;
  /** Whether any changes were committed */
  hasChanges: boolean;
}

/**
 * Stages all changes in the repository
 *
 * @param repoPath - Local repository path
 */
export async function stageAll(repoPath: string): Promise<void> {
  const git: SimpleGit = simpleGit(repoPath);
  await git.add('-A');
}

/**
 * Stages specific files
 *
 * @param repoPath - Local repository path
 * @param files - Array of file paths to stage
 */
export async function stageFiles(repoPath: string, files: string[]): Promise<void> {
  if (files.length === 0) return;

  const git: SimpleGit = simpleGit(repoPath);
  await git.add(files);
}

/**
 * Gets the current status of the repository
 *
 * @param repoPath - Local repository path
 * @returns Git status result
 */
export async function getStatus(repoPath: string): Promise<StatusResult> {
  const git: SimpleGit = simpleGit(repoPath);
  return git.status();
}

/**
 * Creates a commit with the given message
 *
 * @param repoPath - Local repository path
 * @param message - Commit message
 * @returns Commit result with SHA and change info
 */
export async function createCommit(repoPath: string, message: string): Promise<CommitResult> {
  const git: SimpleGit = simpleGit(repoPath);

  // Check if there are changes to commit
  const status = await git.status();
  if (status.files.length === 0) {
    return { sha: '', filesChanged: 0, hasChanges: false };
  }

  const result = await git.commit(message);
  return {
    sha: result.commit,
    filesChanged: status.files.length,
    hasChanges: true,
  };
}

/**
 * Stages all changes and creates a commit
 *
 * @param repoPath - Local repository path
 * @param message - Commit message
 * @returns Commit result
 */
export async function stageAndCommit(repoPath: string, message: string): Promise<CommitResult> {
  await stageAll(repoPath);
  return createCommit(repoPath, message);
}

/**
 * Gets the latest commit SHA
 *
 * @param repoPath - Local repository path
 * @returns The latest commit SHA
 */
export async function getLatestCommitSha(repoPath: string): Promise<string> {
  const git: SimpleGit = simpleGit(repoPath);
  const log = await git.log({ maxCount: 1 });
  return log.latest?.hash ?? '';
}

/**
 * Generates an SEO-style commit message
 *
 * @param type - Type of change (e.g., 'fix', 'feat', 'content')
 * @param description - Brief description
 * @param affectedFiles - Number of files affected
 * @returns Formatted commit message
 */
export function formatCommitMessage(
  type: 'fix' | 'feat' | 'content' | 'chore',
  description: string,
  affectedFiles?: number
): string {
  const prefix = {
    fix: 'fix(seo):',
    feat: 'feat(seo):',
    content: 'content:',
    chore: 'chore(seo):',
  }[type];

  let message = `${prefix} ${description}`;
  if (affectedFiles !== undefined && affectedFiles > 0) {
    message += ` [${affectedFiles} file${affectedFiles > 1 ? 's' : ''}]`;
  }

  return message;
}
