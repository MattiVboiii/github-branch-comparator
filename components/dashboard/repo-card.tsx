"use client";

import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
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
import {
  copyTextToClipboard,
  formatRepoCommitsMarkdown,
} from "@/lib/dashboard/export";
import type { CommitSortOrder, ScanResult } from "@/lib/dashboard/types";
import {
  formatCommitTimestamp,
  formatCommitTimestampTitle,
  formatRelativeTime,
  getBranchCompareUrl,
  getCompareUrl,
  getCreatePrUrl,
  getLatestCommitTimestamp,
  getRepoUrl,
  sortCommits,
} from "@/lib/dashboard/utils";
import { cn } from "@/lib/utils";
import { ExternalLink, GitPullRequest } from "lucide-react";

export function RepoCard({
  result,
  commitSortOrder,
}: {
  result: ScanResult;
  commitSortOrder: CommitSortOrder;
}) {
  const [org, name] = result.repo.split("/");
  const latestCommitAt = getLatestCommitTimestamp(result);
  const [copyState, setCopyState] = useState<"idle" | "done" | "error">("idle");

  const sortedCommits = useMemo(
    () => sortCommits(result.commits, commitSortOrder),
    [result.commits, commitSortOrder],
  );

  const compareUrl = getBranchCompareUrl(
    result.repo,
    result.baseBranch,
    result.devBranch,
  );
  const createPrUrl = getCreatePrUrl(
    result.repo,
    result.baseBranch,
    result.devBranch,
  );

  async function handleCopyCommits() {
    const text = formatRepoCommitsMarkdown(result, commitSortOrder);
    const ok = await copyTextToClipboard(text);
    setCopyState(ok ? "done" : "error");
    window.setTimeout(() => setCopyState("idle"), 2000);
  }

  return (
    <Card className="flex h-full flex-col overflow-hidden min-w-0 w-full">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <CardTitle className="text-sm sm:text-base leading-tight">
              <a
                href={getRepoUrl(result.repo)}
                target="_blank"
                rel="noopener noreferrer"
                className="truncate hover:underline underline-offset-2"
              >
                {name}
              </a>
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
          <span aria-hidden>→</span>
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
            {result.baseBranch}
          </code>
          <span className="ml-auto">{formatRelativeTime(latestCommitAt)}</span>
        </div>
        <div className="flex flex-wrap gap-1.5 pt-2">
          <a
            href={compareUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(buttonVariants({ variant: "outline", size: "xs" }))}
          >
            <ExternalLink className="h-3 w-3" aria-hidden />
            Compare
          </a>
          {result.aheadBy > 0 && (
            <a
              href={createPrUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(buttonVariants({ variant: "outline", size: "xs" }))}
            >
              <GitPullRequest className="h-3 w-3" aria-hidden />
              Create PR
            </a>
          )}
          <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={handleCopyCommits}
          >
            {copyState === "done"
              ? "Copied"
              : copyState === "error"
                ? "Copy failed"
                : "Copy commits"}
          </Button>
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
