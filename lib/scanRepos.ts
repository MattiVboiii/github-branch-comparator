type GitHubCommit = {
  sha: string;
  commit: {
    message: string;
    author?: { date?: string };
    committer?: { date?: string };
  };
};

export type GitHubRepo = {
  full_name: string;
  default_branch: string;
};

export type ScanResult = {
  repo: string;
  defaultBranch: string;
  devBranch: string;
  aheadBy: number;
  commits: Array<{
    sha: string;
    fullSha: string;
    message: string;
    committedAt: string | null;
  }>;
};

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
    if (!res.ok) throw new Error(`Failed to fetch repos: ${res.status}`);
    const batch: GitHubRepo[] = await res.json();
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
): Promise<ScanResult[]> {
  const defaultBranch = repo.default_branch;
  const results: ScanResult[] = [];

  for (const devBranch of devBranches) {
    try {
      const compareRes = await fetch(
        `https://api.github.com/repos/${repo.full_name}/compare/${defaultBranch}...${devBranch}`,
        { headers },
      );

      if (!compareRes.ok) continue;

      const data = await compareRes.json();

      if (data.ahead_by > 0) {
        results.push({
          repo: repo.full_name,
          defaultBranch,
          devBranch,
          aheadBy: data.ahead_by as number,
          commits: (data.commits as GitHubCommit[]).map((c) => ({
            sha: c.sha.slice(0, 7),
            fullSha: c.sha,
            message: c.commit.message.split("\n")[0],
            committedAt:
              c.commit.author?.date ?? c.commit.committer?.date ?? null,
          })),
        });
      }
    } catch {
      // branch not found or compare unavailable; skip silently
    }
  }

  return results;
}

export async function scanPendingCommitsWithHeaders(
  headers: HeadersInit,
  devBranches: string[] = ["dev", "develop"],
): Promise<ScanResult[]> {
  const repos = await fetchAllRepos(headers);
  const results: ScanResult[] = [];

  for (const repo of repos) {
    const repoResults = await scanRepoPendingCommits(
      repo,
      headers,
      devBranches,
    );
    if (repoResults.length > 0) results.push(...repoResults);
  }

  return results;
}
