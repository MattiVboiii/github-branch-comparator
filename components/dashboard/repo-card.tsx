"use client";

import { useMemo } from "react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { CommitSortOrder, ScanResult } from "@/lib/dashboard/types";
import {
  formatCommitTimestamp,
  formatCommitTimestampTitle,
  formatRelativeTime,
  getCompareUrl,
  getLatestCommitTimestamp,
  sortCommits,
} from "@/lib/dashboard/utils";

export function RepoCard({
  result,
  commitSortOrder,
}: {
  result: ScanResult;
  commitSortOrder: CommitSortOrder;
}) {
  const [org, name] = result.repo.split("/");
  const latestCommitAt = getLatestCommitTimestamp(result);

  const sortedCommits = useMemo(
    () => sortCommits(result.commits, commitSortOrder),
    [result.commits, commitSortOrder],
  );

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
            {result.baseBranch}
          </code>
          <span className="ml-auto">{formatRelativeTime(latestCommitAt)}</span>
        </div>
      </CardHeader>
      <CardContent className="flex-1 p-0">
        <ScrollArea className="h-40 sm:h-44">
          <div className="pr-4 sm:pr-5">
            <Table className="table-fixed">
              <TableHeader>
                <TableRow>
                  <TableHead className="px-3 sm:px-4 py-2 text-xs w-25 border-r">
                    SHA
                  </TableHead>
                  <TableHead className="px-3 sm:px-4 py-2 text-xs whitespace-normal">
                    Message
                  </TableHead>
                  <TableHead className="px-3 sm:px-4 py-2 text-xs w-40 whitespace-nowrap text-right border-l border-border/70">
                    When
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedCommits.map((commit) => (
                  <TableRow key={commit.sha}>
                    <TableCell className="px-3 sm:px-4 py-2 border-r whitespace-nowrap">
                      <a
                        href={getCompareUrl(
                          result.repo,
                          result.baseBranch,
                          commit.fullSha,
                        )}
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
                        href={getCompareUrl(
                          result.repo,
                          result.baseBranch,
                          commit.fullSha,
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline underline-offset-2"
                      >
                        {commit.message}
                      </a>
                    </TableCell>
                    <TableCell
                      className="px-3 sm:px-4 py-2 text-xs text-muted-foreground whitespace-nowrap text-right border-l border-border/70"
                      title={formatCommitTimestampTitle(commit.committedAt)}
                    >
                      {formatCommitTimestamp(commit.committedAt)}
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
