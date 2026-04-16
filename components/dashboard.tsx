"use client";

import { RepoCard } from "@/components/dashboard/repo-card";
import { ScanSkeletons } from "@/components/dashboard/scan-skeletons";
import { useDashboardScan } from "@/components/dashboard/use-dashboard-scan";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import type { CommitSortOrder, RepoSortOrder } from "@/lib/dashboard/types";
import { AlertCircle, GitBranch, GitMerge, RefreshCw } from "lucide-react";

export function Dashboard() {
  const {
    results,
    error,
    isScanning,
    scanned,
    total,
    searchQuery,
    setSearchQuery,
    branchFilter,
    setBranchFilter,
    minAheadBy,
    setMinAheadBy,
    scanLimit,
    setScanLimit,
    branchesInput,
    setBranchesInput,
    repoSortOrder,
    setRepoSortOrder,
    commitSortOrder,
    setCommitSortOrder,
    maxAheadBy,
    branchOptions,
    filteredResults,
    handleScan,
    clearFilters,
  } = useDashboardScan();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
            Pending Merges
          </h2>
          <p className="text-sm text-muted-foreground">
            Repos where the specified dev branch(es) are ahead of the default
            branch
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Scans most recently updated repos first for faster results.
          </p>
        </div>
        <div className="flex w-full sm:w-auto flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="space-y-1">
            <label
              htmlFor="branches-input"
              className="text-xs text-muted-foreground"
            >
              Dev branch(es) to compare
            </label>
            <input
              id="branches-input"
              value={branchesInput}
              onChange={(event) => setBranchesInput(event.target.value)}
              placeholder="e.g. dev, develop, staging"
              disabled={isScanning}
              className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none transition focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 disabled:opacity-50"
            />
          </div>
          <select
            aria-label="Scan limit"
            value={scanLimit}
            onChange={(event) =>
              setScanLimit(
                event.target.value === "all"
                  ? "all"
                  : (Number(event.target.value) as 50 | 100 | 200),
              )
            }
            disabled={isScanning}
            className="h-10 rounded-md border bg-background px-3 text-sm outline-none transition focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
          >
            <option value={50}>50 repos</option>
            <option value={100}>100 repos</option>
            <option value={200}>200 repos</option>
            <option value="all">All repos</option>
          </select>
          <Button
            onClick={handleScan}
            disabled={isScanning}
            className="w-full sm:w-auto"
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${isScanning ? "animate-spin" : ""}`}
            />
            {isScanning ? "Scanning…" : "Scan Repos"}
          </Button>
        </div>
      </div>

      <Separator />

      {!isScanning && results.length > 0 && (
        <div className="rounded-lg border bg-card p-3 sm:p-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 lg:items-end">
            <div className="space-y-1">
              <label
                htmlFor="filter-search"
                className="text-xs text-muted-foreground"
              >
                Search repo or commit message
              </label>
              <input
                id="filter-search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="e.g. auth, poker, org/repo"
                className="h-9 w-full rounded-md border bg-background px-3 text-sm outline-none transition focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
              />
            </div>

            <div className="space-y-1">
              <label
                htmlFor="filter-branch"
                className="text-xs text-muted-foreground"
              >
                Branch
              </label>
              <select
                id="filter-branch"
                value={branchFilter}
                onChange={(event) => setBranchFilter(event.target.value)}
                className="h-9 w-full rounded-md border bg-background px-3 text-sm outline-none transition focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
              >
                <option value="all">All</option>
                {branchOptions.map((branch) => (
                  <option key={branch} value={branch}>
                    {branch}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label
                htmlFor="filter-repo-sort"
                className="text-xs text-muted-foreground"
              >
                Repo order
              </label>
              <select
                id="filter-repo-sort"
                value={repoSortOrder}
                onChange={(event) =>
                  setRepoSortOrder(event.target.value as RepoSortOrder)
                }
                className="h-9 w-full rounded-md border bg-background px-3 text-sm outline-none transition focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
              >
                <option value="latest-first">Latest commit first</option>
                <option value="oldest-first">Oldest commit first</option>
              </select>
            </div>

            <div className="space-y-1">
              <label
                htmlFor="filter-commit-sort"
                className="text-xs text-muted-foreground"
              >
                Commit order
              </label>
              <select
                id="filter-commit-sort"
                value={commitSortOrder}
                onChange={(event) =>
                  setCommitSortOrder(event.target.value as CommitSortOrder)
                }
                className="h-9 w-full rounded-md border bg-background px-3 text-sm outline-none transition focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
              >
                <option value="newest-first">Newest first</option>
                <option value="oldest-first">Oldest first</option>
              </select>
            </div>

            <div className="space-y-1 sm:col-span-2 lg:col-span-1">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="filter-ahead"
                  className="text-xs text-muted-foreground"
                >
                  Min ahead by
                </label>
                <span className="text-xs font-medium tabular-nums">
                  {minAheadBy === 0 ? "Any" : `${minAheadBy}+`}
                </span>
              </div>
              <input
                id="filter-ahead"
                type="range"
                min={0}
                max={maxAheadBy}
                step={1}
                value={minAheadBy}
                onChange={(event) => setMinAheadBy(Number(event.target.value))}
                className="h-9 w-full accent-primary"
              />
            </div>

            <Button variant="outline" onClick={clearFilters} className="h-9">
              Clear filters
            </Button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Showing {filteredResults.length} of {results.length} repo(s)
          </p>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-4 text-destructive text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {isScanning && (
        <div className="space-y-4">
          <div className="space-y-3">
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Scanning repositories...</span>
                <span className="font-medium">
                  {scanned} / {total}
                </span>
              </div>
              <Progress value={total > 0 ? (scanned / total) * 100 : 0} />
            </div>
            {results.length > 0 && (
              <div className="text-sm text-muted-foreground">
                Found <span className="font-medium">{results.length}</span>{" "}
                repo(s) with pending commits
              </div>
            )}
          </div>
          <ScanSkeletons />
        </div>
      )}

      {!isScanning && results.length === 0 && total > 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12 sm:py-16 text-center">
          <GitMerge className="mb-4 h-8 w-8 sm:h-10 sm:w-10 text-muted-foreground" />
          <p className="text-base sm:text-lg font-medium">All caught up!</p>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            No repos have unmerged commits on the specified branch(es).
          </p>
        </div>
      )}

      {!isScanning && filteredResults.length > 0 && (
        <div className="grid gap-4 grid-cols-1 min-[900px]:grid-cols-2 2xl:grid-cols-3">
          {filteredResults.map((result) => (
            <RepoCard
              key={`${result.repo}-${result.devBranch}`}
              result={result}
              commitSortOrder={commitSortOrder}
            />
          ))}
        </div>
      )}

      {!isScanning && results.length > 0 && filteredResults.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-10 text-center">
          <p className="text-sm font-medium">
            No results match the active filters
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Try broadening your search or clearing filters.
          </p>
        </div>
      )}

      {!isScanning && total === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12 sm:py-16 text-center">
          <GitBranch className="mb-4 h-8 w-8 sm:h-10 sm:w-10 text-muted-foreground" />
          <p className="text-base sm:text-lg font-medium">Ready to scan</p>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Click <span className="font-medium">Scan Repos</span> to check for
            pending commits.
          </p>
        </div>
      )}
    </div>
  );
}
