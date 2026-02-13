/**
 * GitHub module exports
 * Provides git operations for repository management
 */

export { GitHubClient } from './client';

export {
  cloneRepository,
  pullRepository,
  repositoryExists,
  cloneOrPull,
} from './clone';

export {
  stageAll,
  stageFiles,
  getStatus,
  createCommit,
  stageAndCommit,
  getLatestCommitSha,
  formatCommitMessage,
  type CommitResult,
} from './commit';

export {
  pushToRemote,
  forcePush,
  ensureRemote,
  hasUnpushedCommits,
  commitAndPush,
  type PushOperationResult,
} from './push';
