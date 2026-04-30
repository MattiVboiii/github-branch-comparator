import {
  getDistributedValue,
  setDistributedValue,
} from "@/lib/distributed-state";

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

type CompareCachePayload = {
  aheadBy: number;
  commits: Array<{
    sha: string;
    fullSha: string;
    message: string;
    committedAt: string | null;
  }>;
};

type CompareCacheEntry = {
  etag: string | null;
  lastModified: string | null;
  payload: CompareCachePayload;
};

type ScanRepoOptions = {
  checkBranchExistsBeforeCompare?: boolean;
};

export type RepoFilterMode = "none" | "subset";

export type RepoFilter = {
  mode: RepoFilterMode;
  values: string[];
};

export class GitHubApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly isSkippableCompareError = false,
    public readonly retryAfterSeconds: number | null = null,
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

function parseRetryAfterSeconds(response: Response): number | null {
  const retryAfter = response.headers.get("retry-after");
  if (retryAfter) {
    const numeric = Number.parseInt(retryAfter, 10);
    if (Number.isFinite(numeric) && numeric > 0) return numeric;

    const retryDate = Date.parse(retryAfter);
    if (Number.isFinite(retryDate)) {
      return Math.max(1, Math.ceil((retryDate - Date.now()) / 1000));
    }
  }

  const resetHeader = response.headers.get("x-ratelimit-reset");
  if (!resetHeader) return null;

  const resetEpoch = Number.parseInt(resetHeader, 10);
  if (!Number.isFinite(resetEpoch)) return null;

  return Math.max(1, resetEpoch - Math.floor(Date.now() / 1000));
}

function toGitHubApiError(
  message: string,
  status: number,
  response?: Response,
): GitHubApiError {
  const normalized = message.toLowerCase();
  const retryAfterSeconds = response ? parseRetryAfterSeconds(response) : null;

  if (status === 401) {
    return new GitHubApiError(
      "GitHub authentication failed. Please sign in again.",
      status,
      false,
      retryAfterSeconds,
    );
  }

  if (status === 403 && normalized.includes("rate limit")) {
    return new GitHubApiError(
      "GitHub API rate limit reached. Please try again later.",
      status,
      false,
      retryAfterSeconds,
    );
  }

  if (status === 404 || status === 422) {
    return new GitHubApiError(message, status, true, retryAfterSeconds);
  }

  if (status >= 500) {
    return new GitHubApiError(
      "GitHub is currently unavailable. Please retry shortly.",
      status,
      false,
      retryAfterSeconds,
    );
  }

  return new GitHubApiError(message, status, false, retryAfterSeconds);
}

function buildCompareCacheKey(repoFullName: string, base: string, dev: string) {
  return `gh:compare:${repoFullName.toLowerCase()}:${base}:${dev}`;
}

async function fetchSingleRepo(
  headers: HeadersInit,
  fullName: string,
): Promise<GitHubRepo | null> {
  const res = await fetch(`https://api.github.com/repos/${fullName}`, {
    headers,
  });

  if (res.status === 404) return null;

  if (!res.ok) {
    const message = await parseGitHubErrorMessage(res);
    throw toGitHubApiError(message, res.status, res);
  }

  let payload: unknown;
  try {
    payload = await res.json();
  } catch {
    throw new Error(`GitHub returned invalid repository data for ${fullName}.`);
  }

  return normalizeRepo(payload);
}

async function fetchOrgRepos(
  headers: HeadersInit,
  orgName: string,
  maxRepos = Number.POSITIVE_INFINITY,
): Promise<GitHubRepo[]> {
  const all: GitHubRepo[] = [];
  let page = 1;

  while (true) {
    const res = await fetch(
      `https://api.github.com/orgs/${orgName}/repos?per_page=100&type=all&sort=updated&page=${page}`,
      { headers },
    );

    if (res.status === 404) {
      return [];
    }

    if (!res.ok) {
      const message = await parseGitHubErrorMessage(res);
      throw toGitHubApiError(message, res.status, res);
    }

    let payload: unknown;
    try {
      payload = await res.json();
    } catch {
      throw new Error(
        "GitHub returned invalid organization repository payload.",
      );
    }

    if (!Array.isArray(payload)) {
      throw new Error(
        "GitHub returned an unexpected organization repository response.",
      );
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
      throw toGitHubApiError(message, res.status, res);
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

export async function resolveReposForScan(
  headers: HeadersInit,
  maxRepos: number,
  repoFilter: RepoFilter,
): Promise<GitHubRepo[]> {
  if (repoFilter.mode === "none" || repoFilter.values.length === 0) {
    return fetchAllRepos(headers, maxRepos);
  }

  const lowered = repoFilter.values.map((value) => value.toLowerCase());
  const explicitFullNames = lowered.filter((value) => value.includes("/"));
  const bareValues = lowered.filter((value) => !value.includes("/"));

  if (explicitFullNames.length > 0 && bareValues.length === 0) {
    const repos = await Promise.all(
      explicitFullNames.map((fullName) => fetchSingleRepo(headers, fullName)),
    );
    return repos
      .filter((repo): repo is GitHubRepo => repo !== null)
      .slice(0, maxRepos);
  }

  if (bareValues.length === 1 && explicitFullNames.length === 0) {
    const orgRepos = await fetchOrgRepos(headers, bareValues[0], maxRepos);
    if (orgRepos.length > 0) {
      return orgRepos.slice(0, maxRepos);
    }
  }

  const userRepos = await fetchAllRepos(headers, Number.POSITIVE_INFINITY);
  const selected = userRepos.filter((repo) => {
    const full = repo.full_name.toLowerCase();
    const name = full.split("/")[1] ?? "";
    const owner = full.split("/")[0] ?? "";

    return lowered.some((token) => {
      if (token.includes("/")) {
        return full === token;
      }
      return name === token || owner === token;
    });
  });

  return selected.slice(0, maxRepos);
}

async function branchExists(
  headers: HeadersInit,
  repoFullName: string,
  branchName: string,
): Promise<boolean> {
  const res = await fetch(
    `https://api.github.com/repos/${repoFullName}/branches/${encodeURIComponent(branchName)}`,
    { headers },
  );

  if (res.status === 404) return false;

  if (!res.ok) {
    const message = await parseGitHubErrorMessage(res);
    throw toGitHubApiError(message, res.status, res);
  }

  return true;
}

export async function scanRepoPendingCommits(
  repo: GitHubRepo,
  headers: HeadersInit,
  devBranches: string[] = ["dev", "develop"],
  baseBranchesOverride: string[] = [],
  options: ScanRepoOptions = {},
): Promise<ScanResult[]> {
  const baseBranches =
    baseBranchesOverride.length > 0
      ? baseBranchesOverride
      : [repo.default_branch];
  const results: ScanResult[] = [];
  const shouldCheckBranch = options.checkBranchExistsBeforeCompare ?? true;

  for (const baseBranch of baseBranches) {
    for (const devBranch of devBranches) {
      if (baseBranch === devBranch) {
        continue;
      }

      try {
        if (shouldCheckBranch) {
          const exists = await branchExists(headers, repo.full_name, devBranch);
          if (!exists) {
            continue;
          }
        }

        const compareCacheKey = buildCompareCacheKey(
          repo.full_name,
          baseBranch,
          devBranch,
        );
        const cachedCompare =
          await getDistributedValue<CompareCacheEntry>(compareCacheKey);

        const compareHeaders = new Headers(headers);
        if (cachedCompare?.etag) {
          compareHeaders.set("If-None-Match", cachedCompare.etag);
        }
        if (cachedCompare?.lastModified) {
          compareHeaders.set("If-Modified-Since", cachedCompare.lastModified);
        }

        const compareRes = await fetch(
          `https://api.github.com/repos/${repo.full_name}/compare/${baseBranch}...${devBranch}`,
          { headers: compareHeaders },
        );

        if (compareRes.status === 304 && cachedCompare?.payload) {
          if (cachedCompare.payload.aheadBy > 0) {
            results.push({
              repo: repo.full_name,
              baseBranch,
              devBranch,
              aheadBy: cachedCompare.payload.aheadBy,
              commits: cachedCompare.payload.commits,
            });
          }
          continue;
        }

        if (!compareRes.ok) {
          const message = await parseGitHubErrorMessage(compareRes);
          const apiError = toGitHubApiError(
            message,
            compareRes.status,
            compareRes,
          );
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

        const etag = compareRes.headers.get("etag");
        const lastModified = compareRes.headers.get("last-modified");

        await setDistributedValue(
          compareCacheKey,
          {
            etag,
            lastModified,
            payload: {
              aheadBy,
              commits,
            },
          } satisfies CompareCacheEntry,
          10 * 60 * 1000,
        );

        if (aheadBy > 0) {
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
