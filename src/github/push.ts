/**
 * Git push operations
 */

import simpleGit, { SimpleGit } from 'simple-git';

/**
 * Result of a push operation
 */
export interface PushOperationResult {
  /** Whether the push was successful */
  success: boolean;
  /** Remote name */
  remote: string;
  /** Branch name */
  branch: string;
  /** Any error message */
  error?: string;
}

/**
 * Pushes committed changes to the remote
 *
 * @param repoPath - Local repository path
 * @param branch - Branch to push to
 * @param remote - Remote name (default: origin)
 * @returns Push operation result
 */
export async function pushToRemote(
  repoPath: string,
  branch: string,
  remote: string = 'origin'
): Promise<PushOperationResult> {
  const git: SimpleGit = simpleGit(repoPath);

  try {
    await git.push(remote, branch);
    return {
      success: true,
      remote,
      branch,
    };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      remote,
      branch,
      error,
    };
  }
}

/**
 * Pushes with force flag (use with caution)
 *
 * @param repoPath - Local repository path
 * @param branch - Branch to push to
 * @param remote - Remote name (default: origin)
 * @returns Push operation result
 */
export async function forcePush(
  repoPath: string,
  branch: string,
  remote: string = 'origin'
): Promise<PushOperationResult> {
  const git: SimpleGit = simpleGit(repoPath);

  try {
    await git.push(remote, branch, ['--force']);
    return {
      success: true,
      remote,
      branch,
    };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      remote,
      branch,
      error,
    };
  }
}

/**
 * Sets up the remote if not already configured
 *
 * @param repoPath - Local repository path
 * @param url - Remote URL
 * @param remote - Remote name (default: origin)
 */
export async function ensureRemote(
  repoPath: string,
  url: string,
  remote: string = 'origin'
): Promise<void> {
  const git: SimpleGit = simpleGit(repoPath);
  const remotes = await git.getRemotes(true);

  const existing = remotes.find((r) => r.name === remote);
  if (!existing) {
    await git.addRemote(remote, url);
  } else if (existing.refs.push !== url) {
    await git.remote(['set-url', remote, url]);
  }
}

/**
 * Checks if there are commits to push
 *
 * @param repoPath - Local repository path
 * @param branch - Branch to check
 * @param remote - Remote name (default: origin)
 * @returns True if there are unpushed commits
 */
export async function hasUnpushedCommits(
  repoPath: string,
  branch: string,
  remote: string = 'origin'
): Promise<boolean> {
  const git: SimpleGit = simpleGit(repoPath);

  try {
    // Get commits that are in local but not in remote
    const log = await git.log([`${remote}/${branch}..HEAD`]);
    return log.total > 0;
  } catch {
    // If the remote branch doesn't exist yet, we have unpushed commits
    return true;
  }
}

/**
 * Performs a complete commit and push operation
 *
 * @param repoPath - Local repository path
 * @param message - Commit message
 * @param branch - Branch to push to
 * @param remote - Remote name (default: origin)
 * @returns The commit SHA if successful, empty string if no changes
 */
export async function commitAndPush(
  repoPath: string,
  message: string,
  branch: string,
  remote: string = 'origin'
): Promise<string> {
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
  await git.push(remote, branch);

  return result.commit;
}
