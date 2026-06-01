import type { CommitSortOrder, ScanResult } from "@/lib/dashboard/types";
import { sortCommits } from "@/lib/dashboard/utils";

export function resultsToCsv(
  results: ScanResult[],
  commitSortOrder: CommitSortOrder,
): string {
  const header =
    "repo,base_branch,compare_branch,ahead_by,commit_sha,commit_message,committed_at";
  const rows: string[] = [header];

  for (const result of results) {
    const commits = sortCommits(result.commits, commitSortOrder);
    if (commits.length === 0) {
      rows.push(
        csvRow([
          result.repo,
          result.baseBranch,
          result.devBranch,
          String(result.aheadBy),
          "",
          "",
          "",
        ]),
      );
      continue;
    }

    for (const commit of commits) {
      rows.push(
        csvRow([
          result.repo,
          result.baseBranch,
          result.devBranch,
          String(result.aheadBy),
          commit.sha,
          commit.message,
          commit.committedAt ?? "",
        ]),
      );
    }
  }

  return rows.join("\n");
}

function csvRow(values: string[]): string {
  return values.map(csvEscape).join(",");
}

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function resultsToJson(results: ScanResult[]): string {
  return JSON.stringify(results, null, 2);
}

export function formatRepoCommitsMarkdown(
  result: ScanResult,
  commitSortOrder: CommitSortOrder,
): string {
  const commits = sortCommits(result.commits, commitSortOrder);
  const lines = [
    `### ${result.repo} (\`${result.devBranch}\` → \`${result.baseBranch}\`, +${result.aheadBy})`,
    "",
  ];

  for (const commit of commits) {
    lines.push(`- \`${commit.sha}\` ${commit.message}`);
  }

  return lines.join("\n");
}

export function formatAllResultsMarkdown(
  results: ScanResult[],
  commitSortOrder: CommitSortOrder,
): string {
  if (results.length === 0) {
    return "No repos with pending commits.";
  }

  return results
    .map((result) => formatRepoCommitsMarkdown(result, commitSortOrder))
    .join("\n\n");
}

export async function copyTextToClipboard(text: string): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.clipboard) {
    return false;
  }

  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function downloadTextFile(
  filename: string,
  content: string,
  mimeType: string,
): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
