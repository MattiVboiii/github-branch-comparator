"use client";

import { Button } from "@/components/ui/button";
import {
  copyTextToClipboard,
  downloadTextFile,
  formatAllResultsMarkdown,
  resultsToCsv,
  resultsToJson,
} from "@/lib/dashboard/export";
import type { CommitSortOrder, ScanResult } from "@/lib/dashboard/types";
import { Download, FileJson } from "lucide-react";
import { useState } from "react";

type ExportToolbarProps = {
  results: ScanResult[];
  commitSortOrder: CommitSortOrder;
};

export function ExportToolbar({
  results,
  commitSortOrder,
}: ExportToolbarProps) {
  const [copyState, setCopyState] = useState<"idle" | "done" | "error">("idle");

  if (results.length === 0) return null;

  const stamp = new Date().toISOString().slice(0, 10);

  async function handleCopyMarkdown() {
    const text = formatAllResultsMarkdown(results, commitSortOrder);
    const ok = await copyTextToClipboard(text);
    setCopyState(ok ? "done" : "error");
    window.setTimeout(() => setCopyState("idle"), 2000);
  }

  function handleExportCsv() {
    downloadTextFile(
      `branch-comparator-${stamp}.csv`,
      resultsToCsv(results, commitSortOrder),
      "text/csv;charset=utf-8",
    );
  }

  function handleExportJson() {
    downloadTextFile(
      `branch-comparator-${stamp}.json`,
      resultsToJson(results),
      "application/json;charset=utf-8",
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleCopyMarkdown}
      >
        {copyState === "done"
          ? "Copied"
          : copyState === "error"
            ? "Copy failed"
            : "Copy as Markdown"}
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleExportCsv}
      >
        <Download className="mr-1.5 h-3.5 w-3.5" aria-hidden />
        Export CSV
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleExportJson}
      >
        <FileJson className="mr-1.5 h-3.5 w-3.5" aria-hidden />
        Export JSON
      </Button>
    </div>
  );
}
