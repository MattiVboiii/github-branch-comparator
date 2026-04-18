export type GitHubRepo = {
  full_name: string;
  default_branch: string;
};

export type ScanResult = {
  repo: string;
  baseBranch: string;
  devBranch: string;
  aheadBy: number;
  commits: Array<{
    sha: string;
    fullSha: string;
    message: string;
    committedAt: string | null;
  }>;
};

type GitHubErrorBody = {
  message?: string;
};

type GitHubCompareResponse = {
  ahead_by?: unknown;
  commits?: unknown;
};

export class GitHubApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly isSkippableCompareError = false,
  ) {
    super(message);
    this.name = "GitHubApiError";
  }
}

function toMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error";
}

function normalizeRepo(raw: unknown): GitHubRepo | null {
  if (!raw || typeof raw !== "object") return null;

  const fullName = (raw as { full_name?: unknown }).full_name;
  const defaultBranch = (raw as { default_branch?: unknown }).default_branch;

  if (typeof fullName !== "string" || fullName.length === 0) return null;
  if (typeof defaultBranch !== "string" || defaultBranch.length === 0) {
    return null;
  }

  return {
    full_name: fullName,
    default_branch: defaultBranch,
  };
}

function normalizeCommit(raw: unknown) {
  if (!raw || typeof raw !== "object") return null;

  const commitRaw = raw as {
    sha?: unknown;
    commit?: {
      message?: unknown;
      author?: { date?: unknown };
      committer?: { date?: unknown };
    };
  };

  if (typeof commitRaw.sha !== "string" || commitRaw.sha.length === 0) {
    return null;
  }

  const firstLine =
    typeof commitRaw.commit?.message === "string"
      ? commitRaw.commit.message.split("\n")[0]
      : "(no commit message)";

  const authorDate = commitRaw.commit?.author?.date;
  const committerDate = commitRaw.commit?.committer?.date;

  return {
    sha: commitRaw.sha.slice(0, 7),
    fullSha: commitRaw.sha,
    message: firstLine,
    committedAt:
      typeof authorDate === "string"
        ? authorDate
        : typeof committerDate === "string"
          ? committerDate
          : null,
  };
}

async function parseGitHubErrorMessage(response: Response): Promise<string> {
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.toLowerCase().includes("application/json")) {
    try {
      const parsed = (await response.json()) as GitHubErrorBody;
      if (typeof parsed.message === "string" && parsed.message.length > 0) {
        return parsed.message;
      }
    } catch {
      // Fall back to generic status message when GitHub returns invalid JSON.
    }
  }

  return response.statusText || `GitHub request failed with ${response.status}`;
}

function toGitHubApiError(message: string, status: number): GitHubApiError {
  const normalized = message.toLowerCase();

  if (status === 401) {
    return new GitHubApiError(
      "GitHub authentication failed. Please sign in again.",
      status,
    );
  }

  if (status === 403 && normalized.includes("rate limit")) {
    return new GitHubApiError(
      "GitHub API rate limit reached. Please try again later.",
      status,
    );
  }

  if (status === 404 || status === 422) {
    return new GitHubApiError(message, status, true);
  }

  if (status >= 500) {
    return new GitHubApiError(
      "GitHub is currently unavailable. Please retry shortly.",
      status,
    );
  }

  return new GitHubApiError(message, status);
}

export async function fetchAllRepos(
  headers: HeadersInit,
  maxRepos = Number.POSITIVE_INFINITY,
): Promise<GitHubRepo[]> {
  const all: GitHubRepo[] = [];
  let page = 1;

  while (true) {
    const res = await fetch(
      `https://api.github.com/user/repos?per_page=100&visibility=all&sort=updated&direction=desc&page=${page}`,
      { headers },
    );
    if (!res.ok) {
      const message = await parseGitHubErrorMessage(res);
      throw toGitHubApiError(message, res.status);
    }

    let payload: unknown;
    try {
      payload = await res.json();
    } catch {
      throw new Error("GitHub returned invalid repository response payload.");
    }

    if (!Array.isArray(payload)) {
      throw new Error("GitHub returned an unexpected repository response.");
    }

    const batch = payload
      .map((repo) => normalizeRepo(repo))
      .filter((repo): repo is GitHubRepo => repo !== null);

    if (batch.length === 0) break;
    all.push(...batch);
    if (all.length >= maxRepos) {
      return all.slice(0, maxRepos);
    }
    if (batch.length < 100) break;
    page++;
  }

  return all;
}

export async function scanRepoPendingCommits(
  repo: GitHubRepo,
  headers: HeadersInit,
  devBranches: string[] = ["dev", "develop"],
  baseBranchesOverride: string[] = [],
): Promise<ScanResult[]> {
  const baseBranches =
    baseBranchesOverride.length > 0
      ? baseBranchesOverride
      : [repo.default_branch];
  const results: ScanResult[] = [];

  for (const baseBranch of baseBranches) {
    for (const devBranch of devBranches) {
      if (baseBranch === devBranch) {
        continue;
      }

      try {
        const compareRes = await fetch(
          `https://api.github.com/repos/${repo.full_name}/compare/${baseBranch}...${devBranch}`,
          { headers },
        );

        if (!compareRes.ok) {
          const message = await parseGitHubErrorMessage(compareRes);
          const apiError = toGitHubApiError(message, compareRes.status);
          if (apiError.isSkippableCompareError) {
            continue;
          }
          throw apiError;
        }

        let payload: unknown;
        try {
          payload = await compareRes.json();
        } catch {
          throw new Error(
            `GitHub returned invalid compare data for ${repo.full_name} (${baseBranch}...${devBranch}).`,
          );
        }

        const data = payload as GitHubCompareResponse;

        const aheadBy =
          typeof data.ahead_by === "number" && Number.isFinite(data.ahead_by)
            ? data.ahead_by
            : 0;

        if (aheadBy > 0) {
          const commitsSource = Array.isArray(data.commits) ? data.commits : [];
          const commits = commitsSource
            .map((commit) => normalizeCommit(commit))
            .filter(
              (
                commit,
              ): commit is {
                sha: string;
                fullSha: string;
                message: string;
                committedAt: string | null;
              } => commit !== null,
            );

          results.push({
            repo: repo.full_name,
            baseBranch,
            devBranch,
            aheadBy,
            commits,
          });
        }
      } catch (error) {
        if (error instanceof GitHubApiError && error.isSkippableCompareError) {
          continue;
        }

        throw new Error(
          `Failed to compare ${repo.full_name} (${baseBranch}...${devBranch}): ${toMessage(error)}`,
        );
      }
    }
  }

  return results;
}

export async function scanPendingCommitsWithHeaders(
  headers: HeadersInit,
  devBranches: string[] = ["dev", "develop"],
  baseBranchesOverride: string[] = [],
): Promise<ScanResult[]> {
  const repos = await fetchAllRepos(headers);
  const results: ScanResult[] = [];

  for (const repo of repos) {
    const repoResults = await scanRepoPendingCommits(
      repo,
      headers,
      devBranches,
      baseBranchesOverride,
    );
    if (repoResults.length > 0) results.push(...repoResults);
  }

  return results;
}
