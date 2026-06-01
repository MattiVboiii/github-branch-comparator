import type { ScanResult } from "@/lib/dashboard/types";

export type ScanStartEvent = {
  type: "start";
  total: number;
};

export type ScanProgressEvent = {
  type: "progress";
  scanned: number;
  total: number;
  results: ScanResult[];
};

export type ScanCompleteEvent = {
  type: "complete";
  results: ScanResult[];
  fromCache?: boolean;
};

export type ScanCachedEvent = {
  type: "cached";
  expiresInSeconds: number;
};

export type ScanErrorEvent = {
  type: "error";
  error: string;
  retryAfterSeconds?: number;
};

export type ScanServerEvent =
  | ScanStartEvent
  | ScanProgressEvent
  | ScanCompleteEvent
  | ScanCachedEvent
  | ScanErrorEvent;

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object";
}

function isCommit(value: unknown): value is ScanResult["commits"][number] {
  if (!isObject(value)) return false;

  return (
    typeof value.sha === "string" &&
    typeof value.fullSha === "string" &&
    typeof value.message === "string" &&
    (typeof value.committedAt === "string" || value.committedAt === null)
  );
}

function isScanResult(value: unknown): value is ScanResult {
  if (!isObject(value)) return false;

  return (
    typeof value.repo === "string" &&
    typeof value.baseBranch === "string" &&
    typeof value.devBranch === "string" &&
    typeof value.aheadBy === "number" &&
    Array.isArray(value.commits) &&
    value.commits.every((commit) => isCommit(commit))
  );
}

export function parseScanServerEvent(raw: unknown): ScanServerEvent | null {
  if (!isObject(raw) || typeof raw.type !== "string") return null;

  switch (raw.type) {
    case "start":
      if (typeof raw.total !== "number") return null;
      return { type: "start", total: raw.total };
    case "progress":
      if (
        typeof raw.scanned !== "number" ||
        typeof raw.total !== "number" ||
        !Array.isArray(raw.results) ||
        !raw.results.every((item) => isScanResult(item))
      ) {
        return null;
      }
      return {
        type: "progress",
        scanned: raw.scanned,
        total: raw.total,
        results: raw.results,
      };
    case "complete":
      if (
        !Array.isArray(raw.results) ||
        !raw.results.every((r) => isScanResult(r))
      ) {
        return null;
      }
      return {
        type: "complete",
        results: raw.results,
        fromCache: raw.fromCache === true,
      };
    case "cached":
      if (typeof raw.expiresInSeconds !== "number") return null;
      return { type: "cached", expiresInSeconds: raw.expiresInSeconds };
    case "error":
      if (typeof raw.error !== "string") return null;
      return {
        type: "error",
        error: raw.error,
        retryAfterSeconds:
          typeof raw.retryAfterSeconds === "number"
            ? raw.retryAfterSeconds
            : undefined,
      };
    default:
      return null;
  }
}
