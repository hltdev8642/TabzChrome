/**
 * Git utility functions for TabzChrome
 * Uses native git CLI via child_process (same pattern as tmux integration)
 */

const { exec } = require('child_process');
const path = require('path');
const fs = require('fs').promises;
const util = require('util');
const execAsync = util.promisify(exec);
const { createModuleLogger } = require('./logger');

const log = createModuleLogger('Git');

// Configuration
const DEFAULT_PROJECTS_DIR = path.join(process.env.HOME, 'projects');

/**
 * Validate that a path is within allowed directories (security)
 * Prevents path traversal attacks
 * @param {string} repoPath - Path to validate
 * @param {string} baseDir - Base directory that path must be within
 * @returns {boolean} True if path is valid and within baseDir
 */
function isValidPath(repoPath, baseDir) {
  const resolvedPath = path.resolve(repoPath);
  const resolvedBase = path.resolve(baseDir);
  return resolvedPath.startsWith(resolvedBase + path.sep) || resolvedPath === resolvedBase;
}

/**
 * Escape shell argument to prevent command injection
 * @param {string} arg - Argument to escape
 * @returns {string} Escaped argument
 */
function escapeShellArg(arg) {
  // Replace single quotes with escaped version
  return `'${arg.replace(/'/g, "'\\''")}'`;
}

/**
 * Discover all git repositories in a directory (non-recursive, depth 1)
 * @param {string} dir - Directory to scan
 * @returns {Promise<string[]>} Array of repo paths
 */
async function discoverRepos(dir = DEFAULT_PROJECTS_DIR) {
  const repos = [];

  try {
    // First, check if the directory itself is a git repo
    const selfGitPath = path.join(dir, '.git');
    try {
      const selfGitStat = await fs.stat(selfGitPath);
      if (selfGitStat.isDirectory()) {
        repos.push(dir);
      }
    } catch {
      // Not a git repo itself, continue to scan children
    }

    // Then scan child directories for git repos
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      // Skip hidden directories (except we still check them for .git)
      const entryPath = path.join(dir, entry.name);
      const gitPath = path.join(entryPath, '.git');

      try {
        const gitStat = await fs.stat(gitPath);
        if (gitStat.isDirectory()) {
          repos.push(entryPath);
        }
      } catch {
        // Not a git repo, skip
      }
    }
  } catch (err) {
    log.error(`Error scanning directory ${dir}:`, err.message);
  }

  return repos;
}

/**
 * Parse git status --porcelain output
 * @param {string} output - Raw git status output
 * @returns {object} Parsed status { staged: [], unstaged: [], untracked: [] }
 */
function parseGitStatus(output) {
  const staged = [];
  const unstaged = [];
  const untracked = [];

  if (!output || !output.trim()) {
    return { staged, unstaged, untracked };
  }

  const lines = output.trim().split('\n');

  for (const line of lines) {
    if (!line || line.length < 2) continue;

    // Skip branch line (starts with ##)
    if (line.startsWith('##')) continue;

    const indexStatus = line[0];  // Status in index (staged area)
    const workTreeStatus = line[1];  // Status in work tree
    const filePath = line.substring(3);  // File path starts at position 3

    // Handle renamed files (format: "R  old -> new")
    let displayPath = filePath;
    if (filePath.includes(' -> ')) {
      const [oldPath, newPath] = filePath.split(' -> ');
      displayPath = newPath;
    }

    // Staged changes (index has modification)
    if (indexStatus !== ' ' && indexStatus !== '?') {
      staged.push({ path: displayPath, status: indexStatus });
    }

    // Unstaged changes (work tree has modification)
    if (workTreeStatus !== ' ' && workTreeStatus !== '?') {
      unstaged.push({ path: displayPath, status: workTreeStatus });
    }

    // Untracked files
    if (indexStatus === '?' && workTreeStatus === '?') {
      untracked.push({ path: displayPath });
    }
  }

  return { staged, unstaged, untracked };
}

/**
 * Parse branch tracking info from git status -b --porcelain output
 * @param {string} output - Raw git status output
 * @returns {object} { branch, tracking, ahead, behind }
 */
function parseBranchInfo(output) {
  const result = {
    branch: 'unknown',
    tracking: null,
    ahead: 0,
    behind: 0
  };

  if (!output) return result;

  const lines = output.trim().split('\n');
  const branchLine = lines.find(l => l.startsWith('##'));

  if (!branchLine) return result;

  // Parse branch line: ## main...origin/main [ahead 3, behind 1]
  // or just: ## main
  // or: ## HEAD (no branch)
  const branchMatch = branchLine.match(/^## ([^.\s]+)/);
  if (branchMatch) {
    result.branch = branchMatch[1];
  }

  // Check for tracking branch
  const trackingMatch = branchLine.match(/\.\.\.([^\s\[]+)/);
  if (trackingMatch) {
    result.tracking = trackingMatch[1];
  }

  // Check for ahead/behind
  const aheadMatch = branchLine.match(/ahead (\d+)/);
  if (aheadMatch) {
    result.ahead = parseInt(aheadMatch[1], 10);
  }

  const behindMatch = branchLine.match(/behind (\d+)/);
  if (behindMatch) {
    result.behind = parseInt(behindMatch[1], 10);
  }

  return result;
}

/**
 * Get repository status (branch, ahead/behind, staged/unstaged/untracked)
 * @param {string} repoPath - Full path to repository
 * @returns {Promise<object>} Status object
 */
async function getRepoStatus(repoPath) {
  try {
    // Use -b for branch info, --porcelain for stable output format
    const { stdout } = await execAsync('git status -b --porcelain', {
      cwd: repoPath,
      env: { ...process.env, GIT_TERMINAL_PROMPT: '0' }  // Disable git prompts
    });

    const branchInfo = parseBranchInfo(stdout);
    const changes = parseGitStatus(stdout);

    // Determine overall status
    let status = 'clean';
    if (changes.staged.length > 0 || changes.unstaged.length > 0 || changes.untracked.length > 0) {
      status = 'dirty';
    }

    return {
      branch: branchInfo.branch,
      tracking: branchInfo.tracking,
      ahead: branchInfo.ahead,
      behind: branchInfo.behind,
      status,
      changes: {
        staged: changes.staged.length,
        unstaged: changes.unstaged.length,
        untracked: changes.untracked.length
      },
      staged: changes.staged,
      unstaged: changes.unstaged,
      untracked: changes.untracked
    };
  } catch (err) {
    throw new Error(`Failed to get git status: ${err.message}`);
  }
}

/**
 * Get recent commits
 * @param {string} repoPath - Full path to repository
 * @param {number} limit - Number of commits (default 20)
 * @returns {Promise<object[]>} Array of commit objects
 */
async function getRepoLog(repoPath, limit = 20) {
  try {
    // Use a unique separator that won't appear in commit messages
    const SEP = '<<<TABZ_SEP>>>';
    const RECORD_SEP = '<<<TABZ_RECORD>>>';
    // Format: hash|shortHash|subject|body|authorName|authorEmail|authorDateISO|refNames
    const format = `%H${SEP}%h${SEP}%s${SEP}%b${SEP}%an${SEP}%ae${SEP}%aI${SEP}%D${RECORD_SEP}`;
    const { stdout } = await execAsync(
      `git log --format='${format}' -n ${parseInt(limit, 10)}`,
      {
        cwd: repoPath,
        env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
        maxBuffer: 1024 * 1024 // 1MB for large commit messages
      }
    );

    if (!stdout.trim()) {
      return [];
    }

    const commits = stdout.trim().split(RECORD_SEP).filter(r => r.trim()).map(record => {
      const parts = record.split(SEP);
      const [hash, shortHash, subject, body, author, email, date, refs] = parts;
      return {
        hash: hash?.trim(),
        shortHash: shortHash?.trim(),
        message: subject?.trim(),
        body: body?.trim() || null,
        author: author?.trim(),
        email: email?.trim(),
        date: date?.trim(),
        refs: refs ? refs.split(', ').filter(r => r.trim()) : []
      };
    });

    return commits;
  } catch (err) {
    // Handle repos with no commits yet
    if (err.message && err.message.includes('does not have any commits yet')) {
      return [];
    }
    throw new Error(`Failed to get git log: ${err.message}`);
  }
}

/**
 * Extract GitHub URL from git remote
 * Converts SSH and HTTPS URLs to web URLs
 * @param {string} repoPath - Full path to repository
 * @returns {Promise<string|null>} GitHub web URL or null
 */
async function getGitHubUrl(repoPath) {
  try {
    const { stdout } = await execAsync('git remote get-url origin', {
      cwd: repoPath,
      env: { ...process.env, GIT_TERMINAL_PROMPT: '0' }
    });

    const remoteUrl = stdout.trim();

    if (!remoteUrl) return null;

    // Convert SSH URL: git@github.com:user/repo.git -> https://github.com/user/repo
    if (remoteUrl.startsWith('git@github.com:')) {
      return remoteUrl
        .replace('git@github.com:', 'https://github.com/')
        .replace(/\.git$/, '');
    }

    // Convert HTTPS URL: https://github.com/user/repo.git -> https://github.com/user/repo
    if (remoteUrl.includes('github.com')) {
      return remoteUrl.replace(/\.git$/, '');
    }

    // Other remotes - return as-is if it looks like a URL
    if (remoteUrl.startsWith('http')) {
      return remoteUrl.replace(/\.git$/, '');
    }

    return null;
  } catch {
    // No remote or error - that's fine
    return null;
  }
}

/**
 * Get last activity date (most recent commit)
 * @param {string} repoPath - Full path to repository
 * @returns {Promise<string|null>} ISO date string or null
 */
async function getLastActivity(repoPath) {
  try {
    const { stdout } = await execAsync('git log -1 --format=%aI', {
      cwd: repoPath,
      env: { ...process.env, GIT_TERMINAL_PROMPT: '0' }
    });

    return stdout.trim() || null;
  } catch {
    return null;
  }
}

/**
 * Stage files
 * @param {string} repoPath - Full path to repository
 * @param {string[]} files - Files to stage (or ['.'] for all)
 */
async function stageFiles(repoPath, files = ['.']) {
  if (!Array.isArray(files) || files.length === 0) {
    files = ['.'];
  }

  // Validate files don't contain malicious paths
  for (const file of files) {
    if (file.includes('..')) {
      throw new Error('Invalid file path');
    }
  }

  const escapedFiles = files.map(f => escapeShellArg(f)).join(' ');

  try {
    await execAsync(`git add ${escapedFiles}`, {
      cwd: repoPath,
      env: { ...process.env, GIT_TERMINAL_PROMPT: '0' }
    });
  } catch (err) {
    throw new Error(`Failed to stage files: ${err.message}`);
  }
}

/**
 * Unstage files
 * @param {string} repoPath - Full path to repository
 * @param {string[]} files - Files to unstage
 */
async function unstageFiles(repoPath, files) {
  if (!Array.isArray(files) || files.length === 0) {
    throw new Error('No files specified to unstage');
  }

  // Validate files don't contain malicious paths
  for (const file of files) {
    if (file.includes('..')) {
      throw new Error('Invalid file path');
    }
  }

  const escapedFiles = files.map(f => escapeShellArg(f)).join(' ');

  try {
    await execAsync(`git restore --staged ${escapedFiles}`, {
      cwd: repoPath,
      env: { ...process.env, GIT_TERMINAL_PROMPT: '0' }
    });
  } catch (err) {
    throw new Error(`Failed to unstage files: ${err.message}`);
  }
}

/**
 * Create commit
 * @param {string} repoPath - Full path to repository
 * @param {string} message - Commit message
 */
async function createCommit(repoPath, message) {
  if (!message || typeof message !== 'string' || !message.trim()) {
    throw new Error('Commit message is required');
  }

  try {
    // Use stdin to pass message to avoid shell escaping issues
    const { spawn } = require('child_process');

    return new Promise((resolve, reject) => {
      const git = spawn('git', ['commit', '-m', message], {
        cwd: repoPath,
        env: { ...process.env, GIT_TERMINAL_PROMPT: '0' }
      });

      let stdout = '';
      let stderr = '';

      git.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      git.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      git.on('close', (code) => {
        if (code === 0) {
          resolve({ stdout, stderr });
        } else {
          reject(new Error(stderr || stdout || 'Commit failed'));
        }
      });

      git.on('error', (err) => {
        reject(new Error(`Failed to create commit: ${err.message}`));
      });
    });
  } catch (err) {
    throw new Error(`Failed to create commit: ${err.message}`);
  }
}

/**
 * Push to remote
 * @param {string} repoPath - Full path to repository
 * @param {string} remote - Remote name (default: origin)
 * @param {string} branch - Branch name (optional, uses current branch)
 */
async function pushToRemote(repoPath, remote = 'origin', branch = null) {
  try {
    const branchArg = branch ? escapeShellArg(branch) : '';
    const cmd = branch
      ? `git push ${escapeShellArg(remote)} ${branchArg}`
      : `git push ${escapeShellArg(remote)}`;

    const { stdout, stderr } = await execAsync(cmd, {
      cwd: repoPath,
      env: { ...process.env, GIT_TERMINAL_PROMPT: '0' }
    });

    return { stdout, stderr };
  } catch (err) {
    throw new Error(`Failed to push: ${err.message}`);
  }
}

/**
 * Pull from remote
 * @param {string} repoPath - Full path to repository
 * @param {string} remote - Remote name (default: origin)
 * @param {string} branch - Branch name (optional, uses current branch)
 */
async function pullFromRemote(repoPath, remote = 'origin', branch = null) {
  try {
    const branchArg = branch ? escapeShellArg(branch) : '';
    const cmd = branch
      ? `git pull ${escapeShellArg(remote)} ${branchArg}`
      : `git pull ${escapeShellArg(remote)}`;

    const { stdout, stderr } = await execAsync(cmd, {
      cwd: repoPath,
      env: { ...process.env, GIT_TERMINAL_PROMPT: '0' }
    });

    return { stdout, stderr };
  } catch (err) {
    throw new Error(`Failed to pull: ${err.message}`);
  }
}

/**
 * Fetch from remote
 * @param {string} repoPath - Full path to repository
 * @param {string} remote - Remote name (default: origin)
 */
async function fetchFromRemote(repoPath, remote = 'origin') {
  try {
    const { stdout, stderr } = await execAsync(
      `git fetch ${escapeShellArg(remote)}`,
      {
        cwd: repoPath,
        env: { ...process.env, GIT_TERMINAL_PROMPT: '0' }
      }
    );

    return { stdout, stderr };
  } catch (err) {
    throw new Error(`Failed to fetch: ${err.message}`);
  }
}

/**
 * Get the last commit info (for quick summary)
 * @param {string} repoPath - Full path to repository
 * @returns {Promise<object|null>} Last commit info or null
 */
async function getLastCommit(repoPath) {
  try {
    const commits = await getRepoLog(repoPath, 1);
    return commits[0] || null;
  } catch {
    return null;
  }
}

/**
 * Get worktrees for a repository
 * @param {string} repoPath - Full path to repository
 * @param {string|null} githubUrl - GitHub URL for branch links
 * @returns {Promise<object[]>} Array of worktree objects
 */
async function getWorktrees(repoPath, githubUrl = null) {
  try {
    const { stdout } = await execAsync('git worktree list --porcelain', {
      cwd: repoPath,
      env: { ...process.env, GIT_TERMINAL_PROMPT: '0' }
    });

    if (!stdout.trim()) {
      return [];
    }

    const worktrees = [];
    let current = {};

    for (const line of stdout.split('\n')) {
      if (line.startsWith('worktree ')) {
        if (current.path) {
          worktrees.push(current);
        }
        current = { path: line.substring(9) };
      } else if (line.startsWith('HEAD ')) {
        current.head = line.substring(5);
      } else if (line.startsWith('branch ')) {
        // Format: refs/heads/branch-name
        current.branch = line.substring(7).replace('refs/heads/', '');
        if (githubUrl) {
          current.githubUrl = `${githubUrl}/tree/${current.branch}`;
        }
      } else if (line === 'detached') {
        current.detached = true;
      } else if (line === 'bare') {
        current.bare = true;
      }
    }

    // Don't forget the last one
    if (current.path) {
      worktrees.push(current);
    }

    return worktrees;
  } catch (err) {
    // Worktrees not supported or error - return empty
    log.warn(`Error getting worktrees for ${repoPath}:`, err.message);
    return [];
  }
}

/**
 * Discard changes to files (revert to last commit)
 * @param {string} repoPath - Full path to repository
 * @param {string[]} files - Files to discard changes for
 */
async function discardFiles(repoPath, files) {
  if (!Array.isArray(files) || files.length === 0) {
    throw new Error('No files specified to discard');
  }

  // Validate files don't contain malicious paths
  for (const file of files) {
    if (file.includes('..')) {
      throw new Error('Invalid file path');
    }
  }

  const escapedFiles = files.map(f => escapeShellArg(f)).join(' ');

  try {
    await execAsync(`git restore ${escapedFiles}`, {
      cwd: repoPath,
      env: { ...process.env, GIT_TERMINAL_PROMPT: '0' }
    });
  } catch (err) {
    throw new Error(`Failed to discard changes: ${err.message}`);
  }
}

/**
 * Discard all unstaged changes
 * @param {string} repoPath - Full path to repository
 */
async function discardAllChanges(repoPath) {
  try {
    await execAsync('git restore .', {
      cwd: repoPath,
      env: { ...process.env, GIT_TERMINAL_PROMPT: '0' }
    });
  } catch (err) {
    throw new Error(`Failed to discard all changes: ${err.message}`);
  }
}

/**
 * Stash changes
 * @param {string} repoPath - Full path to repository
 * @param {string} message - Optional stash message
 * @param {boolean} includeUntracked - Include untracked files
 */
async function stashChanges(repoPath, message = '', includeUntracked = false) {
  try {
    let cmd = 'git stash push';
    if (includeUntracked) {
      cmd += ' --include-untracked';
    }
    if (message) {
      cmd += ` -m ${escapeShellArg(message)}`;
    }

    const { stdout, stderr } = await execAsync(cmd, {
      cwd: repoPath,
      env: { ...process.env, GIT_TERMINAL_PROMPT: '0' }
    });

    return { stdout, stderr };
  } catch (err) {
    throw new Error(`Failed to stash changes: ${err.message}`);
  }
}

/**
 * List stashes
 * @param {string} repoPath - Full path to repository
 * @returns {Promise<object[]>} Array of stash objects
 */
async function listStashes(repoPath) {
  try {
    const { stdout } = await execAsync('git stash list --format="%gd|%gs|%ci"', {
      cwd: repoPath,
      env: { ...process.env, GIT_TERMINAL_PROMPT: '0' }
    });

    if (!stdout.trim()) {
      return [];
    }

    return stdout.trim().split('\n').map(line => {
      const [ref, message, date] = line.split('|');
      return { ref, message, date };
    });
  } catch (err) {
    throw new Error(`Failed to list stashes: ${err.message}`);
  }
}

/**
 * Pop stash (apply and remove)
 * @param {string} repoPath - Full path to repository
 * @param {string} ref - Stash reference (e.g., "stash@{0}")
 */
async function popStash(repoPath, ref = 'stash@{0}') {
  try {
    const { stdout, stderr } = await execAsync(`git stash pop ${escapeShellArg(ref)}`, {
      cwd: repoPath,
      env: { ...process.env, GIT_TERMINAL_PROMPT: '0' }
    });

    return { stdout, stderr };
  } catch (err) {
    throw new Error(`Failed to pop stash: ${err.message}`);
  }
}

/**
 * Apply stash (without removing)
 * @param {string} repoPath - Full path to repository
 * @param {string} ref - Stash reference (e.g., "stash@{0}")
 */
async function applyStash(repoPath, ref = 'stash@{0}') {
  try {
    const { stdout, stderr } = await execAsync(`git stash apply ${escapeShellArg(ref)}`, {
      cwd: repoPath,
      env: { ...process.env, GIT_TERMINAL_PROMPT: '0' }
    });

    return { stdout, stderr };
  } catch (err) {
    throw new Error(`Failed to apply stash: ${err.message}`);
  }
}

/**
 * Drop stash
 * @param {string} repoPath - Full path to repository
 * @param {string} ref - Stash reference (e.g., "stash@{0}")
 */
async function dropStash(repoPath, ref = 'stash@{0}') {
  try {
    const { stdout, stderr } = await execAsync(`git stash drop ${escapeShellArg(ref)}`, {
      cwd: repoPath,
      env: { ...process.env, GIT_TERMINAL_PROMPT: '0' }
    });

    return { stdout, stderr };
  } catch (err) {
    throw new Error(`Failed to drop stash: ${err.message}`);
  }
}

/**
 * Get stash count
 * @param {string} repoPath - Full path to repository
 * @returns {Promise<number>} Number of stashes
 */
async function getStashCount(repoPath) {
  try {
    const stashes = await listStashes(repoPath);
    return stashes.length;
  } catch {
    return 0;
  }
}

/**
 * Get git log formatted for graph visualization
 * Includes parent hashes needed for drawing branch connections
 * @param {string} repoPath - Full path to repository
 * @param {number} limit - Maximum commits to return (default 50)
 * @param {number} skip - Number of commits to skip for pagination (default 0)
 * @returns {Promise<Object>} { commits, hasMore, repoRoot }
 */
async function getGraphLog(repoPath, limit = 50, skip = 0) {
  try {
    // Find the repo root first
    const { stdout: repoRoot } = await execAsync('git rev-parse --show-toplevel', {
      cwd: repoPath,
      env: { ...process.env, GIT_TERMINAL_PROMPT: '0' }
    });

    const SEP = '<<<TABZ_SEP>>>';
    const RECORD_SEP = '<<<TABZ_RECORD>>>';
    // Format: hash|shortHash|subject|authorName|authorEmail|authorDateISO|parentHashes|refNames
    const format = `%H${SEP}%h${SEP}%s${SEP}%an${SEP}%ae${SEP}%aI${SEP}%P${SEP}%D${RECORD_SEP}`;

    // Request one extra to detect if there are more
    const actualLimit = parseInt(limit, 10) + 1;
    const actualSkip = parseInt(skip, 10);

    const { stdout } = await execAsync(
      `git log --all --topo-order --format='${format}' -n ${actualLimit} --skip=${actualSkip}`,
      {
        cwd: repoPath,
        env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
        maxBuffer: 5 * 1024 * 1024 // 5MB for large repos
      }
    );

    if (!stdout.trim()) {
      return { commits: [], hasMore: false, repoRoot: repoRoot.trim() };
    }

    const records = stdout.trim().split(RECORD_SEP).filter(r => r.trim());
    const hasMore = records.length > limit;
    const commits = records.slice(0, limit).map(record => {
      const parts = record.split(SEP);
      const [hash, shortHash, subject, author, email, date, parents, refs] = parts;
      return {
        hash: hash?.trim(),
        shortHash: shortHash?.trim(),
        message: subject?.trim(),
        author: author?.trim(),
        email: email?.trim(),
        date: date?.trim(),
        parents: parents?.trim() ? parents.trim().split(' ') : [],
        refs: refs ? refs.split(', ').filter(r => r.trim()) : []
      };
    });

    return { commits, hasMore, repoRoot: repoRoot.trim() };
  } catch (err) {
    if (err.message && err.message.includes('does not have any commits yet')) {
      return { commits: [], hasMore: false, repoRoot: repoPath };
    }
    throw new Error(`Failed to get graph log: ${err.message}`);
  }
}

/**
 * Get diff between two commits or for a specific commit
 * @param {string} repoPath - Full path to repository
 * @param {string} base - Base commit hash (or empty for working tree)
 * @param {string} head - Head commit hash (optional, defaults to HEAD)
 * @param {string} file - Specific file to diff (optional)
 * @returns {Promise<string>} Diff output
 */
async function getCommitDiff(repoPath, base, head = null, file = null) {
  try {
    let cmd;
    if (!base && !head) {
      // Working tree diff
      cmd = 'git diff HEAD';
    } else if (base && !head) {
      // Single commit diff (show what that commit introduced)
      cmd = `git show ${escapeShellArg(base)} --format=''`;
    } else {
      // Diff between two commits
      cmd = `git diff ${escapeShellArg(base)}..${escapeShellArg(head)}`;
    }

    if (file) {
      cmd += ` -- ${escapeShellArg(file)}`;
    }

    const { stdout } = await execAsync(cmd, {
      cwd: repoPath,
      env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
      maxBuffer: 10 * 1024 * 1024 // 10MB for large diffs
    });

    return stdout;
  } catch (err) {
    throw new Error(`Failed to get diff: ${err.message}`);
  }
}

/**
 * Get details for a specific commit including files changed
 * @param {string} repoPath - Full path to repository
 * @param {string} hash - Commit hash
 * @returns {Promise<Object>} Commit details with files
 */
async function getCommitDetails(repoPath, hash) {
  try {
    const SEP = '<<<TABZ_SEP>>>';
    // Put %b (body) at the END since it can contain newlines
    const format = `%H${SEP}%h${SEP}%s${SEP}%an${SEP}%ae${SEP}%aI${SEP}%P${SEP}%D${SEP}%b`;

    const { stdout: commitInfo } = await execAsync(
      `git show ${escapeShellArg(hash)} --format='${format}' --name-status`,
      {
        cwd: repoPath,
        env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
        maxBuffer: 5 * 1024 * 1024
      }
    );

    // Find where file list starts (lines matching file status pattern)
    const lines = commitInfo.split('\n');
    let fileStartIndex = lines.findIndex(line => /^[AMDRT]\d*\t/.test(line));
    if (fileStartIndex === -1) fileStartIndex = lines.length;

    // Everything before file list is the formatted commit info
    const infoSection = lines.slice(0, fileStartIndex).join('\n');
    const parts = infoSection.split(SEP);
    const [fullHash, shortHash, subject, author, email, date, parents, refs, ...bodyParts] = parts;

    // Body is everything after the 8th separator (may contain newlines)
    const body = bodyParts.join(SEP).trim() || null;

    // Parse files
    const files = lines.slice(fileStartIndex).filter(l => l.trim()).map(line => {
      const match = line.match(/^([AMDRT])\t(.+)$/);
      if (match) {
        return { status: match[1], path: match[2] };
      }
      // Handle renames: R100\told\tnew
      const renameMatch = line.match(/^R\d+\t(.+)\t(.+)$/);
      if (renameMatch) {
        return { status: 'R', oldPath: renameMatch[1], path: renameMatch[2] };
      }
      return null;
    }).filter(Boolean);

    return {
      hash: fullHash?.trim(),
      shortHash: shortHash?.trim(),
      message: subject?.trim(),
      body,
      author: author?.trim(),
      email: email?.trim(),
      date: date?.trim(),
      parents: parents?.trim() ? parents.trim().split(' ') : [],
      refs: refs ? refs.split(', ').filter(r => r.trim()) : [],
      files
    };
  } catch (err) {
    throw new Error(`Failed to get commit details: ${err.message}`);
  }
}

/**
 * Get all branches (local and remote)
 * @param {string} repoPath - Full path to repository
 * @returns {Promise<Object>} { local: [], remote: [], current: string }
 */
async function getBranches(repoPath) {
  try {
    const { stdout } = await execAsync(
      'git branch -a --format="%(refname:short)|||%(objectname:short)|||%(upstream:short)|||%(HEAD)"',
      {
        cwd: repoPath,
        env: { ...process.env, GIT_TERMINAL_PROMPT: '0' }
      }
    );

    const local = [];
    const remote = [];
    let current = null;

    stdout.trim().split('\n').filter(l => l.trim()).forEach(line => {
      const [name, hash, upstream, head] = line.split('|||');
      const branch = {
        name: name.trim(),
        hash: hash.trim(),
        upstream: upstream?.trim() || null
      };

      if (head.trim() === '*') {
        current = name.trim();
      }

      if (name.startsWith('remotes/') || name.startsWith('origin/')) {
        remote.push({ ...branch, name: name.replace(/^remotes\//, '') });
      } else {
        local.push(branch);
      }
    });

    return { local, remote, current };
  } catch (err) {
    throw new Error(`Failed to get branches: ${err.message}`);
  }
}

module.exports = {
  discoverRepos,
  getRepoStatus,
  getRepoLog,
  getGraphLog,
  getCommitDiff,
  getCommitDetails,
  getBranches,
  getGitHubUrl,
  getLastActivity,
  getLastCommit,
  getWorktrees,
  parseGitStatus,
  parseBranchInfo,
  stageFiles,
  unstageFiles,
  createCommit,
  pushToRemote,
  pullFromRemote,
  fetchFromRemote,
  discardFiles,
  discardAllChanges,
  stashChanges,
  listStashes,
  popStash,
  applyStash,
  dropStash,
  getStashCount,
  isValidPath,
  escapeShellArg,
  DEFAULT_PROJECTS_DIR
};
