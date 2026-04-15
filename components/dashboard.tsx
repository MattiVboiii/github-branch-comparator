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
import { useState } from "react";

type ScanResult = {
  repo: string;
  defaultBranch: string;
  devBranch: string;
  aheadBy: number;
  commits: Array<{ sha: string; message: string }>;
};

export function Dashboard() {
  const [results, setResults] = useState<ScanResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanned, setScanned] = useState(0);
  const [total, setTotal] = useState(0);

  function handleScan() {
    setError(null);
    setResults([]);
    setScanned(0);
    setTotal(0);
    setIsScanning(true);

    const eventSource = new EventSource("/api/scan");

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
            Repos where <code className="font-mono text-xs">dev</code> /{" "}
            <code className="font-mono text-xs">develop</code> is ahead of the
            default branch
          </p>
        </div>
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

      <Separator />

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
            No repos have unmerged commits on dev/develop.
          </p>
        </div>
      )}

      {!isScanning && results.length > 0 && (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {results.map((result) => (
            <RepoCard
              key={`${result.repo}-${result.devBranch}`}
              result={result}
            />
          ))}
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

  return (
    <Card className="flex flex-col overflow-hidden">
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
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="px-3 sm:px-4 py-2 text-xs w-12">
                    SHA
                  </TableHead>
                  <TableHead className="px-3 sm:px-4 py-2 text-xs">
                    Message
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.commits.map((commit) => (
                  <TableRow key={commit.sha}>
                    <TableCell className="px-3 sm:px-4 py-2 font-mono text-xs text-muted-foreground whitespace-nowrap">
                      {commit.sha}
                    </TableCell>
                    <TableCell className="px-3 sm:px-4 py-2 text-xs leading-snug">
                      <span className="line-clamp-2">{commit.message}</span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
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
