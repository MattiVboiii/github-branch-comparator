import type {
  CommitSortOrder,
  RepoSortOrder,
  ScanResult,
} from "@/lib/dashboard/types";

export function toCommitTimestamp(iso: string | null): number | null {
  if (!iso) return null;
  const value = Date.parse(iso);
  return Number.isNaN(value) ? null : value;
}

export function getLatestCommitTimestamp(result: ScanResult): number | null {
  return result.commits.reduce<number | null>((latest, commit) => {
    const timestamp = toCommitTimestamp(commit.committedAt);
    if (timestamp === null) return latest;
    if (latest === null || timestamp > latest) return timestamp;
    return latest;
  }, null);
}

export function parseBranchesInput(input: string): string[] {
  return input
    .split(",")
    .map((branch) => branch.trim())
    .filter((branch) => branch.length > 0);
}

export function filterAndSortResults({
  results,
  searchQuery,
  branchFilter,
  minAheadBy,
  repoSortOrder,
}: {
  results: ScanResult[];
  searchQuery: string;
  branchFilter: string;
  minAheadBy: number;
  repoSortOrder: RepoSortOrder;
}): ScanResult[] {
  const query = searchQuery.trim().toLowerCase();

  const filtered = results.filter((result) => {
    if (branchFilter !== "all" && result.devBranch !== branchFilter) {
      return false;
    }

    if (result.aheadBy < minAheadBy) {
      return false;
    }

    if (!query) {
      return true;
    }

    const matchesRepo = result.repo.toLowerCase().includes(query);
    const matchesCommit = result.commits.some((commit) =>
      commit.message.toLowerCase().includes(query),
    );

    return matchesRepo || matchesCommit;
  });

  filtered.sort((a, b) => {
    const aLatest = getLatestCommitTimestamp(a);
    const bLatest = getLatestCommitTimestamp(b);

    if (aLatest === null && bLatest === null) {
      return a.repo.localeCompare(b.repo);
    }

    if (aLatest === null) return 1;
    if (bLatest === null) return -1;

    if (repoSortOrder === "latest-first") {
      return bLatest - aLatest;
    }

    return aLatest - bLatest;
  });

  return filtered;
}

export function sortCommits(
  commits: ScanResult["commits"],
  commitSortOrder: CommitSortOrder,
): ScanResult["commits"] {
  const next = [...commits];

  next.sort((a, b) => {
    const aTimestamp = toCommitTimestamp(a.committedAt);
    const bTimestamp = toCommitTimestamp(b.committedAt);

    if (aTimestamp === null && bTimestamp === null) return 0;
    if (aTimestamp === null) return 1;
    if (bTimestamp === null) return -1;

    if (commitSortOrder === "newest-first") {
      return bTimestamp - aTimestamp;
    }

    return aTimestamp - bTimestamp;
  });

  return next;
}

export function getCompareUrl(
  repo: string,
  baseBranch: string,
  fullSha: string,
): string {
  return `https://github.com/${repo}/compare/${encodeURIComponent(baseBranch)}...${fullSha}`;
}

export function formatCommitTimestamp(iso: string | null): string {
  if (!iso) return "--";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "--";

  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatCommitTimestampTitle(iso: string | null): string {
  if (!iso) return "Unknown commit timestamp";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Unknown commit timestamp";

  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatRelativeTime(timestamp: number | null): string {
  if (timestamp === null) return "Latest: unknown";
  const diffMs = timestamp - Date.now();
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (Math.abs(diffMs) < hour) {
    return `Latest: ${rtf.format(Math.round(diffMs / minute), "minute")}`;
  }

  if (Math.abs(diffMs) < day) {
    return `Latest: ${rtf.format(Math.round(diffMs / hour), "hour")}`;
  }

  return `Latest: ${rtf.format(Math.round(diffMs / day), "day")}`;
}
