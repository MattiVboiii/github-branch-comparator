import { describe, expect, it } from "vitest";

import type { ScanResult } from "@/lib/dashboard/types";
import {
  filterAndSortResults,
  getBranchCompareUrl,
  getCreatePrUrl,
  parseBranchesInput,
} from "@/lib/dashboard/utils";

const sampleResults: ScanResult[] = [
  {
    repo: "acme/alpha",
    baseBranch: "main",
    devBranch: "develop",
    aheadBy: 2,
    commits: [
      {
        sha: "abc1234",
        fullSha: "abc1234567890",
        message: "Fix auth",
        committedAt: "2024-01-10T12:00:00.000Z",
      },
    ],
  },
  {
    repo: "acme/beta",
    baseBranch: "main",
    devBranch: "dev",
    aheadBy: 5,
    commits: [
      {
        sha: "def5678",
        fullSha: "def5678901234",
        message: "Poker table layout",
        committedAt: "2024-06-01T08:00:00.000Z",
      },
    ],
  },
];

describe("parseBranchesInput", () => {
  it("parses comma-separated branches", () => {
    expect(parseBranchesInput("dev, develop , staging")).toEqual([
      "dev",
      "develop",
      "staging",
    ]);
  });
});

describe("filterAndSortResults", () => {
  it("filters by search query on repo or commit message", () => {
    const filtered = filterAndSortResults({
      results: sampleResults,
      searchQuery: "poker",
      branchFilter: "all",
      minAheadBy: 0,
      repoSortOrder: "latest-first",
    });

    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.repo).toBe("acme/beta");
  });

  it("filters by minimum ahead count", () => {
    const filtered = filterAndSortResults({
      results: sampleResults,
      searchQuery: "",
      branchFilter: "all",
      minAheadBy: 3,
      repoSortOrder: "latest-first",
    });

    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.repo).toBe("acme/beta");
  });
});

describe("GitHub URLs", () => {
  it("builds branch compare URL", () => {
    expect(getBranchCompareUrl("acme/repo", "main", "develop")).toBe(
      "https://github.com/acme/repo/compare/main...develop",
    );
  });

  it("builds create PR URL", () => {
    expect(getCreatePrUrl("acme/repo", "main", "develop")).toBe(
      "https://github.com/acme/repo/compare/main...develop?expand=1",
    );
  });
});
