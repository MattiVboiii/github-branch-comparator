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

export type ScanLimit = 50 | 100 | 200 | "all";
export type RepoSortOrder = "latest-first" | "oldest-first";
export type CommitSortOrder = "newest-first" | "oldest-first";

export type BranchFilter = "all" | string;
