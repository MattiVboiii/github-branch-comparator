"use client";

import { ExportToolbar } from "@/components/dashboard/export-toolbar";
import { RepoCard } from "@/components/dashboard/repo-card";
import { ScanSkeletons } from "@/components/dashboard/scan-skeletons";
import { ScanSummaryBanner } from "@/components/dashboard/scan-summary-banner";
import { useDashboardScan } from "@/components/dashboard/use-dashboard-scan";
import { LiveRegion } from "@/components/live-region";
import { RateLimitMessage } from "@/components/rate-limit-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import type { CommitSortOrder, RepoSortOrder } from "@/lib/dashboard/types";
import { AlertCircle, GitBranch, GitMerge, RefreshCw, X } from "lucide-react";

const selectClassName =
  "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-50";

export function Dashboard() {
  const {
    results,
    error,
    retryAfterSeconds,
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
    reposInput,
    setReposInput,
    baseBranchInput,
    setBaseBranchInput,
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
    cancelScan,
    clearFilters,
    scanSummary,
    cacheNotice,
    liveMessage,
  } = useDashboardScan();

  const showRateLimit =
    error !== null &&
    (retryAfterSeconds !== null || error.toLowerCase().includes("rate limit"));

  return (
    <div className="space-y-6">
      <LiveRegion message={liveMessage} />

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
            Pending Merges
          </h2>
          <p className="text-sm text-muted-foreground">
            Repos where the selected branch(es) are ahead of the base branch.
            Archived and fork repos are excluded.
          </p>
        </div>
        <div className="flex w-full sm:w-auto flex-col sm:flex-row items-stretch sm:items-end gap-2">
          <div className="space-y-1 min-w-0 flex-1 sm:min-w-40">
            <Label htmlFor="repos-input">Repos/org filter</Label>
            <Input
              id="repos-input"
              value={reposInput}
              onChange={(event) => setReposInput(event.target.value)}
              placeholder="e.g. org/repo-a or org-name"
              disabled={isScanning}
            />
          </div>
          <div className="space-y-1 min-w-0 flex-1 sm:min-w-32">
            <Label htmlFor="base-branch-input">Base branch(es)</Label>
            <Input
              id="base-branch-input"
              value={baseBranchInput}
              onChange={(event) => setBaseBranchInput(event.target.value)}
              placeholder="e.g. main, master"
              disabled={isScanning}
            />
          </div>
          <div className="space-y-1 min-w-0 flex-1 sm:min-w-36">
            <Label htmlFor="branches-input">Compare branch(es)</Label>
            <Input
              id="branches-input"
              value={branchesInput}
              onChange={(event) => setBranchesInput(event.target.value)}
              placeholder="e.g. dev, develop"
              disabled={isScanning}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="scan-limit">Scan limit</Label>
            <select
              id="scan-limit"
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
              className={selectClassName}
            >
              <option value={50}>50 repos</option>
              <option value={100}>100 repos</option>
              <option value={200}>200 repos</option>
              <option value="all">All repos</option>
            </select>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleScan}
              disabled={isScanning}
              className="w-full sm:w-auto motion-reduce:transition-none"
            >
              <RefreshCw
                className={`mr-2 h-4 w-4 motion-reduce:animate-none ${isScanning ? "animate-spin" : ""}`}
                aria-hidden
              />
              {isScanning ? "Scanning…" : "Scan Repos"}
            </Button>
            {isScanning && (
              <Button
                type="button"
                variant="outline"
                onClick={cancelScan}
                className="w-full sm:w-auto"
              >
                <X className="mr-2 h-4 w-4" aria-hidden />
                Cancel
              </Button>
            )}
          </div>
        </div>
      </div>

      <Separator />

      {scanSummary && !isScanning && (
        <ScanSummaryBanner summary={scanSummary} cacheNotice={cacheNotice} />
      )}

      {!isScanning && results.length > 0 && (
        <div className="rounded-lg border bg-card p-3 sm:p-4 space-y-3">
          <ExportToolbar
            results={filteredResults}
            commitSortOrder={commitSortOrder}
          />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 lg:items-end">
            <div className="space-y-1">
              <Label htmlFor="filter-search">
                Search repo or commit message
              </Label>
              <Input
                id="filter-search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="e.g. auth, org/repo"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="filter-branch">Branch</Label>
              <select
                id="filter-branch"
                value={branchFilter}
                onChange={(event) => setBranchFilter(event.target.value)}
                className={selectClassName}
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
              <Label htmlFor="filter-repo-sort">Repo order</Label>
              <select
                id="filter-repo-sort"
                value={repoSortOrder}
                onChange={(event) =>
                  setRepoSortOrder(event.target.value as RepoSortOrder)
                }
                className={selectClassName}
              >
                <option value="latest-first">Latest commit first</option>
                <option value="oldest-first">Oldest commit first</option>
              </select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="filter-commit-sort">Commit order</Label>
              <select
                id="filter-commit-sort"
                value={commitSortOrder}
                onChange={(event) =>
                  setCommitSortOrder(event.target.value as CommitSortOrder)
                }
                className={selectClassName}
              >
                <option value="newest-first">Newest first</option>
                <option value="oldest-first">Oldest first</option>
              </select>
            </div>

            <div className="space-y-1 sm:col-span-2 lg:col-span-1">
              <div className="flex items-center justify-between">
                <Label htmlFor="filter-ahead">Min ahead by</Label>
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
                aria-valuemin={0}
                aria-valuemax={maxAheadBy}
                aria-valuenow={minAheadBy}
              />
            </div>

            <Button variant="outline" onClick={clearFilters} className="h-9">
              Clear filters
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Showing {filteredResults.length} of {results.length} repo(s)
          </p>
        </div>
      )}

      {error &&
        (showRateLimit ? (
          <RateLimitMessage
            message={error}
            retryAfterSeconds={retryAfterSeconds}
          />
        ) : (
          <div
            className="flex items-center gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-4 text-destructive text-sm"
            role="alert"
          >
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden />
            <p>{error}</p>
          </div>
        ))}

      {isScanning && (
        <div className="space-y-4">
          <div className="space-y-3">
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Scanning repositories…</span>
                <span className="font-medium tabular-nums">
                  {scanned} / {total}
                </span>
              </div>
              <Progress value={total > 0 ? (scanned / total) * 100 : 0} />
            </div>
            {results.length > 0 && (
              <div className="text-sm text-muted-foreground">
                Found <span className="font-medium">{results.length}</span>{" "}
                repo(s) with pending commits so far
              </div>
            )}
          </div>
          {results.length > 0 && (
            <div className="grid gap-4 grid-cols-1 min-[900px]:grid-cols-2 2xl:grid-cols-3">
              {filteredResults.map((result) => (
                <RepoCard
                  key={`${result.repo}-${result.baseBranch}-${result.devBranch}`}
                  result={result}
                  commitSortOrder={commitSortOrder}
                />
              ))}
            </div>
          )}
          {results.length === 0 && <ScanSkeletons />}
        </div>
      )}

      {!isScanning && results.length === 0 && total > 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12 sm:py-16 text-center">
          <GitMerge
            className="mb-4 h-8 w-8 sm:h-10 sm:w-10 text-muted-foreground"
            aria-hidden
          />
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
              key={`${result.repo}-${result.baseBranch}-${result.devBranch}`}
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

      {!isScanning && total === 0 && !scanSummary && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12 sm:py-16 text-center">
          <GitBranch
            className="mb-4 h-8 w-8 sm:h-10 sm:w-10 text-muted-foreground"
            aria-hidden
          />
          <p className="text-base sm:text-lg font-medium">Ready to scan</p>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Click <span className="font-medium">Scan Repos</span> to check for
            pending commits. Scan settings are saved in your browser and
            reflected in the page URL for sharing.
          </p>
        </div>
      )}
    </div>
  );
}
