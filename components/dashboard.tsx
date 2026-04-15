"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AlertCircle, GitBranch, GitMerge, RefreshCw } from "lucide-react";
import { useMemo, useState } from "react";

type ScanResult = {
  repo: string;
  defaultBranch: string;
  devBranch: string;
  aheadBy: number;
  commits: Array<{ sha: string; fullSha: string; message: string }>;
};

type ScanLimit = 50 | 100 | 200 | "all";

export function Dashboard() {
  const [results, setResults] = useState<ScanResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanned, setScanned] = useState(0);
  const [total, setTotal] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [branchFilter, setBranchFilter] = useState<string>("all");
  const [minAheadBy, setMinAheadBy] = useState(0);
  const [scanLimit, setScanLimit] = useState<ScanLimit>(100);
  const [branchesInput, setBranchesInput] = useState("dev, develop");

  const maxAheadBy = useMemo(
    () => Math.max(1, ...results.map((result) => result.aheadBy)),
    [results],
  );

  const filteredResults = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return results.filter((result) => {
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
  }, [results, searchQuery, branchFilter, minAheadBy]);

  function handleScan() {
    setError(null);
    setResults([]);
    setScanned(0);
    setTotal(0);
    setIsScanning(true);
    setBranchFilter("all");

    const params = new URLSearchParams();
    params.set("limit", scanLimit.toString());
    const branchesList = branchesInput
      .split(",")
      .map((b) => b.trim())
      .filter((b) => b.length > 0);
    if (branchesList.length > 0) {
      params.set("branches", branchesList.join(","));
    }
    const eventSource = new EventSource(`/api/scan?${params.toString()}`);

    eventSource.addEventListener("message", (event) => {
      try {
        const data = JSON.parse(event.data);

        switch (data.type) {
          case "start":
            setTotal(data.total);
            break;

          case "progress":
            setScanned(data.scanned);
            if (data.results.length > 0) {
              setResults((prev) => [...prev, ...data.results]);
            }
            break;

          case "complete":
            setResults(data.results);
            setIsScanning(false);
            eventSource.close();
            break;

          case "error":
            setError(data.error);
            setIsScanning(false);
            eventSource.close();
            break;
        }
      } catch (e) {
        console.error("Failed to parse event", e);
      }
    });

    eventSource.addEventListener("error", () => {
      setError("Connection lost during scan");
      setIsScanning(false);
      eventSource.close();
    });
  }

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
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_auto_auto] lg:items-end">
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
                {branchesInput
                  .split(",")
                  .map((b) => b.trim())
                  .filter((b) => b.length > 0)
                  .map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
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

            <Button
              variant="outline"
              onClick={() => {
                setSearchQuery("");
                setBranchFilter("all");
                setMinAheadBy(0);
              }}
              className="h-9"
            >
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
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
          {filteredResults.map((result) => (
            <RepoCard
              key={`${result.repo}-${result.devBranch}`}
              result={result}
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

function RepoCard({ result }: { result: ScanResult }) {
  const [org, name] = result.repo.split("/");

  function getCompareUrl(fullSha: string) {
    return `https://github.com/${result.repo}/compare/${encodeURIComponent(result.defaultBranch)}...${fullSha}`;
  }

  return (
    <Card className="flex h-full flex-col overflow-hidden min-w-0 w-full">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <CardTitle className="truncate text-sm sm:text-base leading-tight">
              {name}
            </CardTitle>
            <CardDescription className="truncate text-xs">
              {org}
            </CardDescription>
          </div>
          <Badge variant="secondary" className="shrink-0 tabular-nums text-xs">
            +{result.aheadBy}
          </Badge>
        </div>
        <div className="flex items-center gap-1.5 pt-1 text-xs text-muted-foreground flex-wrap">
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
            {result.devBranch}
          </code>
          <span>→</span>
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
            {result.defaultBranch}
          </code>
        </div>
      </CardHeader>
      <CardContent className="flex-1 p-0">
        <ScrollArea className="h-40 sm:h-44">
          <Table className="table-fixed">
            <TableHeader>
              <TableRow>
                <TableHead className="px-3 sm:px-4 py-2 text-xs w-25 border-r">
                  SHA
                </TableHead>
                <TableHead className="px-3 sm:px-4 py-2 text-xs whitespace-normal">
                  Message
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.commits.map((commit) => (
                <TableRow key={commit.sha}>
                  <TableCell className="px-3 sm:px-4 py-2 border-r whitespace-nowrap">
                    <a
                      href={getCompareUrl(commit.fullSha)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block"
                    >
                      <code className="font-mono text-xs text-muted-foreground underline-offset-2 hover:underline">
                        {commit.sha}
                      </code>
                    </a>
                  </TableCell>
                  <TableCell className="px-3 sm:px-4 py-2 text-xs leading-snug whitespace-normal wrap-break-word">
                    <a
                      href={getCompareUrl(commit.fullSha)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline underline-offset-2"
                    >
                      {commit.message}
                    </a>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

function ScanSkeletons() {
  return (
    <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-5 w-8 rounded-full" />
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {Array.from({ length: 4 }).map((_, j) => (
              <div key={j} className="flex gap-3">
                <Skeleton className="h-3 w-12 shrink-0" />
                <Skeleton className="h-3 flex-1" />
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
