type GitHubCommit = {
  sha: string;
  commit: { message: string };
};

export type GitHubRepo = {
  full_name: string;
  default_branch: string;
};

export type ScanResult = {
  repo: string;
  defaultBranch: string;
  devBranch: "dev" | "develop";
  aheadBy: number;
  commits: Array<{ sha: string; message: string }>;
};

export async function fetchAllRepos(
  headers: HeadersInit,
): Promise<GitHubRepo[]> {
  const all: GitHubRepo[] = [];
  let page = 1;

  while (true) {
    const res = await fetch(
      `https://api.github.com/user/repos?per_page=100&visibility=all&page=${page}`,
      { headers },
    );
    if (!res.ok) throw new Error(`Failed to fetch repos: ${res.status}`);
    const batch: GitHubRepo[] = await res.json();
    if (batch.length === 0) break;
    all.push(...batch);
    if (batch.length < 100) break;
    page++;
  }

  return all;
}

export async function scanRepoPendingCommits(
  repo: GitHubRepo,
  headers: HeadersInit,
): Promise<ScanResult | null> {
  const defaultBranch = repo.default_branch;

  for (const devBranch of ["dev", "develop"] as const) {
    try {
      const compareRes = await fetch(
        `https://api.github.com/repos/${repo.full_name}/compare/${defaultBranch}...${devBranch}`,
        { headers },
      );

      if (!compareRes.ok) continue;

      const data = await compareRes.json();

      if (data.ahead_by > 0) {
        return {
          repo: repo.full_name,
          defaultBranch,
          devBranch,
          aheadBy: data.ahead_by as number,
          commits: (data.commits as GitHubCommit[]).map((c) => ({
            sha: c.sha.slice(0, 7),
            message: c.commit.message.split("\n")[0],
          })),
        };
      }
    } catch {
      // branch not found or compare unavailable; skip silently
    }
  }

  return null;
}

export async function scanPendingCommitsWithHeaders(
  headers: HeadersInit,
): Promise<ScanResult[]> {
  const repos = await fetchAllRepos(headers);
  const results: ScanResult[] = [];

  for (const repo of repos) {
    const result = await scanRepoPendingCommits(repo, headers);
    if (result) results.push(result);
  }

  return results;
}
