"use server";

import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";

type GitHubCommit = {
  sha: string;
  commit: { message: string };
};

type GitHubRepo = {
  full_name: string;
  default_branch: string;
};

async function fetchAllRepos(headers: HeadersInit): Promise<GitHubRepo[]> {
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

export async function scanPendingCommits() {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) throw new Error("Not authenticated");

  const headers = {
    Authorization: `token ${session.accessToken}`,
    Accept: "application/vnd.github+json",
  };

  const repos = await fetchAllRepos(headers);
  const results = [];

  for (const repo of repos) {
    const defaultBranch = repo.default_branch;

    for (const devBranch of ["dev", "develop"]) {
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
              message: c.commit.message.split("\n")[0],
            })),
          });
          break;
        }
      } catch {
        // branch not found, skip silently
      }
    }
  }

  return results;
}
